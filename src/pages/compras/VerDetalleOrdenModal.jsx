import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Divider, Chip, IconButton
} from '@mui/material';
import { Printer, Package, CheckCircle, XCircle, X as XIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
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
    case 'INGRESADO': return 'primary';
    case 'APROBADO': return 'success';
    case 'RECHAZADO': return 'error';
    case 'CERRADO':
    case 'RECIBIDO PARCIAL': return 'default';
    default: return 'default';
  }
};

const VerDetalleOrdenModal = ({ ordenId, open, onClose, isAuthorizer, onApprove, onReject }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // For confirmation dialog

  useEffect(() => {
    if (!ordenId) return;

    const fetchOrdenDetalle = async () => {
      setLoading(true);
      try {
        // 1. Fetch order header with related data
        const { data: ordenData, error: ordenError } = await supabase
          .from('com_ordenes_compra')
          .select(`
            *,
            proveedor:com_proveedores(*),
            deposito:stk_depositos(nombre),
            condicion:com_condiciones_compra(nombre)
          `)
          .eq('id', ordenId)
          .single();

        if (ordenError) throw ordenError;
        if (!ordenData) {
          throw new Error(`No se encontró la orden con ID ${ordenId}.`);
        }

        // 2. Fetch order details with related article data
        const { data: detalleData, error: detalleError } = await supabase
          .from('com_ordenes_compra_detalle')
          .select(`
            *,
            articulo:stk_articulos(code, name)
          `)
          .eq('orden_compra_id', ordenId);

        if (detalleError) throw detalleError;

        // 3. Combine header and details and set state
        setOrden({ ...ordenData, detalle: detalleData });

      } catch (error) {
        enqueueSnackbar(`Error al cargar el detalle: ${error.message}`, { variant: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenDetalle();
  }, [ordenId, enqueueSnackbar, onClose]);

  const handlePrint = () => {
    enqueueSnackbar('Funcionalidad de impresión no implementada aún.', { variant: 'info' });
  };

  const handleRecepcionar = () => {
    navigate(`/compras/recepcion/nueva/${orden.id}`);
    onClose();
  };

  const handleConfirm = () => {
    if (confirmAction === 'approve') {
      onApprove(orden.id);
    } else if (confirmAction === 'reject') {
      onReject(orden.id);
    }
    setConfirmAction(null);
  };

  const handleCloseConfirm = () => {
    setConfirmAction(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          Detalle de Orden de Compra
          <IconButton onClick={onClose}><XIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : !orden ? (
            <Typography>No se pudo cargar la orden.</Typography>
          ) : (
            <Box>
              {/* Header Info */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={8}>
                  <Typography variant="h6">Proveedor: {orden.proveedor?.razon_social}</Typography>
                  <Typography variant="body2" color="text.secondary">CUIT: {orden.proveedor?.cuit}</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">Orden N°: {String(orden.id).padStart(6, '0')}</Typography>
                  <Typography variant="body2" color="text.secondary">Fecha: {formatDate(orden.fecha_orden)}</Typography>
                  <Chip label={orden.estado} color={getStatusChipColor(orden.estado)} size="small" sx={{ mt: 1 }} />
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              {/* Details */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography><strong>Condición de Compra:</strong> {orden.condicion?.nombre || 'No especificada'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Depósito Destino:</strong> {orden.deposito?.nombre}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Observaciones:</strong> {orden.observaciones || 'Sin observaciones'}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              {/* Items Table */}
              <Typography variant="h6" gutterBottom>Artículos</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Cant. Pedida</TableCell>
                      <TableCell align="right">Cant. Recibida</TableCell>
                      <TableCell align="right">Precio Unit.</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(orden.detalle || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.articulo?.code}</TableCell>
                        <TableCell>{item.articulo?.name}</TableCell>
                        <TableCell align="right">{item.cantidad || 0}</TableCell>
                        <TableCell align="right">{item.cantidad_recibida || 0}</TableCell>
                        <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.cantidad * item.precio_unitario)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} />
                      <TableCell align="right"><strong>TOTAL</strong></TableCell>
                      <TableCell align="right"><strong>{formatCurrency(orden.total)}</strong></TableCell>
                    </TableRow>
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
            {(orden?.estado === 'APROBADO' || orden?.estado === 'RECIBIDO PARCIAL') && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Package />}
                onClick={handleRecepcionar}
                sx={{ mr: 1 }}
              >
                Recepcionar
              </Button>
            )}
            {isAuthorizer && orden?.estado === 'INGRESADO' && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<XCircle />}
                  onClick={() => setConfirmAction('reject')}
                  sx={{ mr: 1 }}
                >
                  Rechazar
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => setConfirmAction('approve')}
                >
                  Aprobar
                </Button>
              </>
            )}
            <Button onClick={onClose} sx={{ ml: 2 }}>Cerrar</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={handleCloseConfirm}
        maxWidth="xs"
      >
        <DialogTitle>Confirmar Acción</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres {confirmAction === 'approve' ? 'aprobar' : 'rechazar'} esta orden de compra?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            color={confirmAction === 'approve' ? 'success' : 'error'}
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VerDetalleOrdenModal;
