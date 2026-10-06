import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Tooltip, Chip, IconButton
} from '@mui/material';
import { ArrowLeft, Eye } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const GestionRemitosEmitidos = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ven_remitos')
        .select(`
          id,
          numero_remito,
          fecha_remito,
          estado,
          pedido_venta_id,
          cliente:ven_clientes(razon_social)
        `)
        .order('fecha_remito', { ascending: false })
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      setRemitos(data || []);
    } catch (error) {
      enqueueSnackbar(`Error al cargar remitos emitidos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Placeholder para la funcionalidad de ver el detalle de un remito
  const handleViewRemito = (remitoId) => {
    enqueueSnackbar(`Funcionalidad para ver remito N° ${remitoId} no implementada aún.`, { variant: 'info' });
    // En el futuro, esto podría navegar a una vista de detalle:
    // navigate(`/produccion/remitos/ver/${remitoId}`);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Remitos Emitidos
        </Typography>
        <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/produccion/remitos')}>
          Volver a Entregas
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Remito</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Pedido Asociado</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : remitos.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No se han emitido remitos.</TableCell></TableRow>
            ) : (
              remitos.map((remito) => (
                <TableRow key={remito.id} hover>
                  <TableCell><strong>{remito.numero_remito}</strong></TableCell>
                  <TableCell>{formatDate(remito.fecha_remito)}</TableCell>
                  <TableCell>{remito.cliente?.razon_social || 'N/A'}</TableCell>
                  <TableCell>{remito.pedido_venta_id ? `PV-${String(remito.pedido_venta_id).padStart(6, '0')}` : 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={remito.estado}
                      color={remito.estado === 'CONFIRMADO' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Remito">
                      <IconButton color="primary" onClick={() => handleViewRemito(remito.id)}>
                        <Eye />
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

export default GestionRemitosEmitidos;
