import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Dialog,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  TextField,
  InputAdornment,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { ArrowSquareIn, ArrowSquareOut, Swap, Wrench, MagnifyingGlass, X } from 'phosphor-react';
import FormularioIngresoManual from './FormularioIngresoManual';
import FormularioEgresoManual from './FormularioEgresoManual';
import FormularioTransferencia from './FormularioTransferencia';
import FormularioAjusteInventario from './FormularioAjusteInventario';

// Definir las etiquetas fuera del componente para que no se recree en cada render
const movementLabels = {
  compra: 'Ingreso por Compra',
  venta: 'Egreso por Venta',
  ajuste_positivo: 'Ajuste Positivo',
  ajuste_negativo: 'Ajuste Negativo',
  transferencia_salida: 'Transferencia (Salida)',
  transferencia_entrada: 'Transferencia (Entrada)',
  produccion_entrada: 'Ingreso por Producción',
  produccion_salida: 'Egreso por Producción',
};

const getMovementLabel = (tipo) => {
  return movementLabels[tipo] || tipo.replace(/_/g, ' ');
};

const Movimientos = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isEgresoModalOpen, setIsEgresoModalOpen] = useState(false);
  const [isTransferenciaModalOpen, setIsTransferenciaModalOpen] = useState(false);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  
  // Estados para los filtros
  const [periodo, setPeriodo] = useState('hoy');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('todos');

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_movimientos_flat')
        .select('*');
      
      if (error) throw error;
      setMovimientos(data);
    } catch (err) {
      setError('No se pudieron cargar los movimientos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovimientos(); // Carga inicial

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('movimientos-realtime-update')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stk_movimientos_stock' },
        () => {
          fetchMovimientos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMovimientos]);

  const handleModalSuccess = () => {
    setIsIngresoModalOpen(false);
    setIsEgresoModalOpen(false);
    setIsTransferenciaModalOpen(false);
    setIsAjusteModalOpen(false);
    fetchMovimientos(); // Recarga la lista de movimientos
  };
  
  const handleClearFilters = () => {
    setPeriodo('hoy');
    setSearchTerm('');
    setTipoMovimiento('todos');
  };

  const getChipColor = (tipo) => {
    if (tipo.includes('entrada') || tipo.includes('positivo') || tipo === 'compra') {
      return 'success';
    }
    if (tipo.includes('salida') || tipo.includes('negativo') || tipo === 'venta') {
      return 'error';
    }
    if (tipo.includes('transferencia')) {
      return 'warning';
    }
    return 'default';
  };

  const filteredMovimientos = useMemo(() => {
    let filtered = [...movimientos];

    // Filtro por tipo de movimiento
    if (tipoMovimiento !== 'todos') {
      filtered = filtered.filter(mov => mov.tipo_movimiento === tipoMovimiento);
    }

    // Filtro por período
    if (periodo !== 'todos') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      let startDate;

      switch (periodo) {
        case 'hoy':
          startDate = todayStart;
          break;
        case 'ayer': {
          const yesterday = new Date(todayStart);
          yesterday.setDate(todayStart.getDate() - 1);
          filtered = filtered.filter(mov => {
            // Corrección para comparar solo la fecha, ignorando la hora/zona horaria
            const movDate = new Date(mov.fecha.substring(0, 10) + 'T00:00:00');
            return movDate.getTime() === yesterday.getTime();
          });
          startDate = null; // Para evitar el filtro posterior
          break;
        }
        case 'semana':
          startDate = new Date(todayStart);
          startDate.setDate(todayStart.getDate() - todayStart.getDay() + (todayStart.getDay() === 0 ? -6 : 1)); // Lunes como inicio de semana
          break;
        case 'mes':
          startDate = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        // Corrección para comparar solo la fecha, ignorando la hora/zona horaria
        filtered = filtered.filter(mov => {
          const movDate = new Date(mov.fecha.substring(0, 10) + 'T00:00:00');
          return movDate >= startDate;
        });
      }
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(mov =>
        (mov.referencia || '').toLowerCase().includes(term) ||
        (mov.articulo_name || '').toLowerCase().includes(term) ||
        (mov.articulo_code || '').toLowerCase().includes(term) ||
        (mov.deposito_nombre || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [movimientos, tipoMovimiento, periodo, searchTerm]);

  return (
    <>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
          Historial de Movimientos
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Aquí se visualizan todos los movimientos de stock, tanto automáticos (compras, ventas) como manuales.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ width: 220 }}>
            <InputLabel id="tipo-label">Tipo de Movimiento</InputLabel>
            <Select
              labelId="tipo-label"
              value={tipoMovimiento}
              label="Tipo de Movimiento"
              onChange={(e) => setTipoMovimiento(e.target.value)}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {Object.entries(movementLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel id="periodo-label">Período</InputLabel>
            <Select
              labelId="periodo-label"
              value={periodo}
              label="Período"
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <MenuItem value="hoy">Hoy</MenuItem>
              <MenuItem value="ayer">Ayer</MenuItem>
              <MenuItem value="semana">Esta Semana</MenuItem>
              <MenuItem value="mes">Este Mes</MenuItem>
              <MenuItem value="todos">Todos</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Buscar..."
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlass size={20} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          
          <Button
            variant="text"
            size="small"
            onClick={handleClearFilters}
            startIcon={<X />}
          >
            Limpiar
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button variant="contained" startIcon={<ArrowSquareIn />} onClick={() => setIsIngresoModalOpen(true)}>
            Ingreso Manual
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<ArrowSquareOut />} onClick={() => setIsEgresoModalOpen(true)}>
            Egreso Manual
          </Button>
          <Button variant="outlined" color="info" startIcon={<Swap />} onClick={() => setIsTransferenciaModalOpen(true)}>
            Transferencia
          </Button>
          <Button variant="outlined" color="warning" startIcon={<Wrench />} onClick={() => setIsAjusteModalOpen(true)}>
            Ajuste de Inventario
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Movimientos">
              <TableHead>
                <TableRow>
                  <TableCell>N° Mov.</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Depósito</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Código Artículo</TableCell>
                  <TableCell>Artículo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovimientos.map((mov) => (
                  <TableRow key={mov.detalle_id}>
                    <TableCell>{mov.movimiento_id}</TableCell>
                    <TableCell>{new Date(mov.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getMovementLabel(mov.tipo_movimiento)} 
                        color={getChipColor(mov.tipo_movimiento)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{mov.deposito_nombre}</TableCell>
                    <TableCell>{mov.referencia}</TableCell>
                    <TableCell>{mov.articulo_code}</TableCell>
                    <TableCell>{mov.articulo_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: mov.cantidad > 0 ? 'success.main' : 'error.main' }}>
                      {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                    </TableCell>
                    <TableCell>{mov.articulo_unidad_medida || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Modales para las acciones manuales */}
      <Dialog open={isIngresoModalOpen} onClose={() => setIsIngresoModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Ingreso Manual de Stock</DialogTitle>
        <DialogContent><FormularioIngresoManual onSuccess={handleModalSuccess} onCancel={() => setIsIngresoModalOpen(false)}/></DialogContent>
      </Dialog>

      <Dialog open={isEgresoModalOpen} onClose={() => setIsEgresoModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Egreso Manual de Stock</DialogTitle>
        <DialogContent><FormularioEgresoManual onSuccess={handleModalSuccess} onCancel={() => setIsEgresoModalOpen(false)}/></DialogContent>
      </Dialog>

      <Dialog open={isTransferenciaModalOpen} onClose={() => setIsTransferenciaModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Transferencia entre Depósitos</DialogTitle>
        <DialogContent><FormularioTransferencia onSuccess={handleModalSuccess} onCancel={() => setIsTransferenciaModalOpen(false)}/></DialogContent>
      </Dialog>

      <Dialog open={isAjusteModalOpen} onClose={() => setIsAjusteModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Ajuste de Inventario</DialogTitle>
        <DialogContent><FormularioAjusteInventario onSuccess={handleModalSuccess} onCancel={() => setIsAjusteModalOpen(false)}/></DialogContent>
      </Dialog>
    </>
  );
};

export default Movimientos;
