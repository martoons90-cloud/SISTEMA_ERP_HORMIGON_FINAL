import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, CircularProgress, Alert
} from '@mui/material';
import { ArrowLeft, FloppyDisk } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const NuevoRemito = () => {
  const navigate = useNavigate();
  const { pedidoId } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState(null);
  const [plantas, setPlantas] = useState([]);
  const [remito, setRemito] = useState({
    numero_remito: '',
    fecha_remito: new Date().toISOString().split('T')[0],
    planta: null,
    observaciones: ''
  });
  const [detalleRemito, setDetalleRemito] = useState([]);

  const fetchData = useCallback(async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      // Cargar plantas que tienen un depósito Y un talonario asociado
      const { data: plantasData, error: plantasError } = await supabase
        .from('log_plantas')
        .select('*, deposito:stk_depositos(*), talonario:log_talonarios_remitos(*)')
        .not('deposito_id', 'is', null)
        .not('talonario_remito_id', 'is', null);

      if (plantasError) throw plantasError;
      setPlantas(plantasData || []);

      // Cargar el pedido de venta
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('ven_pedidos_venta')
        .select(`
          *,
          cliente:ven_clientes(*),
          obra:ven_clientes_obras(*),
          detalle:ven_pedidos_venta_detalle(*, articulo:stk_articulos(*))
        `)
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;
      if (!pedidoData) {
        enqueueSnackbar('Pedido no encontrado.', { variant: 'error' });
        navigate('/produccion/remitos');
        return;
      }

      if (pedidoData.estado_entrega === 'ENTREGADO' || pedidoData.estado_entrega === 'ANULADO') {
        enqueueSnackbar(`El pedido ya fue ${pedidoData.estado_entrega.toLowerCase()}.`, { variant: 'warning' });
        navigate('/produccion/remitos');
        return;
      }

      setPedido(pedidoData);

      // Calcular cantidades ya entregadas
      const pedidoDetalleIds = pedidoData.detalle.map(d => d.id);
      const { data: remitosAnteriores, error: remitosError } = await supabase
        .from('ven_remitos_detalle')
        .select('pedido_detalle_id, cantidad')
        .in('pedido_detalle_id', pedidoDetalleIds);

      if (remitosError) throw remitosError;

      const entregadoMap = new Map();
      remitosAnteriores.forEach(rd => {
        const current = entregadoMap.get(rd.pedido_detalle_id) || 0;
        entregadoMap.set(rd.pedido_detalle_id, current + rd.cantidad);
      });

      const detalleInicial = pedidoData.detalle.map(item => {
        const cantidadEntregada = entregadoMap.get(item.id) || 0;
        return {
          ...item,
          cantidad_entregada: cantidadEntregada,
          cantidad_a_entregar: Math.max(0, (item.cantidad || 0) - cantidadEntregada)
        };
      });

      setDetalleRemito(detalleInicial);

    } catch (error) {
      enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
      navigate('/produccion/remitos');
    } finally {
      setLoading(false);
    }
  }, [pedidoId, navigate, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDetalleChange = (index, value) => {
    const newDetalle = [...detalleRemito];
    const itemOriginal = pedido.detalle[index];
    const maxAEntregar = (itemOriginal.cantidad || 0) - (newDetalle[index].cantidad_entregada || 0);
    
    let cantidadAEntregar = parseFloat(value) || 0;
    if (cantidadAEntregar > maxAEntregar) {
      cantidadAEntregar = maxAEntregar;
      enqueueSnackbar(`La cantidad no puede superar el pendiente (${maxAEntregar}).`, { variant: 'warning' });
    }
    if (cantidadAEntregar < 0) {
        cantidadAEntregar = 0;
    }

    newDetalle[index].cantidad_a_entregar = cantidadAEntregar;
    setDetalleRemito(newDetalle);
  };

  const handleSubmit = async () => {
    if (!remito.planta) {
      enqueueSnackbar('Debe seleccionar una Planta de Origen.', { variant: 'error' });
      return;
    }

    const itemsAEntregar = detalleRemito.filter(item => item.cantidad_a_entregar > 0);
    if (itemsAEntregar.length === 0) {
      enqueueSnackbar('Debe ingresar una cantidad a entregar para al menos un artículo.', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const params = {
        p_pedido_venta_id: pedido.id,
        p_cliente_id: pedido.cliente.id,
        p_obra_id: pedido.obra?.id,
        p_fecha_remito: remito.fecha_remito,
        p_planta_id: remito.planta.id,
        p_observaciones: remito.observaciones,
        p_detalle: itemsAEntregar.map(item => ({
          articulo_id: item.articulo.id,
          cantidad: item.cantidad_a_entregar,
          pedido_detalle_id: item.id
        }))
      };

      const { error } = await supabase.rpc('generar_remito_automatico', params);

      if (error) throw error;

      enqueueSnackbar('Remito generado y stock actualizado con éxito.', { variant: 'success' });
      navigate('/produccion/remitos');
    } catch (error) {
      enqueueSnackbar(`Error al generar el remito: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    };
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Nuevo Remito (desde Pedido N° {String(pedidoId).padStart(6, '0')})
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/produccion/remitos')} sx={{ mr: 2 }}>Volver</Button>
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSubmit}>Guardar Remito</Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Cliente: <strong>{pedido?.cliente.razon_social}</strong> | Destino: <strong>{pedido?.obra?.nombre || 'Principal'}</strong> ({pedido?.obra?.direccion || pedido?.cliente.domicilio})
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField label="N° Remito" value={remito.numero_remito || 'Se generará al guardar'} fullWidth required disabled />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="Fecha Remito" type="date" value={remito.fecha_remito} onChange={(e) => setRemito(p => ({ ...p, fecha_remito: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} required />
        </Grid>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={plantas}
            getOptionLabel={(option) => `${option.nombre} (Próximo: ${option.talonario.prefijo}${String(option.talonario.ultimo_numero + 1).padStart(option.talonario.cantidad_digitos, '0')})` || ''}
            value={remito.planta}
            onChange={(_, newValue) => {
              let numeroRemito = '';
              if (newValue && newValue.talonario) {
                const t = newValue.talonario;
                numeroRemito = `${t.prefijo}${String(t.ultimo_numero + 1).padStart(t.cantidad_digitos, '0')}`;
              }
              setRemito(p => ({ ...p, planta: newValue, numero_remito: numeroRemito }));
            }}
            renderInput={(params) => <TextField {...params} label="Planta de Origen" required />}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Observaciones" value={remito.observaciones} onChange={(e) => setRemito(p => ({ ...p, observaciones: e.target.value }))} fullWidth multiline rows={2} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>Detalle a Entregar</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              <TableCell align="right">Cant. Pedida</TableCell>
              <TableCell align="right">Cant. Ya Entregada</TableCell>
              <TableCell align="right">Cant. Pendiente</TableCell>
              <TableCell align="center" sx={{ width: '15%' }}>Cant. a Entregar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detalleRemito.map((item, index) => {
              const pendiente = (item.cantidad || 0) - (item.cantidad_entregada || 0);
              return (
                <TableRow key={item.articulo.id}>
                  <TableCell>{`${item.articulo.name}${item.articulo.variant_name ? ` - ${item.articulo.variant_name}` : ''}`}</TableCell>
                  <TableCell align="right">{item.cantidad}</TableCell>
                  <TableCell align="right">{item.cantidad_entregada || 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{pendiente}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={item.cantidad_a_entregar}
                      onChange={(e) => handleDetalleChange(index, e.target.value)}
                      inputProps={{ min: 0, max: pendiente, step: "any" }}
                      sx={{ width: '100px' }}
                      disabled={pendiente <= 0}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default NuevoRemito;
