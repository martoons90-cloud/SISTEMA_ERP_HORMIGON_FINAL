import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Grid, CircularProgress, Divider, IconButton, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Printer, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  // Ajuste para asegurar que la fecha se muestre correctamente sin importar la zona horaria
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$ 0.00';
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
};

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

const VerDetalleFacturaModal = ({ facturaId, open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [factura, setFactura] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facturaId) return;

    const fetchFacturaDetalle = async () => {
      setLoading(true);
      try {
        const { data: facturaData, error } = await supabase
          .from('com_facturas_compra')
          .select(`
            *,
            proveedor:com_proveedores(razon_social),
            factura_remitos:com_facturas_compra_remitos(
              remito:com_remitos_ingreso(
                numero_remito_proveedor,
                detalle:com_remitos_ingreso_detalle(
                  id,
                  cantidad_recibida,
                  articulo:stk_articulos(id, code, name),
                  oc_detalle:com_ordenes_compra_detalle(precio_unitario)
                )
              )
            )
          `)
          .eq('id', facturaId)
          .single();

        if (error) throw error;
        if (!facturaData) {
          throw new Error(`No se encontró la factura con ID ${facturaId}`);
        }

        const remitosAsociadosStr = facturaData.factura_remitos
          .map(fr => fr.remito.numero_remito_proveedor)
          .join(', ');
        
        const facturaConRemitos = { ...facturaData, remitos_asociados: remitosAsociadosStr };
        setFactura(facturaConRemitos);

        const detalleItems = facturaData.factura_remitos.flatMap(fr => 
          fr.remito.detalle.map(item => ({
            ...item,
            precio_unitario: item.oc_detalle?.precio_unitario || 0,
            remito_numero: fr.remito.numero_remito_proveedor
          }))
        );
        setItems(detalleItems);

      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchFacturaDetalle();
  }, [facturaId, enqueueSnackbar, onClose]);

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Detalle de Factura de Compra
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !factura ? (
          <Typography>No se pudo cargar la factura.</Typography>
        ) : (
          <Box>
            {/* Header Info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <Typography variant="h6">Proveedor: {factura.proveedor?.razon_social}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Remito(s) Asociado(s): {factura.remitos_asociados}
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="h6">Factura N°: {factura.numero_factura}</Typography>
                <Typography variant="body2" color="text.secondary">Fecha Factura: {formatDate(factura.fecha_factura)}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            
            {/* Totals and Status */}
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                    <Typography variant="h5" fontWeight="bold">Total: {formatCurrency(factura.total)}</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Chip
                      label={factura.estado}
                      color={getStatusChipColor(factura.estado)}
                    />
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* Items section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Detalle de Items Facturados</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">P. Unitario</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell>Remito</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No se encontraron detalles de items para esta factura.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.articulo?.code}</TableCell>
                        <TableCell>{item.articulo?.name}</TableCell>
                        <TableCell align="right">{item.cantidad_recibida}</TableCell>
                        <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.cantidad_recibida * item.precio_unitario)}</TableCell>
                        <TableCell>{item.remito_numero}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
        <Button onClick={handlePrint} startIcon={<Printer />}>
          Imprimir
        </Button>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerDetalleFacturaModal;
