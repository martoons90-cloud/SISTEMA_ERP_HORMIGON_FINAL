import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  CircularProgress, List, ListItem, ListItemIcon, Checkbox, ListItemText
} from '@mui/material';
import { ArrowLeft, FloppyDisk } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  // Asegurarse de que la fecha se interpreta en UTC para evitar problemas de zona horaria
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-AR');
};

const NuevaFacturaVenta = () => {
  const navigate = useNavigate();
  const { pedidoId } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const isDesdePedido = !!pedidoId;

  const [loading, setLoading] = useState(true);
  
  const [factura, setFactura] = useState({
    cliente: null,
    talonario: null,
    fecha_factura: new Date().toISOString().split('T')[0],
  });

  const [detalle, setDetalle] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [talonarios, setTalonarios] = useState([]);
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar talonarios activos
        const { data: talonariosData, error: talonariosError } = await supabase
          .from('ven_talonarios')
          .select('*')
          .eq('activo', true);
        if (talonariosError) throw talonariosError;
        setTalonarios(talonariosData);

        if (isDesdePedido) {
          const { data: pedidoAFacturar, error: pedidoError } = await supabase
            .from('ven_pedidos_venta')
            .select('*, cliente:ven_clientes(*), detalle:ven_pedidos_venta_detalle!pedido_id(*, articulo:stk_articulos!articulo_id(*))')
            .eq('id', pedidoId)
            .single();

          if (pedidoError || !pedidoAFacturar) {
            enqueueSnackbar('Pedido no encontrado o error al cargar.', { variant: 'error' });
            navigate('/ventas/pedidos');
            return;
          }

          if (pedidoAFacturar.estado_facturacion === 'FACTURADO') {
            enqueueSnackbar('Este pedido ya ha sido facturado.', { variant: 'warning' });
            navigate('/ventas/pedidos');
            return;
          }

          setFactura(prev => ({ ...prev, cliente: pedidoAFacturar.cliente }));
          setDetalle(pedidoAFacturar.detalle.map(d => ({ ...d, articulo: d.articulo })));
          setPedidosSeleccionados([pedidoAFacturar]);
        } else {
          // Cargar todos los clientes si no venimos de un pedido
          const { data: clientesData, error: clientesError } = await supabase.from('ven_clientes').select('*');
          if (clientesError) throw clientesError;
          setClientes(clientesData);
        }
      } catch (error) {
        enqueueSnackbar(`Error cargando datos: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pedidoId, isDesdePedido, navigate, enqueueSnackbar]);

  useEffect(() => {
    const fetchPedidosPendientes = async () => {
      if (!isDesdePedido && factura.cliente) {
        const { data, error } = await supabase
          .from('ven_pedidos_venta')
          .select('*, detalle:ven_pedidos_venta_detalle!pedido_id(*, articulo:stk_articulos!articulo_id(*))')
          .eq('cliente_id', factura.cliente.id)
          .in('estado_facturacion', ['PENDIENTE', 'PARCIAL']); // <-- Cambio clave: Buscamos ambos estados
        
        if (error) {
          console.error("Error fetching pending orders:", error);
          enqueueSnackbar(`Error al buscar pedidos pendientes: ${error.message}`, { variant: 'error' });
        }
        else setPedidosPendientes(data || []);
      } else {
        setPedidosPendientes([]);
      }
      setPedidosSeleccionados([]);
      setDetalle([]);
    };
    fetchPedidosPendientes();
  }, [factura.cliente, isDesdePedido]);

  useEffect(() => {
    const nuevoDetalle = pedidosSeleccionados.flatMap(p => p.detalle);
    setDetalle(nuevoDetalle);
  }, [pedidosSeleccionados]);

  const handleFacturaChange = (field, value) => {
    setFactura(prev => ({ ...prev, [field]: value }));
  };

  const handleTogglePedido = (pedido) => {
    setPedidosSeleccionados(prev => {
      const isSelected = prev.some(p => p.id === pedido.id);
      return isSelected ? prev.filter(p => p.id !== pedido.id) : [...prev, pedido];
    });
  };

  const totalGeneral = useMemo(() => {
    return detalle.reduce((sum, item) => {
      const subtotal = (item.cantidad || 0) * (item.precio_unitario || 0);
      return sum + subtotal;
    }, 0);
  }, [detalle]);

  const handleSubmit = async () => {
    if (!factura.cliente || !factura.talonario || detalle.length === 0) {
      enqueueSnackbar('Debe seleccionar Cliente, Talonario y al menos un Pedido.', { variant: 'error' });
      return;
    }
    
    const facturaData = {
      p_cliente_id: factura.cliente.id,
      p_talonario_id: factura.talonario.id,
      p_fecha_factura: factura.fecha_factura,
      p_pedidos_ids: pedidosSeleccionados.map(p => p.id),
      p_total: totalGeneral,
      p_detalle: detalle.map(item => ({
        articulo_id: item.articulo.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }))
    };

    try {
      setLoading(true);
      const { error } = await supabase.rpc('guardar_factura_venta', facturaData);
      if (error) throw error;
      enqueueSnackbar('Factura de Venta guardada con éxito.', { variant: 'success' });
      navigate('/ventas/facturas');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la factura: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          {isDesdePedido ? `Nueva Factura (desde Pedido N° ${String(pedidoId).padStart(8, '0')})` : 'Nueva Factura de Venta'}
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/ventas/facturas')} sx={{ mr: 2 }}>Volver</Button>
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSubmit}>Guardar Factura</Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Autocomplete 
            options={isDesdePedido ? (factura.cliente ? [factura.cliente] : []) : clientes}
            getOptionLabel={(option) => option ? [option.codigo, option.razon_social].filter(Boolean).join(' - ') : ''}
            value={factura.cliente}
            onChange={(_, newValue) => handleFacturaChange('cliente', newValue)}
            renderInput={(params) => <TextField {...params} label="Cliente" required />}
            readOnly={isDesdePedido}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Autocomplete 
            options={talonarios}
            getOptionLabel={(option) => `${option.nombre} (${option.letra})` || ''}
            value={factura.talonario}
            onChange={(_, newValue) => handleFacturaChange('talonario', newValue)}
            renderInput={(params) => <TextField {...params} label="Talonario" required />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField label="Fecha Factura" type="date" name="fecha_factura" value={factura.fecha_factura} onChange={(e) => handleFacturaChange('fecha_factura', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} required />
        </Grid>
        {factura.talonario && (
          <Grid item xs={12}>
            <Typography variant="h6" color="text.secondary">
              Próximo N° de Comprobante: {factura.talonario.punto_venta}-{String(factura.talonario.ultimo_numero + 1).padStart(8, '0')}
            </Typography>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {!isDesdePedido && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Pedidos Aprobados para Facturar</Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {!factura.cliente ? <ListItem><ListItemText primary="Seleccione un cliente para ver sus pedidos pendientes." /></ListItem> :
               pedidosPendientes.length === 0 ? <ListItem><ListItemText primary="No hay pedidos pendientes para este cliente." /></ListItem> :
               pedidosPendientes.map(pedido => (
                <ListItem key={pedido.id} button onClick={() => handleTogglePedido(pedido)}>
                  <ListItemIcon><Checkbox edge="start" checked={pedidosSeleccionados.some(p => p.id === pedido.id)} tabIndex={-1} disableRipple /></ListItemIcon>
                  <ListItemText primary={`Pedido N° ${String(pedido.id).padStart(8, '0')}`} secondary={`Fecha: ${formatDate(pedido.fecha_documento)} - Total: ${formatCurrency(pedido.total)}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Divider sx={{ my: 3 }} />
        </>
      )}

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Detalle de la Factura</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio Unit.</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detalle.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">Seleccione uno o más pedidos para ver el detalle.</TableCell></TableRow>
            ) : (
              detalle.map((item, index) => (
                <TableRow key={`${item.articulo.id}-${index}`}>
                  <TableCell>{item.articulo.code}</TableCell>
                  <TableCell>{item.articulo.name}</TableCell>
                  <TableCell align="right">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                  <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                  <TableCell align="right">{formatCurrency((item.cantidad || 0) * (item.precio_unitario || 0))}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow sx={{ '& > td': { border: 0, pt: 2 } }}>
              <TableCell colSpan={3} />
              <TableCell align="right"><Typography variant="h6">TOTAL:</Typography></TableCell>
              <TableCell align="right"><Typography variant="h6">{formatCurrency(totalGeneral)}</Typography></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default NuevaFacturaVenta;
