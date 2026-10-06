import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-AR');
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const VerDetalleFacturaVentaModal = ({ facturaId, open, onClose }) => {
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFacturaDetalle = async () => {
      if (!facturaId || !open) return;

      setLoading(true);
      setError(null);
      setFactura(null);

      try {
        // Se restaura la consulta única y optimizada.
        // Esto trae toda la información de la factura, cliente, talonario y detalle con artículos en una sola llamada.
        const { data, error: fetchError } = await supabase
          .from('ven_facturas_venta')
          .select(`
            id,
            numero_factura,
            fecha_factura,
            total,
            cliente:ven_clientes(id, razon_social, codigo, cuit),
            talonario:ven_talonarios(id, letra, punto_venta),
            detalle:ven_facturas_venta_detalle(
              id,
              cantidad,
              precio_unitario,
              articulo:stk_articulos(id, code, name)
            )
          `)
          .eq('id', facturaId)
          .single();

        if (fetchError) throw fetchError;
        setFactura(data);

      } catch (err) {
        console.error("Error detallado al cargar factura:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFacturaDetalle();
  }, [facturaId, open]);

  const renderContent = () => {
    if (loading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    if (error) {
      return <Alert severity="error">Error al cargar el detalle: {error}</Alert>;
    }
    if (!factura) {
      return <Alert severity="info">No se encontró la factura.</Alert>;
    }

    return (
      <>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={8}>
            <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
            <Typography>{factura.cliente.codigo} - {factura.cliente.razon_social}</Typography>
            <Typography variant="body2" color="text.secondary">CUIT: {factura.cliente.cuit}</Typography>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="subtitle2" color="text.secondary">Fecha</Typography>
            <Typography>{formatDate(factura.fecha_factura)}</Typography>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell align="right">Cant.</TableCell><TableCell align="right">P. Unit.</TableCell><TableCell align="right">Subtotal</TableCell></TableRow></TableHead>
            <TableBody>
              {factura.detalle.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.articulo?.code || 'N/A'}</TableCell>
                  <TableCell>{item.articulo?.name || 'Artículo no encontrado'}</TableCell>
                  <TableCell align="right">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                  <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.cantidad * item.precio_unitario)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ '& > td': { border: 0, pt: 2 } }}><TableCell colSpan={3} /><TableCell align="right"><Typography variant="h6">TOTAL:</Typography></TableCell><TableCell align="right"><Typography variant="h6">{formatCurrency(factura.total)}</Typography></TableCell></TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

  const numeroCompleto = factura ? `${factura.talonario.letra} ${String(factura.talonario.punto_venta).padStart(4, '0')}-${String(factura.numero_factura).padStart(8, '0')}` : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalle de Factura: {numeroCompleto}</DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
    </Dialog>
  );
};

export default VerDetalleFacturaVentaModal;