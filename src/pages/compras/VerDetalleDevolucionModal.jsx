import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid,
  CircularProgress, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Printer, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const VerDetalleDevolucionModal = ({ devolucionId, open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [devolucion, setDevolucion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!devolucionId) return;

    const fetchDevolucionDetalle = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('com_devoluciones_proveedor')
          .select(`
            id,
            fecha_devolucion,
            orden_compra_id,
            observaciones,
            proveedor:com_proveedores(razon_social),
            responsable:profiles(full_name),
            detalle:com_devoluciones_proveedor_detalle(
              id,
              cantidad_devuelta,
              motivo,
              articulo:stk_articulos(code, name)
            )
          `)
          .eq('id', devolucionId)
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error(`No se encontró la devolución con ID ${devolucionId}`);
        }
        setDevolucion(data);
      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDevolucionDetalle();
  }, [devolucionId, enqueueSnackbar, onClose]);

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Detalle de Devolución a Proveedor
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !devolucion ? (
          <Typography>No se pudo cargar la devolución.</Typography>
        ) : (
          <Box>
            {/* Header Info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">Devolución N°: {String(devolucion.id).padStart(6, '0')}</Typography>
                <Typography><strong>Proveedor:</strong> {devolucion.proveedor?.razon_social}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                <Typography><strong>Fecha:</strong> {formatDate(devolucion.fecha_devolucion)}</Typography>
                <Typography><strong>OC Asociada:</strong> OC-{String(devolucion.orden_compra_id).padStart(6, '0')}</Typography>
                <Typography><strong>Responsable:</strong> {devolucion.responsable?.full_name || 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>Observaciones:</strong> {devolucion.observaciones || 'Sin observaciones'}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* Items section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Detalle de Items Devueltos</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cant. Devuelta</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devolucion.detalle.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No hay artículos en esta devolución.</TableCell>
                    </TableRow>
                  ) : (
                    devolucion.detalle.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.articulo?.code}</TableCell>
                        <TableCell>{item.articulo?.name}</TableCell>
                        <TableCell align="right">{item.cantidad_devuelta}</TableCell>
                        <TableCell>{item.motivo}</TableCell>
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

export default VerDetalleDevolucionModal;
