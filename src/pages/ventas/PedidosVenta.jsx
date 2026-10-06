import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Chip
} from '@mui/material';
import { PlusCircle, PencilSimple, Eye, Receipt } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import VerDetallePedidoVentaModal from './VerDetallePedidoVentaModal';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const getEntregaStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'info';
    case 'PARCIAL': return 'warning';
    case 'ENTREGADO': return 'success';
    case 'ANULADO': return 'error';
    default: return 'default';
  }
};

const getFacturacionStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'info';
    case 'PARCIAL': return 'warning';
    case 'FACTURADO': return 'success';
    case 'ANULADO': return 'error';
    default: return 'default';
  }
};

const getPagoStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'warning';
    case 'PAGO PARCIAL': return 'primary';
    case 'PAGADO': return 'success';
    case 'N/A': return 'default';
    default: return 'default';
  }
};

const PedidosVenta = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState(null);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ven_pedidos_venta')
        .select(`
          id,
          fecha_documento,
          total,
          estado_entrega,
          estado_facturacion,
          estado_pago,
          cliente:ven_clientes(razon_social),
          vendedor:ven_vendedores(nombre)
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      enqueueSnackbar(`Error cargando pedidos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleViewDetails = (id) => {
    setSelectedPedidoId(id);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedPedidoId(null);
    setViewModalOpen(false);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Pedidos de Venta
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => navigate('/ventas/pedidos/nuevo')}>
          Nuevo Pedido
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Pedido</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">E. Entrega</TableCell>
              <TableCell align="center">E. Factura</TableCell>
              <TableCell align="center">E. Pago</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress /></TableCell></TableRow>
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">No se encontraron pedidos.</TableCell>
              </TableRow>
            ) : (
              pedidos.map((pedido) => (
                <TableRow key={pedido.id} hover>
                  <TableCell>{String(pedido.id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(pedido.fecha_documento)}</TableCell>
                  <TableCell>{pedido.cliente.razon_social}</TableCell>
                  <TableCell>{pedido.vendedor.nombre}</TableCell>
                  <TableCell align="right">{formatCurrency(pedido.total)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={`Estado de Entrega: ${pedido.estado_entrega}`}>
                      <Chip label={pedido.estado_entrega} color={getEntregaStatusChipColor(pedido.estado_entrega)} size="small" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={`Estado de Facturación: ${pedido.estado_facturacion}`}>
                      <Chip label={pedido.estado_facturacion} color={getFacturacionStatusChipColor(pedido.estado_facturacion)} size="small" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={`Estado de Pago: ${pedido.estado_pago}`}>
                      <Chip label={pedido.estado_pago} color={getPagoStatusChipColor(pedido.estado_pago)} size="small" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Facturar">
                      <span>
                        <IconButton size="small" color="primary" disabled={pedido.estado_facturacion === 'FACTURADO' || pedido.estado_facturacion === 'ANULADO'} onClick={() => navigate(`/ventas/facturas/nueva/${pedido.id}`)}>
                          <Receipt />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <span>
                        <IconButton size="small" disabled={pedido.estado_facturacion === 'FACTURADO' || pedido.estado_entrega === 'ENTREGADO' || pedido.estado_facturacion === 'ANULADO'}><PencilSimple /></IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Ver Detalle General"><IconButton size="small" onClick={() => handleViewDetails(pedido.id)}><Eye /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {viewModalOpen && (
        <VerDetallePedidoVentaModal
          pedidoId={selectedPedidoId}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
    </Paper>
  );
};

export default PedidosVenta;
