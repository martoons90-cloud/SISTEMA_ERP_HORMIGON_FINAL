import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  Box,
  Alert,
  IconButton,
} from '@mui/material';
import { X as XIcon } from 'phosphor-react';

const StockDetalleModal = ({ articulo, open, onClose }) => {
  const [stockPorDeposito, setStockPorDeposito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStockDetalle = async () => {
      if (!articulo?.id) return;

      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('stk_stock_por_deposito')
          .select(`
            stock_actual,
            deposito:stk_depositos (
              nombre,
              ubicacion
            )
          `)
          .eq('articulo_id', articulo.id);

        if (fetchError) throw fetchError;

        setStockPorDeposito(data);
      } catch (err) {
        setError('No se pudo cargar el detalle de stock.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockDetalle();
  }, [articulo]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Detalle de Stock: {articulo?.name}
        <IconButton onClick={onClose}><XIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : stockPorDeposito.length === 0 ? (
          <Alert severity="info">Este artículo no tiene stock registrado en ningún depósito.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Depósito</TableCell>
                  <TableCell>Ubicación</TableCell>
                  <TableCell align="right">Stock Actual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockPorDeposito.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.deposito.nombre}</TableCell>
                    <TableCell>{item.deposito.ubicacion || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {item.stock_actual}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockDetalleModal;