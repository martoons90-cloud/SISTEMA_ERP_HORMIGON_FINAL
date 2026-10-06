import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid,
  CircularProgress, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { Printer, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  // Asegurarse de que la fecha se interpreta en UTC para evitar problemas de zona horaria
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-AR');
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const getStatusChip = (status, type) => {
    const colors = {
        entrega: { PENDIENTE: 'info', PARCIAL: 'warning', ENTREGADO: 'success', ANULADO: 'error' },
        facturacion: { PENDIENTE: 'info', PARCIAL: 'warning', FACTURADO: 'success', ANULADO: 'error' }
    };
    const color = colors[type]?.[status] || 'default';
    return <Chip label={status || 'N/A'} color={color} />;
};

const VerDetallePedidoVentaModal = ({ pedidoId, open, onClose, tipoDocumento = 'pedido' }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);

  const labels = useMemo(() => {
    if (tipoDocumento === 'cotizacion') {
      return {
        title: 'Detalle de Cotización de Venta',
        doc_name: 'Cotización',
        doc_number: 'Cotización N°:',
        summary_title: 'Resumen de la Cotización',
        total_title: 'Total Cotización:',
        status_title: 'Estados de la Cotización',
        print_button: 'Imprimir Cotización',
      };
    }
    return {
      title: 'Detalle de Pedido de Venta',
      doc_name: 'Pedido',
      doc_number: 'Pedido N°:',
      summary_title: 'Resumen del Pedido',
      total_title: 'Total Pedido:',
      status_title: 'Estados del Pedido',
      print_button: 'Imprimir Pedido',
    };
  }, [tipoDocumento]);

  useEffect(() => {
    const fetchPedidoDetalle = async () => {
      if (!pedidoId || !open) return;

      setLoading(true);
      setPedido(null);

      try {
        const { data, error } = await supabase
          .from('ven_pedidos_venta')
          .select(`
            id,
            fecha_documento,
            total,
            observaciones,
            estado_entrega,
            estado_facturacion,
            cliente:ven_clientes(id, razon_social, codigo),
            vendedor:ven_vendedores(id, nombre),
            obra:ven_clientes_obras(id, nombre, direccion),
            detalle:ven_pedidos_venta_detalle(
              id,
              cantidad,
              precio_unitario,
              articulo:stk_articulos(id, code, name, unidad_medida)
            )
          `)
          .eq('id', pedidoId)
          .single();

        if (error) throw error;
        setPedido(data);

      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchPedidoDetalle();
  }, [pedidoId, open, enqueueSnackbar, onClose]);

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        {labels.title}
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !pedido ? (
          <Typography>No se pudo cargar el {labels.doc_name.toLowerCase()}.</Typography>
        ) : (
          <Box>
            {/* Header Info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={8}>
                <Typography variant="h6">Cliente: {pedido.cliente?.razon_social}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendedor: {pedido.vendedor?.nombre || 'N/A'}
                </Typography>
                 {pedido.obra && (
                    <Typography variant="body2" color="text.secondary">
                        Obra: {pedido.obra.nombre} - {pedido.obra.direccion}
                    </Typography>
                 )}
              </Grid>
              <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                <Typography variant="h6">{labels.doc_number} {String(pedido.id).padStart(8, '0')}</Typography>
                <Typography variant="body2" color="text.secondary">Fecha: {formatDate(pedido.fecha_documento)}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            
            {/* Items section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Detalle de Artículos</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell>U.M.</TableCell>
                    <TableCell align="right">Cant. Pedida</TableCell>
                    <TableCell align="right">P. Unitario</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedido.detalle.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.articulo?.code} - {item.articulo?.name}</TableCell>
                      <TableCell>{item.articulo?.unidad_medida}</TableCell>
                      <TableCell align="right">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                      <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.cantidad * item.precio_unitario)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            {/* Status Summary */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={tipoDocumento === 'cotizacion' ? 12 : 6}>
                    <Typography variant="h6">{labels.summary_title}</Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Grid container spacing={1}>
                            <Grid item xs={6}><Typography variant="body1">{labels.total_title}</Typography></Grid>
                            <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography variant="body1" fontWeight="bold">{formatCurrency(pedido.total)}</Typography></Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">Observaciones:</Typography>
                                <Typography variant="body2">{pedido.observaciones || 'Sin observaciones.'}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
                {tipoDocumento === 'pedido' && (
                  <Grid item xs={12} md={6}>
                      <Typography variant="h6">{labels.status_title}</Typography>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Grid container spacing={2} alignItems="center" justifyContent="space-around" sx={{height: '100%'}}>
                              <Grid item>
                                  <Typography variant="overline" display="block" gutterBottom>Entrega</Typography>
                                  {getStatusChip(pedido.estado_entrega, 'entrega')}
                              </Grid>
                              <Divider orientation="vertical" flexItem />
                              <Grid item>
                                  <Typography variant="overline" display="block" gutterBottom>Facturación</Typography>
                                  {getStatusChip(pedido.estado_facturacion, 'facturacion')}
                              </Grid>
                          </Grid>
                      </Paper>
                  </Grid>
                )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
        <Button onClick={handlePrint} startIcon={<Printer />}>
          {labels.print_button}
        </Button>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerDetallePedidoVentaModal;
