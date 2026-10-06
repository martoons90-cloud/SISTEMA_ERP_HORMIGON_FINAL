import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Chip, Grid, TextField, Autocomplete,
} from '@mui/material';
import { PlusCircle, PencilSimple, Eye, Funnel, X, Package } from 'phosphor-react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import VerDetalleOrdenModal from './VerDetalleOrdenModal';
import DateRangePickerModal from './DateRangePickerModal';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  // Ajuste para asegurar que la fecha se muestre correctamente sin importar la zona horaria
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Helper para formatear moneda
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

const getStatusChipColor = (status) => {
  switch (status) {
    case 'INGRESADO': return 'primary';
    case 'APROBADO': return 'success';
    case 'RECHAZADO': return 'error';
    case 'CUMPLIDO': return 'success'; // <-- CAMBIO
    case 'RECIBIDO PARCIAL': return 'default';
    default: return 'default';
  }
};

const OrdenesCompra = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState(null);
  const [isAuthorizer, setIsAuthorizer] = useState(false);

  // Estados para los filtros
  const DATE_FILTER_OPTIONS = ['Hoy', 'Ayer', 'Este Mes', 'Este Año', 'Personalizado'];
  const [ordenesOriginales, setOrdenesOriginales] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [filtroDeposito, setFiltroDeposito] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [filtroFechas, setFiltroFechas] = useState({ desde: '', hasta: '' });
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('v_ordenes_compra_listado')
        .select('*');
      if (ordenesError) throw ordenesError;

      const { data: depositosData, error: depositosError } = await supabase
        .from('stk_depositos')
        .select('id, nombre');
      if (depositosError) throw depositosError;

      setOrdenesOriginales(ordenesData);
      setOrdenes(ordenesData);
      setDepositos(depositosData);
      const estadosUnicos = [...new Set(ordenesData.map(o => o.estado))];
      setEstados(estadosUnicos);
      setIsAuthorizer(true); // Asumimos que somos autorizadores para poder probar todo
    } catch (error) {
      enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Carga inicial de datos
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper para formatear fecha a YYYY-MM-DD para los inputs
  const toInputDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Handler para el desplegable de filtro de fecha
  const handleDateFilterChange = (newValue) => {
    setSelectedDateFilter(newValue);
    const today = new Date();
    let desde = '';
    let hasta = '';

    if (newValue === 'Personalizado') {
      setDatePickerOpen(true);
      return; // Esperamos a que el usuario elija en el popup
    }

    switch (newValue) {
      case 'Hoy':
        desde = toInputDate(today);
        hasta = toInputDate(today);
        break;
      case 'Ayer': {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        desde = toInputDate(yesterday);
        hasta = toInputDate(yesterday);
        break;
      }
      case 'Este Mes': {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        desde = toInputDate(firstDayOfMonth);
        hasta = toInputDate(lastDayOfMonth);
        break;
      }
      case 'Este Año': {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
        desde = toInputDate(firstDayOfYear);
        hasta = toInputDate(lastDayOfYear);
        break;
      }
      default:
        // Caso para cuando se limpia la selección (newValue es null)
        break;
    }
    setFiltroFechas({ desde, hasta });
  };

  // Efecto para aplicar los filtros cuando cambian
  useEffect(() => {
    let ordenesFiltradas = [...ordenesOriginales];

    if (filtroDeposito) {
      ordenesFiltradas = ordenesFiltradas.filter(o => o.deposito_id === filtroDeposito.id);
    }
    if (filtroEstado) {
      ordenesFiltradas = ordenesFiltradas.filter(o => o.estado === filtroEstado);
    }
    if (filtroFechas.desde) {
      ordenesFiltradas = ordenesFiltradas.filter(o => o.fecha_orden >= filtroFechas.desde);
    }
    if (filtroFechas.hasta) {
      ordenesFiltradas = ordenesFiltradas.filter(o => o.fecha_orden <= filtroFechas.hasta);
    }

    setOrdenes(ordenesFiltradas);
  }, [filtroDeposito, filtroEstado, filtroFechas, ordenesOriginales]);

  const handleApplyCustomDate = (dates) => {
    setFiltroFechas(dates);
  };

  const handleClearFilters = () => {
    setFiltroDeposito(null);
    setFiltroEstado(null);
    setFiltroFechas({ desde: '', hasta: '' });
    setSelectedDateFilter(null);
  };

  const handleUpdateStatus = async (ordenId, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('com_ordenes_compra')
        .update({ estado: nuevoEstado })
        .eq('id', ordenId);

      if (error) throw error;

      enqueueSnackbar(`Orden ${nuevoEstado.toLowerCase()} con éxito.`, { variant: 'success' });
      fetchData(); // Recargar datos para reflejar el cambio
      handleCloseViewModal();
    } catch (error) {
      enqueueSnackbar(`Error al cambiar estado: ${error.message}`, { variant: 'error' });
    }
  };

  const handleOpenViewModal = (id) => {
    setSelectedOrdenId(id);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedOrdenId(null);
    setViewModalOpen(false);
  };

  const handleApprove = (ordenId) => handleUpdateStatus(ordenId, 'APROBADO');
  const handleReject = (ordenId) => handleUpdateStatus(ordenId, 'RECHAZADO');

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Órdenes de Compra
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => navigate('/compras/ordenes/nueva')}>
          Nueva Orden
        </Button>
      </Box>

      {/* --- SECCIÓN DE FILTROS --- */}
      <Box component={Paper} variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={depositos}
              getOptionLabel={(option) => option.nombre}
              value={filtroDeposito}
              onChange={(_, newValue) => setFiltroDeposito(newValue)}
              renderInput={(params) => <TextField {...params} label="Filtrar por Depósito" />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={estados}
              value={filtroEstado}
              onChange={(_, newValue) => setFiltroEstado(newValue)}
              renderInput={(params) => <TextField {...params} label="Filtrar por Estado" />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={DATE_FILTER_OPTIONS}
              value={selectedDateFilter}
              onChange={(_, newValue) => handleDateFilterChange(newValue)}
              renderInput={(params) => <TextField {...params} label="Filtrar por Fecha" />}
            />
          </Grid>
          <Grid item xs={12} sx={{ textAlign: 'right', pt: 1 }}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<X />}
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
              <TableCell>N° Orden</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Condición</TableCell>
              <TableCell>Depósito</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
            ) : (
              ordenes.map((orden) => (
                <TableRow key={orden.id} hover>
                  <TableCell>{String(orden.id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(orden.fecha_orden)}</TableCell>
                  <TableCell>{orden.proveedor_razon_social}</TableCell>
                  <TableCell>{orden.condicion_compra_nombre}</TableCell>
                  <TableCell>{orden.deposito_nombre}</TableCell>
                  <TableCell align="right">{formatCurrency(orden.total)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={orden.estado}
                      color={getStatusChipColor(orden.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Recibir Mercadería">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => navigate(`/compras/recepcion/nueva/${orden.id}`)}
                          disabled={!['APROBADO', 'RECIBIDO PARCIAL'].includes(orden.estado)}
                        >
                          <Package />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/compras/ordenes/editar/${orden.id}`)}
                          disabled={orden.estado !== 'INGRESADO'}
                        >
                          <PencilSimple />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleOpenViewModal(orden.id)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {viewModalOpen && (
        <VerDetalleOrdenModal
          ordenId={selectedOrdenId}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
          isAuthorizer={isAuthorizer}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <DateRangePickerModal
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onApply={handleApplyCustomDate}
        initialDates={filtroFechas}
      />
    </Paper>
  );
};

export default OrdenesCompra;
