import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Divider, CircularProgress, Tooltip, Stack
} from '@mui/material';
import { ArrowLeft, FloppyDisk, Plus, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import FormularioProveedor from './FormularioProveedor';

// Opciones predefinidas
const CONDICIONES_IVA = ['IVA 21%', 'IVA 10.5%', 'Exento', 'No Gravado'];
const MONEDAS = ['ARS', 'USD'];

const NuevaOrdenCompra = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Estados para datos de selectores
  const [proveedores, setProveedores] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [condicionesCompra, setCondicionesCompra] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del encabezado de la orden
  const [orden, setOrden] = useState({
    proveedor: null,
    fecha_orden: new Date().toISOString().split('T')[0],
    fecha_vigencia: '',
    comprador: '',
    condicion_compra: null,
    deposito: null,
    moneda: 'ARS',
    observaciones: '',
    solicitante: '',
    condicion_iva: 'IVA 21%',
  });

  // Estado para el detalle de la orden (los artículos)
  const [detalle, setDetalle] = useState([]);

  // Estado para el item que se está agregando
  const [itemActual, setItemActual] = useState({
    articulo: null,
    cantidad: '',
    precio_unitario: '',
    bonificacion_porcentaje: '',
    impuestos_varios: '',
    observaciones: '',
  });

  const [proveedorDialogOpen, setProveedorDialogOpen] = useState(false);

  // Cargar datos iniciales desde Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setOrden(prev => ({ ...prev, comprador: profile?.full_name || user.email }));

        const proveedoresPromise = supabase.from('com_proveedores').select('*').eq('activo', true);
        const depositosPromise = supabase.from('stk_depositos').select('*').eq('activo', true);
        const articulosPromise = supabase.from('stk_articulos').select('id, code, name, unidad_medida, costo_promedio').eq('activo', true);
        const condicionesPromise = supabase.from('com_condiciones_compra').select('*');

        const [proveedoresRes, depositosRes, articulosRes, condicionesRes] = await Promise.all([
          proveedoresPromise,
          depositosPromise,
          articulosPromise,
          condicionesPromise
        ]);

        if (proveedoresRes.error) throw proveedoresRes.error;
        if (depositosRes.error) throw depositosRes.error;
        if (articulosRes.error) throw articulosRes.error;
        if (condicionesRes.error) throw condicionesRes.error;

        setProveedores(proveedoresRes.data);
        setDepositos(depositosRes.data);
        setArticulos(articulosRes.data);
        setCondicionesCompra(condicionesRes.data);
      } catch (error) {
        enqueueSnackbar(`Error cargando datos: ${error.message}`, { variant: 'error' });
      }
      setLoading(false);
    };
    loadInitialData();
  }, [enqueueSnackbar]);

  const handleNewProviderSuccess = (nuevoProveedor) => {
    // Añadir el nuevo proveedor a la lista y seleccionarlo
    setProveedores(prev => [...prev, nuevoProveedor]);
    handleOrdenChange('proveedor', nuevoProveedor);
    setProveedorDialogOpen(false);
  };

  // Manejar cambios en el encabezado
  const handleOrdenChange = (field, value) => {
    setOrden(prev => ({ ...prev, [field]: value }));
  };

  // Manejar cambios en el item actual
  const handleItemActualChange = (e) => {
    const { name, value } = e.target;
    setItemActual((prev) => ({ ...prev, [name]: value }));
  };

  // Agregar un item al detalle
  const handleAddItem = () => {
    if (!itemActual.articulo || !itemActual.cantidad || !itemActual.precio_unitario) {
      enqueueSnackbar('Complete al menos Artículo, Cantidad y Precio.', { variant: 'warning' });
      return;
    }
    const nuevoItem = {
      ...itemActual,
      cantidad: parseFloat(itemActual.cantidad),
      precio_unitario: parseFloat(itemActual.precio_unitario),
      bonificacion_porcentaje: parseFloat(itemActual.bonificacion_porcentaje) || 0,
      impuestos_varios: parseFloat(itemActual.impuestos_varios) || 0,
    };
    setDetalle((prev) => [...prev, nuevoItem]);
    setItemActual({ articulo: null, cantidad: '', precio_unitario: '', bonificacion_porcentaje: '', impuestos_varios: '', observaciones: '' });
  };

  // Remover un item del detalle
  const handleRemoveItem = (index) => {
    setDetalle((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Lógica de Cálculos ---
  const getTasaIva = (condicion) => {
    if (condicion.includes('21%')) return 0.21;
    if (condicion.includes('10.5%')) return 0.105;
    return 0;
  };

  const detalleConCalculos = useMemo(() => {
    return detalle.map(item => {
      const subtotalItem = item.cantidad * item.precio_unitario;
      const montoBonificacion = subtotalItem * (item.bonificacion_porcentaje / 100);
      const totalConBonificacion = subtotalItem - montoBonificacion;
      return { ...item, subtotal: subtotalItem, montoBonificacion, total: totalConBonificacion };
    });
  }, [detalle]);

  const totales = useMemo(() => {
    const subtotalGeneral = detalleConCalculos.reduce((sum, item) => sum + item.subtotal, 0);
    const descuentoGeneral = detalleConCalculos.reduce((sum, item) => sum + item.montoBonificacion, 0);
    const baseImponible = subtotalGeneral - descuentoGeneral;
    const tasaIva = getTasaIva(orden.condicion_iva);
    const ivaGeneral = baseImponible * tasaIva;
    const totalGeneral = baseImponible + ivaGeneral;
    return { subtotalGeneral, descuentoGeneral, ivaGeneral, totalGeneral };
  }, [detalleConCalculos, orden.condicion_iva]);

  // Guardar la orden
  const handleSubmit = async () => {
    if (!orden.proveedor || !orden.deposito || detalle.length === 0) {
      enqueueSnackbar('Debe seleccionar Proveedor, Depósito y agregar al menos un artículo.', { variant: 'error' });
      return;
    }
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const itemsToSubmit = detalle.map(item => ({
        articulo_id: item.articulo.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        bonificacion_porcentaje: item.bonificacion_porcentaje,
      }));

      const { error } = await supabase.rpc('crear_orden_de_compra', {
        p_proveedor_id: orden.proveedor.id,
        p_fecha_orden: orden.fecha_orden,
        p_fecha_vigencia: orden.fecha_vigencia || null,
        p_condicion_compra_id: orden.condicion_compra?.id,
        p_deposito_id: orden.deposito.id,
        p_moneda: orden.moneda,
        p_condicion_iva: orden.condicion_iva,
        p_observaciones: orden.observaciones,
        p_solicitante: orden.solicitante,
        p_responsable_id: user.id,
        p_items: itemsToSubmit,
      });

      if (error) throw error;

      enqueueSnackbar('Orden de compra creada con éxito.', { variant: 'success' });
      navigate('/compras/ordenes');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la orden: ${error.message}`, { variant: 'error' });
      setLoading(false);
    }
  };

  if (loading && !proveedores.length) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
  }

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">Nueva Orden de Compra</Typography>
          <Box>
            <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/compras/ordenes')} sx={{ mr: 2 }}>Volver</Button>
            <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSubmit} disabled={loading}>{loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Orden'}</Button>
          </Box>
        </Box>

        {/* --- ENCABEZADO --- */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete
                fullWidth
                options={proveedores}
                getOptionLabel={(option) => option.razon_social}
                value={orden.proveedor}
                onChange={(_, newValue) => setOrden(prev => ({ ...prev, proveedor: newValue, condicion_iva: newValue?.condicion_iva || 'IVA 21%' }))}
                renderInput={(params) => <TextField {...params} label="Proveedor" required />}
              />
              <Button variant="outlined" onClick={() => setProveedorDialogOpen(true)} sx={{ minWidth: 'auto', p: '8px' }}><Plus /></Button>
            </Stack>
          </Grid>
          <Grid item xs={6} md={2}><TextField label="Fecha Orden" type="date" name="fecha_orden" value={orden.fecha_orden} onChange={(e) => handleOrdenChange('fecha_orden', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} required /></Grid>
          <Grid item xs={6} md={2}><TextField label="Fecha Vigencia" type="date" name="fecha_vigencia" value={orden.fecha_vigencia} onChange={(e) => handleOrdenChange('fecha_vigencia', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Comprador" name="comprador" value={orden.comprador} onChange={(e) => handleOrdenChange('comprador', e.target.value)} fullWidth disabled /></Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={condicionesCompra}
              getOptionLabel={(option) => option.nombre || ''}
              value={orden.condicion_compra}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => setOrden(prev => ({ ...prev, condicion_compra: newValue }))}
              renderInput={(params) => <TextField {...params} label="Condición de Compra" />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete options={depositos} getOptionLabel={(option) => option.nombre} value={orden.deposito}
              onChange={(_, newValue) => setOrden(prev => ({ ...prev, deposito: newValue }))}
              renderInput={(params) => <TextField {...params} label="Depósito de Destino" required />}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <Autocomplete options={MONEDAS} value={orden.moneda} onChange={(_, newValue) => setOrden(prev => ({ ...prev, moneda: newValue }))}
              renderInput={(params) => <TextField {...params} label="Moneda" />}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <Autocomplete options={CONDICIONES_IVA} value={orden.condicion_iva} onChange={(_, newValue) => setOrden(prev => ({ ...prev, condicion_iva: newValue }))}
              renderInput={(params) => <TextField {...params} label="Condición IVA" />}
            />
          </Grid>
          <Grid item xs={12} md={6}><TextField label="Solicitante" name="solicitante" value={orden.solicitante} onChange={(e) => handleOrdenChange('solicitante', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Observaciones Generales" name="observaciones" value={orden.observaciones} onChange={(e) => handleOrdenChange('observaciones', e.target.value)} fullWidth multiline rows={1} /></Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* --- FORMULARIO DE ITEMS --- */}
        <Typography variant="h6" sx={{ mb: 2 }}>Agregar Artículos</Typography>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={4}>
            <Autocomplete options={articulos} getOptionLabel={(option) => `${option.code} - ${option.name}`} value={itemActual.articulo}
              onChange={(_, newValue) => setItemActual(prev => ({ ...prev, articulo: newValue, precio_unitario: newValue?.costo_promedio || '' }))}
              renderInput={(params) => <TextField {...params} label="Artículo" />}
            />
          </Grid>
          <Grid item xs={4} md={1}><TextField label="Cantidad" name="cantidad" type="number" value={itemActual.cantidad} onChange={handleItemActualChange} fullWidth /></Grid>
          <Grid item xs={4} md={1.5}><TextField label="Precio Unit." name="precio_unitario" type="number" value={itemActual.precio_unitario} onChange={handleItemActualChange} fullWidth /></Grid>
          <Grid item xs={4} md={1.5}><TextField label="Bonif. (%)" name="bonificacion_porcentaje" type="number" value={itemActual.bonificacion_porcentaje} onChange={handleItemActualChange} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField label="Observaciones" name="observaciones" value={itemActual.observaciones} onChange={handleItemActualChange} fullWidth /></Grid>
          <Grid item xs={12} md={2}><Button variant="contained" color="primary" startIcon={<Plus />} onClick={handleAddItem} fullWidth>Agregar</Button></Grid>
        </Grid>

        {/* --- TABLA DE DETALLE --- */}
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell>U.M.</TableCell>
                <TableCell align="right">Cantidad</TableCell><TableCell align="right">Precio Unit.</TableCell>
                <TableCell align="right">Bonif. (%)</TableCell><TableCell align="right">Subtotal</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detalleConCalculos.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">No hay artículos en la orden.</TableCell></TableRow>
              ) : (
                detalleConCalculos.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.articulo.code}</TableCell>
                    <TableCell><Tooltip title={item.observaciones || 'Sin observaciones'} placement="top-start"><span>{item.articulo.name}</span></Tooltip></TableCell>
                    <TableCell>{item.articulo.unidad_medida}</TableCell>
                    <TableCell align="right">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                    <TableCell align="right">${item.precio_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right">{item.bonificacion_porcentaje}%</TableCell>
                    <TableCell align="right">${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="center"><IconButton onClick={() => handleRemoveItem(index)} color="error" size="small"><Trash /></IconButton></TableCell>
                  </TableRow>
                ))
              )}
              <TableRow sx={{ '& > td': { border: 0, pt: 2 } }}>
                <TableCell colSpan={5} /><TableCell align="right"><Typography fontWeight="bold">Subtotal:</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="bold">${totales.subtotalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                <TableCell />
              </TableRow>
              <TableRow sx={{ '& > td': { border: 0 } }}>
                <TableCell colSpan={5} /><TableCell align="right"><Typography>Descuentos:</Typography></TableCell>
                <TableCell align="right"><Typography color="error.main">-${totales.descuentoGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                <TableCell />
              </TableRow>
              <TableRow sx={{ '& > td': { border: 0 } }}>
                <TableCell colSpan={5} /><TableCell align="right"><Typography>IVA ({orden.condicion_iva}):</Typography></TableCell>
                <TableCell align="right"><Typography>${totales.ivaGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                <TableCell />
              </TableRow>
              <TableRow sx={{ '& > td': { border: 0 } }}>
                <TableCell colSpan={5} /><TableCell align="right"><Typography variant="h6">TOTAL:</Typography></TableCell>
                <TableCell align="right"><Typography variant="h6">${totales.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <FormularioProveedor
        open={proveedorDialogOpen}
        onClose={() => setProveedorDialogOpen(false)}
        onSuccess={handleNewProviderSuccess}
      />
    </>
  );
};

export default NuevaOrdenCompra;
