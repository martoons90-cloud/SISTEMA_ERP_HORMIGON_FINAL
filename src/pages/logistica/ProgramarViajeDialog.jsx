import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button,
  Autocomplete, CircularProgress, Box, InputAdornment, IconButton, Paper,
  List, ListItem, ListItemButton, ListItemText, Typography, Divider, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  Switch, FormControlLabel
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { MagnifyingGlass, X, ListDashes, Factory } from 'phosphor-react';

const ProgramarViajeDialog = ({ open, onClose, onSave, isEdit, viajeToEdit, plantas, getRouteDetails }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pedidosProgramables, setPedidosProgramables] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  // Nuevo estado para manejar múltiples programaciones
  const [programaciones, setProgramaciones] = useState({});
  // --- NUEVO: Estado para el switch de descarga simultánea ---
  const [descargaSimultanea, setDescargaSimultanea] = useState(false);
  const [travelTimes, setTravelTimes] = useState({}); // { [detalleId]: { time: 45, loading: false } }

  useEffect(() => {
    if (open) {
      if (isEdit && viajeToEdit) {
        // Modo Edición: Cargar datos del viaje existente
        setSelectedPedido(viajeToEdit.pedido); // viajeToEdit.pedido.detalle.articulo no tiene 'id'
        setDescargaSimultanea(viajeToEdit.pedido?.descarga_en_simultaneo || false);
        const articuloDelViaje = viajeToEdit.pedido.detalle.find(d => d.articulo.id === viajeToEdit.articulo_id);
        // Para la edición, mantenemos el comportamiento simple de un solo viaje
        setProgramaciones({
          [articuloDelViaje.id]: {
            cantidad: viajeToEdit.cantidad,
            hora: viajeToEdit.hora_programada,
            fecha: viajeToEdit.fecha_programada,
            articulo: articuloDelViaje.articulo,
            pedido_id: viajeToEdit.pedido_id,
            articulo_id: viajeToEdit.articulo_id
          }
        });
      } else {
        // Modo Creación: Limpiar todo
        handleClose(false); // No llamar a onClose
      }
    } else {
      handleClose();
    }
  }, [open, isEdit, viajeToEdit]);

  // --- NUEVO: Efecto para actualizar el estado del switch cuando se selecciona un pedido ---
  useEffect(() => {
    if (selectedPedido) {
      setDescargaSimultanea(selectedPedido.descarga_en_simultaneo || false);
    }
  }, [selectedPedido]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      enqueueSnackbar('Ingrese un número de pedido o nombre de cliente para buscar.', { variant: 'info' });
      return;
    }
    setLoading(true);
    setSelectedPedido(null); // Limpiar selección anterior

    const { data, error } = await supabase
      .from('ven_pedidos_venta')
      .select('*, cliente:ven_clientes!inner(razon_social), detalle:ven_pedidos_venta_detalle!inner(*, articulo:stk_articulos!inner(id, name, code))')
      .in('estado_entrega', ['PENDIENTE', 'PARCIAL'])
      .or(`id::text.ilike.%${searchQuery}%,cliente.razon_social.ilike.%${searchQuery}%`, { foreignTable: 'cliente' });

    if (error) enqueueSnackbar('Error al buscar pedidos: ' + error.message, { variant: 'error' });
    else setPedidosProgramables(data || []);
    setLoading(false);
  };

  const fetchAllPedidos = async () => {
    setLoading(true);
    setSearchQuery(''); // Limpiar la búsqueda por texto para evitar confusiones
    setSelectedPedido(null); // Limpiar selección anterior

    const { data, error } = await supabase
      .from('ven_pedidos_venta')
      .select('*, cliente:ven_clientes!inner(razon_social), detalle:ven_pedidos_venta_detalle!inner(*, articulo:stk_articulos!inner(id, name, code))')
      .in('estado_entrega', ['PENDIENTE', 'PARCIAL'])
      .order('id', { ascending: false }); // Ordenar por más recientes

    if (error) enqueueSnackbar('Error al cargar todos los pedidos: ' + error.message, { variant: 'error' });
    else setPedidosProgramables(data || []);
    setLoading(false);
  };


  const articulosDelPedido = selectedPedido?.detalle.filter(
    item => (item.cantidad_entregada || 0) < item.cantidad
  ) || [];

  const handleProgramacionChange = async (detalleId, field, value, articulo) => {
    // Si el campo es 'planta_id', calculamos el tiempo de viaje
    if (field === 'planta_id' && value) {
      const planta = plantas.find(p => p.id === value);
      const obra = selectedPedido?.obra;

      if (planta?.latitud && planta?.longitud && obra?.latitud && obra?.longitud) {
        setTravelTimes(prev => ({ ...prev, [detalleId]: { loading: true, time: null } }));
        try {
          const startCoords = { lon: planta.longitud, lat: planta.latitud };
          const endCoords = { lon: obra.longitud, lat: obra.latitud };
          const details = await getRouteDetails(startCoords, endCoords);
          const durationMin = details?.duration ? Math.round(details.duration / 60) : null;
          setTravelTimes(prev => ({ ...prev, [detalleId]: { loading: false, time: durationMin } }));
        } catch (error) {
          console.error("Error al calcular la ruta:", error);
          setTravelTimes(prev => ({ ...prev, [detalleId]: { loading: false, time: null } }));
          enqueueSnackbar('No se pudo calcular el tiempo de viaje.', { variant: 'error' });
        }
      } else {
        // Limpiar si la planta o la obra no tienen coordenadas
        setTravelTimes(prev => ({ ...prev, [detalleId]: undefined }));
      }
    }

    setProgramaciones(prev => ({
      ...prev,
      [detalleId]: {
        ...prev[detalleId],
        [field]: value,
        articulo: articulo.articulo, // Guardamos el objeto articulo completo
        // Aseguramos que los IDs se mantengan al cambiar cualquier campo
        pedido_id: articulo.pedido_id,
        articulo_id: articulo.articulo_id
      }
    }));
  };

  const handleSave = async () => {
    if (isEdit) {
      // Lógica de edición para un solo viaje (simplificada)
      const detalleId = Object.keys(programaciones)[0];
      const prog = programaciones[detalleId];
      const viajeActualizado = {
        id: viajeToEdit.id,
        cantidad: parseFloat(prog.cantidad),
        fecha_programada: prog.fecha,
        hora_programada: prog.hora,
      };
      // Pasamos el objeto completo del pedido para que el logic pueda actualizarlo
      onSave({ ...viajeActualizado, pedido: { ...selectedPedido, descarga_en_simultaneo: descargaSimultanea } }, true);
    } else {
      // Lógica de creación para múltiples viajes

      // --- NUEVO: Actualizar el pedido con la bandera de descarga simultánea ANTES de crear los viajes ---
      try {
        const { error: updateError } = await supabase
          .from('ven_pedidos_venta')
          .update({ descarga_en_simultaneo: descargaSimultanea })
          .eq('id', selectedPedido.id);
        if (updateError) throw updateError;
      } catch (error) {
        enqueueSnackbar('Error al actualizar la opción de descarga simultánea: ' + error.message, { variant: 'error' });
        return; // Detener si no se puede actualizar el pedido
      }
      const nuevosViajes = Object.entries(programaciones)
        .map(([detalleId, prog]) => {
          const cantidadNum = parseFloat(prog.cantidad || 0);
          // Ahora también validamos que se haya seleccionado una planta para esta línea
          if (!cantidadNum || cantidadNum <= 0 || !prog.hora || !prog.planta_id) {
            return null; // Ignorar si no tiene cantidad, hora o planta
          }
          const itemOriginal = selectedPedido.detalle.find(d => d.id == detalleId);
          const cantidadPendiente = itemOriginal.cantidad - (itemOriginal.cantidad_entregada || 0);
          if (cantidadNum > cantidadPendiente) {
            enqueueSnackbar(`La cantidad para ${prog.articulo.name} excede lo pendiente.`, { variant: 'error' });
            throw new Error("Cantidad excede pendiente"); // Detener el guardado
          }
          return {
            pedido_id: prog.pedido_id,
            articulo_id: prog.articulo_id,
            cantidad: cantidadNum,
            fecha_programada: prog.fecha || new Date().toISOString().split('T')[0],
            planta_id: prog.planta_id,
            hora_programada: prog.hora,
          };
        })
        .filter(Boolean); // Eliminar nulos

      if (nuevosViajes.length === 0) {
        enqueueSnackbar('No se ha programado ninguna cantidad. Por favor, ingrese cantidades y horas.', { variant: 'warning' });
        return;
      }
      onSave(nuevosViajes, false);
    }
    handleClose();
  };

  const handleClose = (callOnClose = true) => {
    setSearchQuery('');
    setPedidosProgramables([]);
    setSelectedPedido(null);
    setTravelTimes({});
    setProgramaciones({});
    setDescargaSimultanea(false);
    if (callOnClose) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Programar Nuevo Viaje</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {!isEdit && (<Grid container spacing={2} alignItems="center" sx={{mb: 2}}>
            <Grid xs={12} sm>
              <TextField
                fullWidth
                label="Buscar por N° de Pedido o Cliente"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && <IconButton onClick={() => setSearchQuery('')} size="small"><X /></IconButton>}
                      <IconButton onClick={handleSearch} color="primary"><MagnifyingGlass /></IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid xs={12} sm="auto">
              <Button
                variant="outlined"
                startIcon={<ListDashes />}
                onClick={fetchAllPedidos}
                sx={{ height: '100%' }}
              >
                Ver Lista Completa
              </Button>
            </Grid>
          </Grid>)}

          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}

          {!isEdit && !loading && pedidosProgramables.length > 0 && !selectedPedido && (
            <Paper variant="outlined" sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {pedidosProgramables.map(pedido => (
                  <ListItemButton key={pedido.id} onClick={() => setSelectedPedido(pedido)}>
                    <ListItemText
                      primary={`Pedido N° ${String(pedido.id).padStart(6, '0')}`}
                      secondary={pedido.cliente.razon_social}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          {!isEdit && !loading && searchQuery && pedidosProgramables.length === 0 && (
            <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              No se encontraron pedidos pendientes o parcialmente entregados con ese criterio.
            </Typography>
          )}

          {selectedPedido && (
            <Box mt={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Resumen del Pedido N° {String(selectedPedido.id).padStart(6, '0')}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2"><strong>Cliente:</strong> {selectedPedido.cliente.razon_social}</Typography>
                    <Typography variant="body2"><strong>Fecha Pedido:</strong> {new Date(selectedPedido.created_at).toLocaleDateString()}</Typography>
                    <Typography variant="body2"><strong>Bomba:</strong> {selectedPedido.con_bomba ? 'Sí' : 'No'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4} textAlign={{ sm: 'right' }}>
                    <Chip label={`Facturación: ${selectedPedido.estado_facturacion || 'N/A'}`} size="small" sx={{ mr: 1, mb: 1 }} />
                    <Chip label={`Pago: ${selectedPedido.estado_pago || 'N/A'}`} size="small" sx={{ mb: 1 }} />
                  </Grid>
                  {/* --- NUEVO: Switch para descarga simultánea --- */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={descargaSimultanea}
                          onChange={(e) => setDescargaSimultanea(e.target.checked)}
                          name="descargaSimultanea"
                        />
                      }
                      label="Permitir descarga simultánea de camiones en obra para este pedido"
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Artículos del Pedido</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Hormigón</TableCell>
                          <TableCell align="right">Pedido</TableCell>
                          <TableCell align="right">Entregado</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Pendiente</TableCell>
                          <TableCell align="right" sx={{ width: '150px' }}>Cant. a Programar</TableCell>
                          <TableCell align="center" sx={{ width: '200px' }}>Planta Origen</TableCell>
                          <TableCell align="center" sx={{ width: '180px' }}>Fecha</TableCell>
                          <TableCell align="center" sx={{ width: '150px' }}>Hora</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPedido.detalle.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.articulo.name}</TableCell>
                            <TableCell align="right">{item.cantidad.toFixed(2)} m³</TableCell>
                            <TableCell align="right">{(item.cantidad_entregada || 0).toFixed(2)} m³</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{(item.cantidad - (item.cantidad_entregada || 0)).toFixed(2)} m³</TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                size="small"
                                variant="outlined"
                                sx={{ maxWidth: 130 }}
                                value={programaciones[item.id]?.cantidad || ''}
                                onChange={(e) => handleProgramacionChange(item.id, 'cantidad', e.target.value, item)}
                                inputProps={{ max: (item.cantidad - (item.cantidad_entregada || 0)), step: "0.5" }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                <Autocomplete
                                  options={plantas || []}
                                  getOptionLabel={(option) => option.nombre}
                                  size="small"
                                  sx={{ flexGrow: 1, maxWidth: 180 }}
                                  value={plantas.find(p => p.id === programaciones[item.id]?.planta_id) || null}
                                  onChange={(_, newValue) => {
                                    handleProgramacionChange(item.id, 'planta_id', newValue?.id || null, item)
                                  }}
                                  renderInput={(params) => (
                                    <TextField {...params} variant="outlined" />
                                  )}
                                />
                                {travelTimes[item.id]?.loading && <CircularProgress size={20} />}
                                {travelTimes[item.id]?.time !== null && !travelTimes[item.id]?.loading && (
                                  <Chip label={`~ ${travelTimes[item.id]?.time} min`} size="small" variant="outlined" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <TextField
                                type="date"
                                size="small"
                                variant="outlined"
                                sx={{ maxWidth: 160 }}
                                value={programaciones[item.id]?.fecha || new Date().toISOString().split('T')[0]}
                                onChange={(e) => handleProgramacionChange(item.id, 'fecha', e.target.value, item)}
                                InputLabelProps={{ shrink: true }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <TextField
                                type="time"
                                size="small"
                                variant="outlined"
                                sx={{ maxWidth: 130 }}
                                value={programaciones[item.id]?.hora || ''}
                                onChange={(e) => handleProgramacionChange(item.id, 'hora', e.target.value, item)}
                                InputLabelProps={{ shrink: true }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedPedido}>{isEdit ? 'Guardar Cambios' : 'Guardar Programación'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgramarViajeDialog;
