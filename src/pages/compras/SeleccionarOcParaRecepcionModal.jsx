import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Grid, Autocomplete, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, IconButton, Paper
} from '@mui/material';
import { X as XIcon, ArrowCircleRight } from 'phosphor-react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';

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

const SeleccionarOcParaRecepcionModal = ({ open, onClose, onSelect }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [ordenesAprobadas, setOrdenesAprobadas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchProveedores = async () => {
        const { data, error } = await supabase
          .from('com_proveedores')
          .select('id, razon_social')
          .eq('activo', true);
        
        if (error) {
          enqueueSnackbar('Error al cargar proveedores', { variant: 'error' });
        } else {
          setProveedores(data);
        }
      };
      fetchProveedores();
    } else {
      setSelectedProveedor(null);
      setOrdenesAprobadas([]);
    }
  }, [open, enqueueSnackbar]);

  useEffect(() => {
    if (!selectedProveedor) {
      setOrdenesAprobadas([]);
      return;
    }

    const fetchOrdenes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_ordenes_para_recepcion')
        .select('*')
        .eq('proveedor_id', selectedProveedor.id);
      
      if (error) {
        enqueueSnackbar(`Error al cargar órdenes: ${error.message}`, { variant: 'error' });
      } else {
        setOrdenesAprobadas(data);
      }
      setLoading(false);
    };

    if (selectedProveedor) {
      fetchOrdenes();
    }
  }, [selectedProveedor, enqueueSnackbar]);

  const handleSelectOrden = (ordenId) => {
    onClose();
    onSelect(ordenId);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Seleccionar Orden de Compra para Recepción
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>1. Seleccione un Proveedor</Typography>
            <Autocomplete
              options={proveedores}
              getOptionLabel={(option) => option.razon_social}
              value={selectedProveedor}
              onChange={(_, newValue) => setSelectedProveedor(newValue)}
              renderInput={(params) => <TextField {...params} label="Proveedor" />}
            />
          </Grid>
          {selectedProveedor && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>2. Seleccione una Orden de Compra Aprobada</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>N° Orden</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                    ) : ordenesAprobadas.length > 0 ? (
                      ordenesAprobadas.map((orden) => (
                        <TableRow key={orden.id} hover>
                          <TableCell>{String(orden.id).padStart(6, '0')}</TableCell>
                          <TableCell>{formatDate(orden.fecha_orden)}</TableCell>
                          <TableCell align="right">{formatCurrency(orden.total)}</TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<ArrowCircleRight />}
                              onClick={() => handleSelectOrden(orden.id)}
                            >
                              Recepcionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} align="center">No hay órdenes de compra aprobadas para este proveedor.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeleccionarOcParaRecepcionModal;
