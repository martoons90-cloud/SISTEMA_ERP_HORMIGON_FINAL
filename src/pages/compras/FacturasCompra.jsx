import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Button, Chip,
  Grid, TextField, Autocomplete, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { Eye, PlusCircle, Trash, PencilSimple, X } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import VerDetalleFacturaModal from './VerDetalleFacturaModal';
import DateRangePickerModal from './DateRangePickerModal';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Helper para formatear fecha a YYYY-MM-DD para los inputs
const toInputDate = (date) => {
    if (!date) return '';
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

// Helper para formatear moneda
const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$ 0.00';
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
};

// Helper for status chip color
const getStatusChipColor = (status) => {
  switch (status) {
    case 'PAGADA':
      return 'success';
    case 'PENDIENTE DE PAGO':
      return 'warning';
    case 'ANULADA':
      return 'error';
    default:
      return 'default';
  }
};

const FacturasCompra = () => {
  const [facturas, setFacturas] = useState([]);
  const [facturasOriginales, setFacturasOriginales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFacturaId, setSelectedFacturaId] = useState(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);

  // Estados para filtros
  const [proveedores, setProveedores] = useState([]);
  const [filtroProveedor, setFiltroProveedor] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: facturasData, error: facturasError } = await supabase.from('v_facturas_compra_listado').select('*');
      if (facturasError) throw facturasError;

      const { data: proveedoresData, error: proveedoresError } = await supabase.from('com_proveedores').select('id, razon_social').eq('activo', true);
      if (proveedoresError) throw proveedoresError;

      setFacturas(facturasData);
      setFacturasOriginales(facturasData);
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

  const handleDateFilterChange = (event, newFilter) => {
    if (newFilter === null) return;

    if (newFilter === 'personalizado') {
      setDateModalOpen(true);
      return;
    }

    setActiveDateFilter(newFilter);
    const today = new Date();
    let desde = '';
    let hasta = '';

    switch (newFilter) {
      case 'hoy':
        desde = toInputDate(today);
        hasta = toInputDate(today);
        break;
      case 'semana': {
        const startOfWeek = getStartOfWeek(today);
        desde = toInputDate(startOfWeek);
        hasta = toInputDate(new Date(startOfWeek.setDate(startOfWeek.getDate() + 6)));
        break;
      }
      case 'mes': {
        desde = toInputDate(new Date(today.getFullYear(), today.getMonth(), 1));
        hasta = toInputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      }
      case 'anio': {
        desde = toInputDate(new Date(today.getFullYear(), 0, 1));
        hasta = toInputDate(new Date(today.getFullYear(), 11, 31));
        break;
      }
      default:
        break;
    }
    setFiltroFechaDesde(desde);
    setFiltroFechaHasta(hasta);
  };

  const handleApplyCustomDate = (dates) => {
    setFiltroFechaDesde(dates.desde);
    setFiltroFechaHasta(dates.hasta);
    setActiveDateFilter('personalizado');
  };

  const handleClearFilters = () => {
    setFiltroProveedor(null);
    setFiltroEstado(null);
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setActiveDateFilter(null);
  };

  const facturasFiltradas = useMemo(() => {
    return facturasOriginales.filter(factura => {
      if (filtroProveedor && factura.proveedor_id !== filtroProveedor.id) {
        return false;
      }
      if (filtroEstado && factura.estado !== filtroEstado.value) {
        return false;
      }
      if (filtroFechaDesde && factura.fecha_factura < filtroFechaDesde) {
        return false;
      }
      if (filtroFechaHasta && factura.fecha_factura > filtroFechaHasta) {
        return false;
      }
      return true;
    });
  }, [facturasOriginales, filtroProveedor, filtroEstado, filtroFechaDesde, filtroFechaHasta]);

  const handleViewDetails = (id) => {
    setSelectedFacturaId(id);
    setViewModalOpen(true);
  };

  const handleEditFactura = (facturaId) => {
    navigate(`/compras/facturas/editar/${facturaId}`);
  };

  const handleAnnulFactura = async (facturaId) => {
    if (window.confirm('¿Estás seguro de que quieres anular esta factura? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase.rpc('anular_factura_compra', { p_factura_id: facturaId });
        if (error) throw error;
        enqueueSnackbar(`Factura N° ${String(facturaId).padStart(6, '0')} anulada.`, { variant: 'success' });
        fetchData(); // Recargar los datos
      } catch (error) {
        enqueueSnackbar(`Error al anular la factura: ${error.message}`, { variant: 'error' });
      }
    }
  };

  const handleCloseViewModal = () => {
    setSelectedFacturaId(null);
    setViewModalOpen(false);
  };

  const handleNewFactura = () => {
    navigate('/compras/facturas/nueva');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Facturas de Compra
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusCircle />}
          onClick={handleNewFactura}
        >
          Nueva Factura
        </Button>
      </Box>

      {/* --- SECCIÓN DE FILTROS --- */}
      <Box component={Paper} variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={proveedores}
              getOptionLabel={(option) => option.razon_social}
              value={filtroProveedor}
              onChange={(_, newValue) => setFiltroProveedor(newValue)}
              renderInput={(params) => <TextField {...params} label="Proveedor" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={[
                { label: 'Pendiente de Pago', value: 'PENDIENTE DE PAGO' },
                { label: 'Pagada', value: 'PAGADA' },
                { label: 'Anulada', value: 'ANULADA' },
              ]}
              getOptionLabel={(option) => option.label}
              value={filtroEstado}
              onChange={(_, newValue) => setFiltroEstado(newValue)}
              renderInput={(params) => <TextField {...params} label="Estado" size="small" />}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <ToggleButtonGroup
              value={activeDateFilter}
              exclusive
              onChange={handleDateFilterChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="hoy">Hoy</ToggleButton>
              <ToggleButton value="semana">Semana</ToggleButton>
              <ToggleButton value="mes">Mes</ToggleButton>
              <ToggleButton value="anio">Año</ToggleButton>
              <ToggleButton value="personalizado">Personalizado</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={1} sx={{ textAlign: 'right' }}>
            <Button
              variant="text"
              onClick={handleClearFilters}
              startIcon={<X />}
              size="small"
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Factura</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Remito(s)</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
            ) : facturasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">No se encontraron facturas con los filtros aplicados.</TableCell></TableRow>
            ) : (
              facturasFiltradas.map((factura) => (
                <TableRow key={factura.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{factura.numero_factura}</TableCell>
                  <TableCell>{formatDate(factura.fecha_factura)}</TableCell>
                  <TableCell>{factura.proveedor_razon_social}</TableCell>
                  <TableCell>{factura.remitos_asociados}</TableCell>
                  <TableCell align="right">{formatCurrency(factura.total)}</TableCell>
                  <TableCell>
                    <Chip
                      label={factura.estado}
                      color={getStatusChipColor(factura.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleViewDetails(factura.id)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Factura">
                      <span>
                        <IconButton size="small" onClick={() => handleEditFactura(factura.id)} disabled={factura.estado === 'ANULADA' || factura.estado === 'PAGADA'}>
                          <PencilSimple />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Anular Factura">
                      <span>
                        <IconButton size="small" onClick={() => handleAnnulFactura(factura.id)} disabled={factura.estado === 'ANULADA' || factura.estado === 'PAGADA'}>
                          <Trash />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {viewModalOpen && (
        <VerDetalleFacturaModal
          facturaId={selectedFacturaId}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}

      <DateRangePickerModal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        onApply={handleApplyCustomDate}
        initialDates={{ desde: filtroFechaDesde, hasta: filtroFechaHasta }}
      />
    </Paper>
  );
};

export default FacturasCompra;
