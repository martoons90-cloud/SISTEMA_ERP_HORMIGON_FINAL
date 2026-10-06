import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Chip
} from '@mui/material';
import { PlusCircle, Eye, Trash } from 'phosphor-react';
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
    case 'EMITIDA':
      return 'success';
    case 'ANULADA':
      return 'error';
    default:
      return 'default';
  }
};

const OrdenesPago = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [ordenesPago, setOrdenesPago] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrdenesPago = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('v_ordenes_pago_listado').select('*');
      if (error) throw error;
      setOrdenesPago(data);
    } catch (error) {
      enqueueSnackbar(`Error al cargar órdenes de pago: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchOrdenesPago();
  }, [fetchOrdenesPago]);

  const handleAnnul = (id) => {
    // Lógica de anulación irá aquí en el futuro
    enqueueSnackbar(`Funcionalidad de anular OP N°${id} no implementada.`, { variant: 'info' });
  };

  const handleViewDetails = (id) => {
    // Lógica para ver detalle irá aquí en el futuro
    enqueueSnackbar(`Funcionalidad de ver detalle de OP N°${id} no implementada.`, { variant: 'info' });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Órdenes de Pago
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => navigate('/tesoreria/pagos/nueva')}>
          Nueva Orden de Pago
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° OP</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Facturas Pagadas</TableCell>
              <TableCell>Método de Pago</TableCell>
              <TableCell align="right">Total Pagado</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
            ) : ordenesPago.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">No hay órdenes de pago registradas.</TableCell></TableRow>
            ) : (
              ordenesPago.map((op) => (
                <TableRow key={op.id} hover>
                  <TableCell>{String(op.id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(op.fecha_pago)}</TableCell>
                  <TableCell>{op.proveedor_razon_social}</TableCell>
                  <TableCell>{op.facturas_pagadas}</TableCell>
                  <TableCell>{op.metodo_pago}</TableCell>
                  <TableCell align="right">{formatCurrency(op.total_pagado)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={op.estado}
                      color={getStatusChipColor(op.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleViewDetails(op.id)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Anular">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleAnnul(op.id)}
                          disabled={op.estado === 'ANULADA'}
                        >
                          <Trash />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default OrdenesPago;
