import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Divider, IconButton
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

const VerDetalleRemitoModal = ({ remitoId, open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [remito, setRemito] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!remitoId) return;

    const fetchRemitoDetalle = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('com_remitos_ingreso')
          .select(`
            id,
            fecha_recepcion,
            orden_compra_id,
            numero_remito_proveedor,
            observaciones,
            proveedor:com_proveedores(razon_social),
            responsable:profiles(full_name),
            detalle:com_remitos_ingreso_detalle(
              id,
              cantidad_recibida,
              articulo:stk_articulos(code, name),
              oc_detalle:com_ordenes_compra_detalle(cantidad)
            )
          `)
          .eq('id', remitoId)
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error(`No se encontró el remito con ID ${remitoId}`);
        }
        setRemito(data);
      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchRemitoDetalle();
  }, [remitoId, enqueueSnackbar, onClose]);

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Detalle de Remito de Ingreso
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !remito ? (
          <Typography>No se pudo cargar el remito.</Typography>
        ) : (
          <Box>
            {/* Header Info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <Typography variant="h6">Proveedor: {remito.proveedor?.razon_social}</Typography>
                <Typography variant="body2" color="text.secondary">OC Asociada: OC-{String(remito.orden_compra_id).padStart(6, '0')}</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="h6">Remito Interno N°: {String(remito.id).padStart(6, '0')}</Typography>
                <Typography variant="body2" color="text.secondary">Fecha Recepción: {formatDate(remito.fecha_recepcion)}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            {/* Details */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography><strong>N° Remito Proveedor:</strong> {remito.numero_remito_proveedor}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography><strong>Responsable:</strong> {remito.responsable?.full_name || 'No especificado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>Observaciones:</strong> {remito.observaciones || 'Sin observaciones'}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            {/* Items Table */}
            <Typography variant="h6" gutterBottom>Artículos Recibidos</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cant. Pedida</TableCell>
                    <TableCell align="right">Cant. Recibida</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remito.detalle.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.articulo?.code}</TableCell>
                      <TableCell>{item.articulo?.name}</TableCell>
                      <TableCell align="right">{item.oc_detalle?.cantidad || 'N/A'}</TableCell>
                      <TableCell align="right">{item.cantidad_recibida}</TableCell>
                    </TableRow>
                  ))}
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

export default VerDetalleRemitoModal;