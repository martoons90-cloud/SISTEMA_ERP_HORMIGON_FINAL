import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Divider
} from '@mui/material';
import { ArrowLeft, FloppyDisk } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const NuevaRecepcion = () => {
  const navigate = useNavigate();
  const { ordenId } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [orden, setOrden] = useState(null);
  const [itemsRecepcion, setItemsRecepcion] = useState([]);
  const [remito, setRemito] = useState({ numero: '', observaciones: '' });
  const [responsable, setResponsable] = useState('');

  useEffect(() => {
    const fetchOrdenData = async () => {
      setLoading(true);
      try {
        const { data: ordenData, error: ordenError } = await supabase
          .from('com_ordenes_compra')
          .select(`
            *,
            proveedor:com_proveedores(razon_social),
            deposito:stk_depositos(nombre),
            detalle:com_ordenes_compra_detalle(
              *,
              articulo:stk_articulos(code, name)
            )
          `)
          .eq('id', ordenId)
          .in('estado', ['APROBADO', 'RECIBIDO PARCIAL'])
          .single();

        if (ordenError || !ordenData) {
          throw new Error(ordenError?.message || `No se encontró la orden de compra N°${ordenId} o no está en estado para recibir.`);
        }

        setOrden(ordenData);
        
        const itemsParaRecepcionar = ordenData.detalle.map(item => ({
          ...item,
          // La cantidad a recibir por defecto es lo que falta
          cantidad_a_recibir: item.cantidad - item.cantidad_recibida, 
        }));
        setItemsRecepcion(itemsParaRecepcionar);

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setResponsable(profile?.full_name || user.email);

      } catch (error) {
        enqueueSnackbar(error.message, { variant: 'error' });
        navigate('/compras/ordenes');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenData();
  }, [ordenId, navigate, enqueueSnackbar]);

  const handleCantidadChange = (itemId, nuevaCantidad) => {
    const valorNumerico = parseFloat(nuevaCantidad) || 0;
    setItemsRecepcion(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, cantidad_a_recibir: valorNumerico } : item
      )
    );
  };

  const handleGuardarRecepcion = async () => {
    // Validaciones
    if (!remito.numero) {
      enqueueSnackbar('El número de remito del proveedor es obligatorio.', { variant: 'warning' });
      return;
    }

    const itemsConCantidad = itemsRecepcion.filter(item => item.cantidad_a_recibir > 0);
    if (itemsConCantidad.length === 0) {
        enqueueSnackbar('Debe recibir al menos un artículo.', { variant: 'warning' });
        return;
    }

    const itemsInvalidos = itemsRecepcion.some(item => item.cantidad_a_recibir > (item.cantidad - item.cantidad_recibida));
    if (itemsInvalidos) {
      enqueueSnackbar('No se puede recibir una cantidad mayor a la pendiente en la orden.', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const itemsParaEnviar = itemsConCantidad.map(item => ({
            oc_detalle_id: item.id,
            cantidad_recibida: item.cantidad_a_recibir
        }));

        const { error } = await supabase.rpc('registrar_recepcion_mercaderia', {
            p_orden_compra_id: parseInt(ordenId, 10),
            p_numero_remito_proveedor: remito.numero,
            p_observaciones: remito.observaciones,
            p_responsable_id: user.id,
            p_items_recibidos: itemsParaEnviar
        });

        if (error) throw error;

        enqueueSnackbar('Recepción de mercadería guardada con éxito.', { variant: 'success' });
        navigate('/compras/ordenes');
    } catch (error) {
        enqueueSnackbar(`Error al guardar la recepción: ${error.message}`, { variant: 'error' });
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!orden) {
    return <Typography>Orden no encontrada o no disponible para recepción.</Typography>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Recepción de Mercadería (OC N° {String(orden.id).padStart(6, '0')})
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/compras/ordenes')} sx={{ mr: 2 }}>
            Volver
          </Button>
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleGuardarRecepcion} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Recepción'}
          </Button>
        </Box>
      </Box>

      {/* --- DATOS DEL REMITO --- */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={4}>
          <TextField label="Proveedor" value={orden.proveedor.razon_social} fullWidth disabled variant="filled" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Depósito de Destino" value={orden.deposito.nombre} fullWidth disabled variant="filled" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Responsable" value={responsable} fullWidth disabled variant="filled" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="N° Remito Proveedor"
            value={remito.numero}
            onChange={(e) => setRemito(prev => ({ ...prev, numero: e.target.value }))}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Observaciones de la Recepción"
            value={remito.observaciones}
            onChange={(e) => setRemito(prev => ({ ...prev, observaciones: e.target.value }))}
            fullWidth
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* --- TABLA DE ARTÍCULOS A RECEPCIONAR --- */}
      <Typography variant="h6" gutterBottom>Artículos a Recepcionar</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Cant. Pedida</TableCell>
              <TableCell align="right">Cant. Ya Recibida</TableCell>
              <TableCell align="center" sx={{ width: '15%' }}>Cantidad a Recibir</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsRecepcion.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.articulo.code}</TableCell>
                <TableCell>{item.articulo.name}</TableCell>
                <TableCell align="right">{item.cantidad}</TableCell>
                <TableCell align="right">{item.cantidad_recibida}</TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    value={item.cantidad_a_recibir}
                    onChange={(e) => handleCantidadChange(item.id, e.target.value)}
                    variant="outlined"
                    size="small"
                    inputProps={{ style: { textAlign: 'center' }, max: item.cantidad - item.cantidad_recibida, min: 0 }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default NuevaRecepcion;
