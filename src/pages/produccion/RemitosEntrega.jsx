import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Chip
} from '@mui/material';
import { Truck, Package } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Helpers (can be moved to a shared file)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const getEntregaStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'info';
    case 'PARCIAL': return 'warning';
    case 'ENTREGADO': return 'success';
    case 'ANULADO': return 'error';
    default: return 'default';
  }
};

const RemitosEntrega = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ven_pedidos_venta')
        .select(`
          id,
          fecha_documento,
          estado_entrega,
          cliente:ven_clientes(razon_social),
          obra:ven_clientes_obras(nombre)
        `)
        .in('estado_entrega', ['PENDIENTE', 'PARCIAL']);
      
      if (error) throw error;
      
      setPedidosPendientes(data || []);
    } catch (error) {
      enqueueSnackbar(`Error al cargar pedidos pendientes: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Gestión de Entregas (Remitos)
        </Typography>
        <Button variant="outlined" startIcon={<Package />} onClick={() => navigate('/produccion/remitos-emitidos')}>
          Ver Remitos Emitidos
        </Button>
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>Pedidos Pendientes de Entrega</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Pedido</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Destino (Obra)</TableCell>
              <TableCell align="center">Estado Entrega</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : pedidosPendientes.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No hay pedidos pendientes de entrega.</TableCell></TableRow>
            ) : (
              pedidosPendientes.map((pedido) => (
                <TableRow key={pedido.id} hover>
                  <TableCell>{String(pedido.id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(pedido.fecha_documento)}</TableCell>
                  <TableCell>{pedido.cliente.razon_social}</TableCell>
                  <TableCell>{pedido.obra?.nombre || 'Principal'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={pedido.estado_entrega}
                      color={getEntregaStatusChipColor(pedido.estado_entrega)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Crear Remito de Entrega">
                      <IconButton color="primary" onClick={() => navigate(`/produccion/remitos/nuevo/${pedido.id}`)}>
                        <Truck />
                      </IconButton>
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

export default RemitosEntrega;
