import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Stack,
  Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { ArrowLeft, FloppyDisk, Plus, Trash, PencilSimple, XCircle, Buildings, MagnifyingGlass } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const NuevaCotizacion = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { cotizacionId } = useParams();
  const isEditMode = !!cotizacionId;

  // Estados para datos de selectores
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [condicionesVenta, setCondicionesVenta] = useState([]);
  const [alicuotas, setAlicuotas] = useState([]);
  const [allPercepciones, setAllPercepciones] = useState([]);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para almacenar los precios de la lista seleccionada
  const [preciosListaActual, setPreciosListaActual] = useState(new Map());

  // Estado para los artículos disponibles para la búsqueda (filtrados por lista de precios)
  const [articulosDisponibles, setArticulosDisponibles] = useState([]);

  // Estado del encabezado de la cotización
  const [cotizacion, setCotizacion] = useState({
    cliente: null,
    vendedor: null,
    condicion_venta: null,
    fecha_documento: new Date().toISOString().split('T')[0],
    obra: null,
    lista_precios: null,
    alicuota_iva: null,
    percepciones: [],
    observaciones: '',
  });

  // Estado para el detalle
  const [detalle, setDetalle] = useState([]);

  // Estado para el item que se está agregando/editando
  const [itemActual, setItemActual] = useState({
    articulo: null,
    cantidad: '',
    precio_unitario: '',
  });

  // Estado para la edición de items
  const [editingIndex, setEditingIndex] = useState(null);

  // Estado para el popup de búsqueda de artículos
  const [buscadorArticulosOpen, setBuscadorArticulosOpen] = useState(false);
  const [buscadorSearchTerm, setBuscadorSearchTerm] = useState('');
  const [articuloInput, setArticuloInput] = useState('');
  const [filteredArticulosOptions, setFilteredArticulosOptions] = useState([]);

  const fetchCatalogos = useCallback(async () => {
    setLoading(true);
    try {
      const catalogos = [
        { table: 'ven_clientes', select: '*, obras:ven_clientes_obras(*), alicuota_iva:ven_alicuotas_iva!alicuota_iva_id(*), percepciones:ven_clientes_percepciones!cliente_id(percepcion:ven_percepciones_venta!percepcion_id(*))', setter: setClientes },
        { table: 'ven_vendedores', select: '*', setter: setVendedores },
        { table: 'stk_articulos', select: '*', setter: setArticulos },
        { table: 'ven_condiciones_venta', select: '*', setter: setCondicionesVenta },
        { table: 'ven_alicuotas_iva', select: '*', setter: setAlicuotas },
        { table: 'ven_percepciones_venta', select: '*', setter: setAllPercepciones },
        { table: 'ven_listas_precios', select: '*', setter: setListasPrecios }
      ];

      const promises = catalogos.map(c => supabase.from(c.table).select(c.select));
      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        if (result.error) throw result.error;
        catalogos[index].setter((result.data || []).filter(item => item && item.id != null));
      });

    } catch (error) {
      enqueueSnackbar(`Error cargando datos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchCatalogos();
  }, [fetchCatalogos]);

  // Efecto para cargar los datos de la cotización si estamos en modo edición
  useEffect(() => {
    const loadCotizacionData = async () => {
      if (!isEditMode || !clientes.length || !vendedores.length || !condicionesVenta.length || !listasPrecios.length || !alicuotas.length) return;

      setLoading(true);
      try {
        const { data: cotizacionData, error } = await supabase
          .from('ven_pedidos_venta')
          .select(`
            *,
            cliente:ven_clientes(*, obras:ven_clientes_obras(*), alicuota_iva:ven_alicuotas_iva!alicuota_iva_id(*), percepciones:ven_clientes_percepciones!cliente_id(percepcion:ven_percepciones_venta!percepcion_id(*))),
            vendedor:ven_vendedores(*),
            condicion_venta:ven_condiciones_venta(*),
            obra:ven_clientes_obras(*),
            lista_precios:ven_listas_precios(*),
            alicuota_iva:ven_alicuotas_iva(*),
            percepciones:ven_pedidos_venta_percepciones(percepcion:ven_percepciones_venta(*)),
            detalle:ven_pedidos_venta_detalle(*, articulo:stk_articulos(*))
          `)
          .eq('id', cotizacionId)
          .single();

        if (error) throw error;

        setCotizacion({
          cliente: cotizacionData.cliente,
          vendedor: cotizacionData.vendedor,
          condicion_venta: cotizacionData.condicion_venta,
          fecha_documento: cotizacionData.fecha_documento,
          obra: cotizacionData.obra,
          lista_precios: cotizacionData.lista_precios,
          alicuota_iva: cotizacionData.alicuota_iva,
          percepciones: cotizacionData.percepciones.map(p => p.percepcion),
          observaciones: cotizacionData.observaciones,
        });
        setDetalle(cotizacionData.detalle);
      } catch (error) {
        enqueueSnackbar(`Error al cargar la cotización para editar: ${error.message}`, { variant: 'error' });
        navigate('/ventas/cotizaciones');
      } finally {
        setLoading(false);
      }
    };

    loadCotizacionData();
  }, [isEditMode, cotizacionId, clientes, vendedores, condicionesVenta, listasPrecios, alicuotas, navigate, enqueueSnackbar]);

  useEffect(() => {
    setArticulosDisponibles(articulos);
  }, [articulos]);

  useEffect(() => {
    const cargarYRecalcularPrecios = async () => {
      if (!cotizacion.lista_precios) {
        setArticulosDisponibles(articulos);
        setPreciosListaActual(new Map());
        setDetalle(d => d.map(item => ({ ...item, precio_unitario: 0 })));
          setLoading(false); // <-- Ocultar el spinner después de limpiar
        return;
      }
      
      try {
        const { data: detalleData, error: detalleError } = await supabase
          .from('ven_listas_precios_detalle')
          .select('articulo_id, precio')
          .eq('lista_id', cotizacion.lista_precios.id);
        if (detalleError) throw detalleError;

        const { data: historyData, error: historyError } = await supabase
          .from('ven_listas_precios_historial')
          .select('articulo_id, created_at')
          .eq('lista_precio_id', cotizacion.lista_precios.id)
          .order('created_at', { ascending: false });
        if (historyError) throw historyError;

        const fechasModificacion = new Map();
        if (historyData) {
          for (const record of historyData) {
            if (!fechasModificacion.has(record.articulo_id)) {
              fechasModificacion.set(record.articulo_id, record.created_at);
            }
          }
        }
        
        const preciosMap = new Map();
        if (detalleData) {
            for (const item of detalleData) {
                preciosMap.set(item.articulo_id, {
                    precio: item.precio,
                    fecha: fechasModificacion.get(item.articulo_id)
                });
            }
        }
        setPreciosListaActual(preciosMap);

        const idSetDeLaLista = new Set(detalleData.map(p => p.articulo_id));
        const articulosDeLaLista = articulos.filter(art => idSetDeLaLista.has(art.id)); 
        setArticulosDisponibles(articulosDeLaLista);

        if (detalle.length > 0) {
          // Recalcular los precios del detalle usando useMemo
          const nuevoDetalle = detalle.map(item => {
            const precioUnitario = preciosMap.get(item.articulo.id)?.precio ?? 0;
            return {
            ...item,
            precio_unitario: precioUnitario
            };
          });
          setDetalle(nuevoDetalle);
        }
      } finally {
        setLoading(false);
      }
    };

    cargarYRecalcularPrecios();
  }, [cotizacion.lista_precios, articulos, enqueueSnackbar]);
  
  useEffect(() => {
    if (cotizacion.lista_precios) {
      enqueueSnackbar('Actualizando precios y artículos...', { variant: 'info', autoHideDuration: 2000 });
    }
  }, [cotizacion.lista_precios, enqueueSnackbar]);
  const handleCotizacionChange = (field, value) => {
    if (field === 'cliente') {
      setCotizacion(prev => ({ 
        ...prev, 
        cliente: value, 
        obra: null,
        alicuota_iva: value?.alicuota_iva || alicuotas.find(a => a.es_default) || null,
        percepciones: value?.percepciones?.map(p => p.percepcion).filter(Boolean) || []
      }));
      return;
    }
    setCotizacion(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateItem = () => {
    if (!itemActual.articulo || !itemActual.cantidad || !itemActual.precio_unitario) {
      enqueueSnackbar('Complete Artículo, Cantidad y Precio.', { variant: 'warning' });
      return;
    }
    const updatedItem = {
      ...itemActual,
      cantidad: parseFloat(itemActual.cantidad),
      precio_unitario: parseFloat(itemActual.precio_unitario),
    };

    const newDetalle = [...detalle];
    newDetalle[editingIndex] = updatedItem;
    setDetalle(newDetalle);
    
    setEditingIndex(null);
    setItemActual({ articulo: null, cantidad: '', precio_unitario: '' });
    setArticuloInput('');
  };
  
  const handleAddItem = () => {
    if (!itemActual.articulo || !itemActual.cantidad || !itemActual.precio_unitario) {
      enqueueSnackbar('Complete Artículo, Cantidad y Precio.', { variant: 'warning' });
      return;
    }
    const nuevoItem = {
      id: `temp_${Date.now()}`,
      ...itemActual,
      cantidad: parseFloat(itemActual.cantidad),
      precio_unitario: parseFloat(itemActual.precio_unitario),
    };
    setDetalle(prev => [...prev, nuevoItem]);
    setItemActual({ articulo: null, cantidad: '', precio_unitario: '' });
    setArticuloInput('');
  };

  const handleRemoveItem = (itemId) => {
    setDetalle((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleStartEdit = (itemId) => {
    const itemIndex = detalle.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    setEditingIndex(itemIndex);
    const itemToEdit = detalle[itemIndex];
    setItemActual(itemToEdit);
    setArticuloInput(itemToEdit.articulo ? `${itemToEdit.articulo.code} - ${itemToEdit.articulo.name}` : '');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setItemActual({ articulo: null, cantidad: '', precio_unitario: '' });
    setArticuloInput('');
  };

  const handleArticuloChange = (newValue) => {
    if (!newValue) {
      setItemActual({ articulo: null, cantidad: '', precio_unitario: '' });
      return;
    }

    // Lógica simplificada: siempre buscar el precio del artículo seleccionado (sea variante o no)
    const precioInfo = preciosListaActual.get(newValue.id);
    const precio = precioInfo?.precio ?? 0;

    if (precioInfo && cotizacion.lista_precios) {
      enqueueSnackbar(`Precio de lista '${cotizacion.lista_precios.nombre}' aplicado.`, { variant: 'info', autoHideDuration: 2000 });
    } else if (cotizacion.lista_precios && !precioInfo) {
      enqueueSnackbar(`Artículo no encontrado en la lista. Precio establecido a 0.`, { variant: 'warning' });
    }

    setItemActual(prev => ({ ...prev, articulo: newValue, precio_unitario: precio }));
  };

  const detalleConCalculos = useMemo(() => {
    return detalle.map(item => {
      const subtotalItem = (item.cantidad || 0) * (item.precio_unitario || 0);
      return { ...item, subtotal: subtotalItem };
    });
  }, [detalle]);

  const calculosTotales = useMemo(() => {
    const subtotal = detalleConCalculos.reduce((sum, item) => sum + item.subtotal, 0);
    const montoIVA = cotizacion.alicuota_iva ? subtotal * (cotizacion.alicuota_iva.valor / 100) : 0;
    const montoPercepciones = cotizacion.percepciones.reduce((sum, p) => sum + (subtotal * (p.valor / 100)), 0);
    const totalGeneral = subtotal + montoIVA + montoPercepciones;
    return { subtotal, montoIVA, montoPercepciones, totalGeneral };
  }, [detalleConCalculos, cotizacion.alicuota_iva, cotizacion.percepciones]);

  const handleSubmit = async () => {
    if (!cotizacion.cliente || !cotizacion.vendedor || !cotizacion.condicion_venta || detalle.length === 0 || !cotizacion.alicuota_iva) {
      enqueueSnackbar('Debe completar todos los campos del encabezado y agregar al menos un artículo.', { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      if (isEditMode) {
        // --- Lógica de Actualización ---
        const cotizacionData = {
          p_pedido_id: parseInt(cotizacionId, 10),
          p_cliente_id: cotizacion.cliente.id,
          p_vendedor_id: cotizacion.vendedor?.id,
          p_condicion_venta_id: cotizacion.condicion_venta.id,
          p_obra_id: cotizacion.obra?.id,
          p_lista_precios_id: cotizacion.lista_precios?.id,
          p_fecha_documento: cotizacion.fecha_documento,
          p_observaciones: cotizacion.observaciones,
          p_alicuota_iva_id: cotizacion.alicuota_iva.id,
          p_total: calculosTotales.totalGeneral,
          p_percepciones_ids: cotizacion.percepciones.map(p => p.id),
          p_detalle: detalle.map(item => ({ articulo_id: item.articulo.id, cantidad: item.cantidad, precio_unitario: item.precio_unitario }))
        };
        const { error } = await supabase.rpc('actualizar_pedido_venta', cotizacionData);
        if (error) throw error;
        enqueueSnackbar('Cotización actualizada con éxito.', { variant: 'success' });
      } else {
        // --- Lógica de Creación ---
        const cotizacionData = {
          p_cliente_id: cotizacion.cliente.id,
          p_vendedor_id: cotizacion.vendedor?.id,
          p_condicion_venta_id: cotizacion.condicion_venta.id,
          p_obra_id: cotizacion.obra?.id,
          p_lista_precios_id: cotizacion.lista_precios?.id,
          p_fecha_documento: cotizacion.fecha_documento,
          p_observaciones: cotizacion.observaciones,
          p_alicuota_iva_id: cotizacion.alicuota_iva.id,
          p_total: calculosTotales.totalGeneral,
          p_percepciones_ids: cotizacion.percepciones.map(p => p.id),
          p_detalle: detalle.map(item => ({ articulo_id: item.articulo.id, cantidad: item.cantidad, precio_unitario: item.precio_unitario }))
        };
        const { error } = await supabase.rpc('guardar_pedido_venta', cotizacionData);
        if (error) throw error;
        enqueueSnackbar('Cotización guardada con éxito.', { variant: 'success' });
      }
      navigate('/ventas/cotizaciones');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la cotización: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const obrasCliente = useMemo(() => {
    if (!cotizacion.cliente) return [];
    return cotizacion.cliente.obras || [];
  }, [cotizacion.cliente]);

  const filteredPopupArticulos = useMemo(() => {
    if (!buscadorSearchTerm) return articulosDisponibles;
    const term = buscadorSearchTerm.toLowerCase();
    return articulosDisponibles.filter(art =>
        (art.code && art.code.toLowerCase().includes(term)) ||
        (art.name && art.name.toLowerCase().includes(term)) ||
        (art.description && art.description.toLowerCase().includes(term))
    );
  }, [articulosDisponibles, buscadorSearchTerm]);

  const handleSelectArticuloFromBuscador = (articulo) => {
    handleArticuloChange(articulo);
    setArticuloInput(articulo ? `${articulo.code} - ${articulo.name}` : '');
    setBuscadorArticulosOpen(false);
  };

  const handleOpenBuscador = (e) => {
    e.stopPropagation();
    setBuscadorArticulosOpen(true);
    setBuscadorSearchTerm('');
  };

  const handleArticuloInputChange = (event, newInputValue) => {
    setArticuloInput(newInputValue);
    if (newInputValue.length >= 3) {
      const term = newInputValue.toLowerCase();
      const filtered = articulosDisponibles.filter(art => 
        (art.code && art.code.toLowerCase().includes(term)) || 
        (art.name && art.name.toLowerCase().includes(term))
      );
      setFilteredArticulosOptions(filtered);
    } else {
      setFilteredArticulosOptions([]);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          {isEditMode ? `Editando Cotización N° ${cotizacionId}` : 'Nueva Cotización'}
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/ventas/cotizaciones')} sx={{ mr: 2, minWidth: 120 }}>Volver</Button>
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSubmit} sx={{ minWidth: 120 }}>Guardar Cotización</Button>
        </Box>
      </Box>

      {/* --- ENCABEZADO --- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Autocomplete 
            options={clientes} 
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option ? [option.codigo, option.razon_social].filter(Boolean).join(' - ') : ''} 
            value={cotizacion.cliente}
            onChange={(_, newValue) => handleCotizacionChange('cliente', newValue)}
            renderInput={(params) => <TextField {...params} label="Cliente" required />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          {obrasCliente.length > 0 && (
            <Autocomplete 
              options={obrasCliente} 
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option ? [option.nombre, option.direccion].filter(Boolean).join(' - ') : ''} 
              value={cotizacion.obra}
              onChange={(_, newValue) => handleCotizacionChange('obra', newValue)}
              renderInput={(params) => <TextField {...params} label="Obra / Destino de Entrega" />}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Buildings size={18} style={{ marginRight: 8 }} />
                  {option.nombre} - {option.direccion}
                </Box>
              )}
            />
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          <Autocomplete 
            options={vendedores} 
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option?.nombre || ''} 
            value={cotizacion.vendedor}
            onChange={(_, newValue) => handleCotizacionChange('vendedor', newValue)}
            renderInput={(params) => <TextField {...params} label="Vendedor" required />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Autocomplete 
            options={condicionesVenta} 
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option?.nombre || ''}
            value={cotizacion.condicion_venta}
            onChange={(_, newValue) => handleCotizacionChange('condicion_venta', newValue)}
            renderInput={(params) => <TextField {...params} label="Condición de Venta" required />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Autocomplete 
            options={listasPrecios} 
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option?.nombre || ''}
            value={cotizacion.lista_precios}
            onChange={(_, newValue) => handleCotizacionChange('lista_precios', newValue)}
            renderInput={(params) => <TextField {...params} label="Lista de Precios" />}
          />
        </Grid>
        <Grid item xs={12} md={2}><TextField label="Fecha Cotización" type="date" name="fecha_documento" value={cotizacion.fecha_documento} onChange={(e) => handleCotizacionChange('fecha_documento', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} required /></Grid>
        <Grid item xs={12}><TextField label="Observaciones Generales" name="observaciones" value={cotizacion.observaciones} onChange={(e) => handleCotizacionChange('observaciones', e.target.value)} fullWidth multiline rows={2} /></Grid>
      </Grid>

      {cotizacion.cliente && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'action.hover' }}>
          <Typography variant="subtitle2" gutterBottom>Condiciones Fiscales del Cliente (Automático)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={alicuotas}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option?.nombre || ''}
                value={cotizacion.alicuota_iva}
                onChange={(_, newValue) => handleCotizacionChange('alicuota_iva', newValue)}
                renderInput={(params) => <TextField {...params} label="Alícuota de IVA" required />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={allPercepciones}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option?.nombre || ''}
                value={cotizacion.percepciones}
                onChange={(_, newValue) => handleCotizacionChange('percepciones', newValue)}
                renderInput={(params) => <TextField {...params} label="Percepciones Aplicadas" />}
                disableCloseOnSelect
              />
            </Grid>
          </Grid>
        </Paper>
      )}
      <Divider sx={{ my: 3 }} />

      {/* --- FORMULARIO DE ITEMS --- */}
      <Typography variant="h6" sx={{ mb: 2 }}>{editingIndex !== null ? 'Editando Artículo' : 'Agregar Artículos'}</Typography>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={filteredArticulosOptions}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option ? 
              `${option.code} - ${option.name}${option.variant_name ? ` - ${option.variant_name}` : ''}` 
              : ''}
            value={itemActual.articulo}
            onChange={(event, newValue) => { 
              handleArticuloChange(newValue);
            }}
            inputValue={articuloInput}
            onInputChange={handleArticuloInputChange}
            noOptionsText="Escriba 3 o más letras para buscar..."
            renderInput={(params) => <TextField {...params} label="Buscar Artículo..." required />}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            onClick={handleOpenBuscador}
            variant="outlined"
            sx={{ minWidth: 120, height: '100%' }}
            startIcon={<MagnifyingGlass />}
            fullWidth
          >
            Buscar
          </Button>
        </Grid>
        <Grid item xs={6} md={2}><TextField label="Cantidad" name="cantidad" type="number" value={itemActual.cantidad} onChange={(e) => setItemActual(prev => ({ ...prev, cantidad: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={6} md={2}><TextField label="Precio Unit." name="precio_unitario" type="number" value={itemActual.precio_unitario} onChange={(e) => setItemActual(prev => ({ ...prev, precio_unitario: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}>
          {editingIndex !== null ? (
            <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
              <Button variant="contained" color="primary" onClick={handleUpdateItem} fullWidth sx={{ minWidth: 120 }}>Actualizar</Button>
              <Button variant="outlined" onClick={handleCancelEdit} sx={{ minWidth: 'auto', p: 1 }}><XCircle /></Button>
            </Stack>
          ) : (
            <Button variant="contained" color="primary" startIcon={<Plus />} onClick={handleAddItem} fullWidth sx={{ minWidth: 120, height: '100%' }}>Agregar</Button>
          )}
        </Grid>
      </Grid>

      {/* --- TABLA DE DETALLE --- */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell>U.M.</TableCell>
              <TableCell align="right">Cantidad</TableCell><TableCell align="right">Precio Unit.</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detalleConCalculos.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No hay artículos en la cotización.</TableCell></TableRow>
            ) : (
              detalleConCalculos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.articulo?.code || 'N/A'}</TableCell>
                  <TableCell>{`${item.articulo?.name || 'Artículo no seleccionado'}${item.articulo?.variant_name ? ` - ${item.articulo.variant_name}` : ''}`}</TableCell>
                  <TableCell>{item.articulo?.unidad_medida || 'N/A'}</TableCell>
                  <TableCell align="right">{item.cantidad.toLocaleString('es-AR')}</TableCell>
                  <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleStartEdit(item.id)} color="primary" size="small"><PencilSimple /></IconButton>
                    <IconButton onClick={() => handleRemoveItem(item.id)} color="error" size="small"><Trash /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- TOTALES --- */}
      <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
        <Grid item xs={12} md={5}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Subtotal</TableCell>
                  <TableCell align="right">{formatCurrency(calculosTotales.subtotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>IVA ({cotizacion.alicuota_iva ? cotizacion.alicuota_iva.nombre : '...'})</TableCell>
                  <TableCell align="right">{formatCurrency(calculosTotales.montoIVA)}</TableCell>
                </TableRow>
                {cotizacion.percepciones.map(p => (
                  <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell align="right">{formatCurrency(calculosTotales.subtotal * (p.valor / 100))}</TableCell></TableRow>
                ))}
                <TableRow sx={{ '& > *': { fontWeight: 'bold', fontSize: '1.1rem' } }}>
                  <TableCell>Total General</TableCell>
                  <TableCell align="right">{formatCurrency(calculosTotales.totalGeneral)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* --- POPUP BUSCADOR DE ARTÍCULOS --- */}
      <Dialog open={buscadorArticulosOpen} onClose={() => setBuscadorArticulosOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Buscador de Artículos</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Buscar por código, nombre o descripción..."
            type="text"
            fullWidth
            variant="standard"
            value={buscadorSearchTerm}
            onChange={(e) => setBuscadorSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '10%' }}>Código</TableCell>
                  <TableCell sx={{ width: '30%' }}>Nombre</TableCell>
                  <TableCell sx={{ width: '30%' }}>Descripción</TableCell>
                  <TableCell align="right" sx={{ width: '10%' }}>Precio Especial</TableCell>
                  <TableCell align="center" sx={{ width: '10%' }}>Últ. Modificación</TableCell>
                  <TableCell sx={{ width: '5%' }} align="center">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPopupArticulos.map(articulo => {
                  // Lógica simplificada: siempre buscar el precio del artículo seleccionado
                  const precioInfo = preciosListaActual.get(articulo.id);
                  const precioEspecial = precioInfo?.precio;
                  const fechaModificacion = precioInfo?.fecha || articulo.created_at;
                  return (
                    <TableRow hover key={articulo.id}>
                      <TableCell>{articulo.code || 'N/A'}</TableCell>
                      <TableCell>{`${articulo.name || 'N/A'}${articulo.variant_name ? ` - ${articulo.variant_name}` : ''}`}</TableCell>
                      <TableCell>{articulo.description || ''}</TableCell>
                      <TableCell align="right">
                        {precioEspecial !== undefined
                          ? <Typography color="primary" component="b">{formatCurrency(precioEspecial)}</Typography>
                          : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                      </TableCell>
                      <TableCell align="center">{new Date(fechaModificacion).toLocaleDateString()}</TableCell>
                      <TableCell align="center"><Button size="small" onClick={() => handleSelectArticuloFromBuscador(articulo)}>Seleccionar</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuscadorArticulosOpen(false)} sx={{ minWidth: 120 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NuevaCotizacion;
