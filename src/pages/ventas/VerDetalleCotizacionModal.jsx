import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid,
  CircularProgress, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { Printer, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { mockPedidosVenta } from '../compras/mock-data';

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

const getStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'warning';
    case 'APROBADO': return 'success';
    case 'RECHAZADO': return 'error';
    default: return 'default';
  }
};

const VerDetalleCotizacionModal = ({ cotizacionId, open, onClose, onUpdateStatus, aprobacionRequerida }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cotizacionId) return;

    setLoading(true);
    // Simulación de carga de datos
    setTimeout(() => {
      try {
        const cotizacionEncontrada = mockPedidosVenta.find(c => c.id === cotizacionId && c.tipo === 'COTIZACION');
        if (!cotizacionEncontrada) {
          throw new Error(`No se encontró la cotización con ID ${cotizacionId}`);
        }
        setCotizacion(cotizacionEncontrada);
      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [cotizacionId, enqueueSnackbar, onClose]);

  const handleApprove = () => {
    onUpdateStatus(cotizacion.id, 'APROBADO');
    onClose();
  };

  const handleReject = () => {
    onUpdateStatus(cotizacion.id, 'RECHAZADO');
    onClose();
  };

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Detalle de Cotización
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !cotizacion ? (
          <Typography>No se pudo cargar la cotización.</Typography>
        ) : (
          <Box>
            {/* Header Info */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <Typography variant="h6">Cliente: {cotizacion.cliente?.razon_social}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendedor: {cotizacion.vendedor?.nombre}
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="h6">Cotización N°: {String(cotizacion.id).padStart(6, '0')}</Typography>
                <Typography variant="body2" color="text.secondary">Fecha: {formatDate(cotizacion.fecha_documento)}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            
            {/* Totals and Status */}
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                    <Typography variant="h5" fontWeight="bold">Total: {formatCurrency(cotizacion.total)}</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Chip
                      label={cotizacion.estado}
                      color={getStatusChipColor(cotizacion.estado)}
                    />
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* Items section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Detalle de Items</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">P. Unitario</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cotizacion.detalle.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.articulo?.codigo}</TableCell>
                      <TableCell>{item.articulo?.nombre}</TableCell>
                      <TableCell align="right">{item.cantidad}</TableCell>
                      <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.cantidad * item.precio_unitario)}</TableCell>
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
        <Box>
          {aprobacionRequerida && cotizacion?.estado === 'PENDIENTE' && (
            <>
              <Button onClick={handleReject} color="error" sx={{ mr: 1 }}>
                Rechazar
              </Button>
              <Button onClick={handleApprove} variant="contained" color="success" sx={{ mr: 1 }}>
                Aprobar
              </Button>
            </>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default VerDetalleCotizacionModal;
