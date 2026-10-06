import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Chip
} from '@mui/material';
import { PlusCircle } from 'phosphor-react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';

const getStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE':
      return 'warning';
    case 'APROBADO':
      return 'success';
    case 'RECHAZADO':
      return 'error';
    default:
      return 'default';
  }
};

const Cotizaciones = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        setLoading(true);
        // Hacemos la consulta a Supabase, pidiendo los datos relacionados de clientes y vendedores
        const { data, error } = await supabase
          .from('ven_pedidos_venta')
          .select(`
            id,
            fecha_documento,
            total,
            estado_entrega,
            estado_facturacion,
            cliente:ven_clientes (codigo, razon_social),
            vendedor:ven_vendedores (nombre)
          `)
          // Por ahora, mostramos todos los documentos. Luego se podrá agregar un filtro por tipo.
          .order('id', { ascending: false }); // Ordenamos por la más reciente

        if (error) throw error;

        setCotizaciones(data);
      } catch (error) {
        enqueueSnackbar(`Error al cargar cotizaciones: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchCotizaciones();
  }, [enqueueSnackbar]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Cotizaciones de Venta
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusCircle />}
          onClick={() => navigate('/ventas/cotizaciones/nueva')}
        >
          Nueva Cotización
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Cotización</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : cotizaciones.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No se encontraron cotizaciones.</TableCell></TableRow>
            ) : (
              cotizaciones.map((cot) => {
                const estadoGeneral = cot.estado_facturacion === 'FACTURADO' ? 'APROBADO' : 'PENDIENTE';
                return (
                <TableRow hover key={cot.id} sx={{ cursor: 'pointer' }} onClick={() => { /* Próximamente: navegar al detalle */ }}>
                  <TableCell><strong>{String(cot.id).padStart(8, '0')}</strong></TableCell>
                  <TableCell>{new Date(cot.fecha_documento + 'T00:00:00').toLocaleDateString()}</TableCell>
                  <TableCell>{cot.cliente?.razon_social || 'N/A'}</TableCell>
                  <TableCell>{cot.vendedor?.nombre || 'N/A'}</TableCell>
                  <TableCell align="right">{(cot.total || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</TableCell>
                  <TableCell align="center">
                    <Chip label={estadoGeneral} color={getStatusChipColor(estadoGeneral)} size="small" />
                  </TableCell>
                </TableRow>
              )
            })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default Cotizaciones;