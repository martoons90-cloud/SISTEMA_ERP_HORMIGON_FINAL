import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Button,
  Grid, TextField, Autocomplete, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { Eye, PlusCircle, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import VerDetalleDevolucionModal from './VerDetalleDevolucionModal';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Helper para formatear fecha a YYYY-MM-DD para los inputs
const toInputDate = (date) => {
    return date.toISOString().split('T')[0];
};

const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

const Devoluciones = () => {
  const [devoluciones, setDevoluciones] = useState([]);
  const [devolucionesOriginales, setDevolucionesOriginales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Estados para filtros
  const [proveedores, setProveedores] = useState([]);
  const [filtroProveedor, setFiltroProveedor] = useState(null);
  const [filtroOrdenCompra, setFiltroOrdenCompra] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState(null);
  const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDevolucionId, setSelectedDevolucionId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: devolucionesData, error: devolucionesError } = await supabase
        .from('v_devoluciones_listado_detallado')
        .select('*');
      if (devolucionesError) throw devolucionesError;

      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from('com_proveedores')
        .select('id, razon_social')
        .eq('activo', true);
      if (proveedoresError) throw proveedoresError;

      setDevoluciones(devolucionesData);
      setDevolucionesOriginales(devolucionesData);
      setProveedores(proveedoresData);
    } catch (error) {
      enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateFilter = (event, newFilter) => {
    setActiveDateFilter(newFilter);
    const today = new Date();
    let desde = '';
    let hasta = '';

    switch (newFilter) {
      case 'hoy':
        desde = toInputDate(today);
        hasta = toInputDate(today);
        break;
      case 'estaSemana': {
        const startOfWeek = getStartOfWeek(today);
        desde = toInputDate(startOfWeek);
        hasta = toInputDate(new Date(startOfWeek.setDate(startOfWeek.getDate() + 6)));
        break;
      }
      case 'esteMes': {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        desde = toInputDate(firstDayOfMonth);
        hasta = toInputDate(lastDayOfMonth);
        break;
      }
      case 'esteAnio': {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
        desde = toInputDate(firstDayOfYear);
        hasta = toInputDate(lastDayOfYear);
        break;
      }
      default:
        break;
    }
    setDateRange({ desde, hasta });
  };

  const handleClearFilters = () => {
    setFiltroProveedor(null);
    setFiltroOrdenCompra('');
    setActiveDateFilter(null);
    setDateRange({ desde: '', hasta: '' });
  };

  // Aplicar filtros
  useEffect(() => {
    let itemsFiltrados = [...devolucionesOriginales];
    itemsFiltrados = itemsFiltrados.filter(item => {
        if (filtroProveedor && item.proveedor_id !== filtroProveedor.id) return false;
        if (filtroOrdenCompra && !String(item.orden_compra_id).includes(filtroOrdenCompra)) return false;
        if (dateRange.desde && item.fecha_devolucion < dateRange.desde) return false;
        if (dateRange.hasta && item.fecha_devolucion > dateRange.hasta) return false;
        return true;
    });
    setDevoluciones(itemsFiltrados);
  }, [devolucionesOriginales, filtroProveedor, filtroOrdenCompra, dateRange]);

  const handleViewDetails = (id) => {
    setSelectedDevolucionId(id);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedDevolucionId(null);
    setViewModalOpen(false);
  };

  const handleNewDevolucion = () => {
    navigate('/compras/devoluciones/nueva');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Devoluciones a Proveedores
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusCircle />}
          onClick={handleNewDevolucion}
        >
          Nueva Devolución
        </Button>
      </Box>

      {/* --- SECCIÓN DE FILTROS --- */}
      <Box component={Paper} variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={proveedores}
              getOptionLabel={(option) => option.razon_social}
              value={filtroProveedor}
              onChange={(_, newValue) => setFiltroProveedor(newValue)}
              renderInput={(params) => <TextField {...params} label="Filtrar por Proveedor" />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Filtrar por OC"
              value={filtroOrdenCompra}
              onChange={(e) => setFiltroOrdenCompra(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <ToggleButtonGroup
              value={activeDateFilter}
              exclusive
              onChange={handleDateFilter}
              size="small"
              fullWidth
            >
              <ToggleButton value="hoy">Hoy</ToggleButton>
              <ToggleButton value="estaSemana">Esta Semana</ToggleButton>
              <ToggleButton value="esteMes">Este Mes</ToggleButton>
              <ToggleButton value="esteAnio">Este Año</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sx={{ textAlign: 'right', pt: 1 }}>
            <Button
              variant="text"
              onClick={handleClearFilters}
              startIcon={<XIcon />}
              size="small"
            >
              Limpiar Filtros
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Dev.</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>OC Asociada</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Cant. Pedida</TableCell>
              <TableCell align="right">Cant. Devuelta</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress /></TableCell></TableRow>
            ) : devoluciones.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center">No hay devoluciones registradas.</TableCell></TableRow>
            ) : (
              devoluciones.map((item) => (
                <TableRow key={item.detalle_id}>
                  <TableCell>{String(item.devolucion_id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(item.fecha_devolucion)}</TableCell>
                  <TableCell>OC-{String(item.orden_compra_id).padStart(6, '0')}</TableCell>
                  <TableCell>{item.proveedor_razon_social}</TableCell>
                  <TableCell>{item.articulo_name}</TableCell>
                  <TableCell align="right">{item.cantidad_pedida || 'N/A'}</TableCell>
                  <TableCell align="right">{item.cantidad_devuelta}</TableCell>
                  <TableCell>{item.motivo}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle de Devolución">
                      <IconButton size="small" onClick={() => handleViewDetails(item.devolucion_id)}><Eye /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {viewModalOpen && (
        <VerDetalleDevolucionModal
          devolucionId={selectedDevolucionId}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
    </Paper>
  );
};

export default Devoluciones;
