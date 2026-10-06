import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Autocomplete,
  Grid, Divider, Chip, List, ListItem, ListItemText, ListItemIcon, Stack, Tabs, Tab,
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash, Buildings, Eye } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const Clientes = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ habilitarObras: true });
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el diálogo de Cliente
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCliente, setCurrentCliente] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Estados para la gestión de Obras dentro del diálogo
  const [obraActual, setObraActual] = useState({ id: null, nombre: '', direccion: '', tipo_obra: null, responsable: '', telefono_responsable: '' });
  const [editingObraIndex, setEditingObraIndex] = useState(null);
  
  // Estados para los selectores
  const [alicuotas, setAlicuotas] = useState([]);
  const [percepciones, setPercepciones] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [tiposDeObra, setTiposDeObra] = useState([]);
  const [condicionesIVA, setCondicionesIVA] = useState([]);
  const [categoriasCliente, setCategoriasCliente] = useState([]);

  const fetchCatalogos = useCallback(async () => {
    const catalogosConfig = [
      { table: 'ven_alicuotas_iva', setter: setAlicuotas },
      { table: 'ven_percepciones_venta', setter: setPercepciones },
      { table: 'ven_provincias', setter: setProvincias },
      { table: 'ven_localidades', setter: setLocalidades },
      { table: 'ven_zonas', setter: setZonas },
      { table: 'ven_tipos_obra', setter: setTiposDeObra },
      { table: 'ven_condiciones_iva', setter: setCondicionesIVA },
      { table: 'ven_categorias_cliente', setter: setCategoriasCliente }
    ];

    const promises = catalogosConfig.map(config => supabase.from(config.table).select('*'));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      const config = catalogosConfig[index];
      if (result.status === 'fulfilled' && !result.value.error) {
        config.setter(result.value.data || []);
      } else if (result.status === 'fulfilled' && result.value.error) {
        console.warn(`Advertencia al cargar '${config.table}': ${result.value.error.message}. Es posible que la tabla no exista.`);
      }
    });
  }, [enqueueSnackbar]);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const { data: clientesData, error: clientesError } = await supabase
        .from('ven_clientes')
        .select('*, localidad:ven_localidades!localidad_id(nombre), provincia:ven_provincias!provincia_id(nombre)')
        .order('razon_social');
      if (clientesError) throw clientesError;
      setClientes(clientesData || []);
    } catch (error) {
      enqueueSnackbar(`Error cargando clientes: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchCatalogos();
      await fetchClientes();
    };
    fetchInitialData();
  }, [fetchCatalogos, fetchClientes]);

  const handleOpenDialog = async (cliente = null, viewOnly = false) => {
    setTabValue(0);
    setIsViewOnly(viewOnly);
    if (cliente) {
      setIsEdit(true);
      const { data: fullCliente, error } = await supabase
        .from('ven_clientes')
        .select('*, obras:ven_clientes_obras(*), percepciones:ven_clientes_percepciones(percepcion_id)')
        .eq('id', cliente.id)
        .single();
      
      if (error) {
        enqueueSnackbar(`Error al cargar el cliente: ${error.message}`, { variant: 'error' });
        return;
      }
      
      setCurrentCliente({
        ...fullCliente,
        provincia: provincias.find(p => p.id === fullCliente.provincia_id) || null,
        localidad: localidades.find(l => l.id === fullCliente.localidad_id) || null,
        zona: zonas.find(z => z.id === fullCliente.zona_id) || null,
        categoria: categoriasCliente.find(c => c.id === fullCliente.categoria_cliente_id) || null,
        alicuota_iva: alicuotas.find(a => a.id === fullCliente.alicuota_iva_id) || null,
        condicion_iva: condicionesIVA.find(c => c.id === fullCliente.condicion_iva_id) || null,
        percepciones: fullCliente.percepciones?.map(p => percepciones.find(perc => perc.id === p.percepcion_id)).filter(Boolean) || [],
        obras: fullCliente.obras.map(o => ({ ...o, tipo_obra: tiposDeObra.find(to => to.id === o.tipo_obra_id) || null }))
      });
    } else {
      setIsEdit(false);
      const { data: nextCode, error } = await supabase.rpc('get_siguiente_codigo_cliente');
      if (error) {
        enqueueSnackbar('Error al generar código de cliente.', { variant: 'warning' });
      }
      setCurrentCliente({ id: null, codigo: nextCode || '', razon_social: '', nombre_fantasia: '', cuit: '', dni: '', domicilio: '', localidad: null, provincia: null, zona: null, telefono1: '', telefono2: '', email: '', categoria: null, obras: [], alicuota_iva: null, percepciones: [], fecha_alta: new Date().toISOString().split('T')[0], condicion_iva: null });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentCliente(null);
    setEditingObraIndex(null);
    setObraActual({ id: null, nombre: '', direccion: '', tipo_obra: null, responsable: '', telefono_responsable: '' });
    setIsViewOnly(false);
  };

  const handleSave = async () => {
    if (!currentCliente.razon_social || !currentCliente.cuit || !currentCliente.condicion_iva) {
      enqueueSnackbar('Razón Social, CUIT y Condición de IVA son obligatorios.', { variant: 'error' });
      return;
    }

    const params = {
      p_cliente_id: currentCliente.id || null,
      p_codigo: currentCliente.codigo || null,
      p_razon_social: currentCliente.razon_social || null,
      p_nombre_fantasia: currentCliente.nombre_fantasia || null,
      p_cuit: currentCliente.cuit || null,
      p_dni: currentCliente.dni || null,
      p_domicilio: currentCliente.domicilio || null,
      p_localidad_id: currentCliente.localidad?.id || null,
      p_provincia_id: currentCliente.provincia?.id || null,
      p_zona_id: currentCliente.zona?.id || null,
      p_telefono1: currentCliente.telefono1 || null,
      p_telefono2: currentCliente.telefono2 || null,
      p_email: currentCliente.email || null,
      p_categoria_cliente_id: currentCliente.categoria?.id || null,
      p_alicuota_iva_id: currentCliente.alicuota_iva?.id || null,
      p_condicion_iva_id: currentCliente.condicion_iva?.id || null,
      p_obras: currentCliente.obras.map(o => ({ id: (typeof o.id === 'number' && o.id > 0) ? o.id : null, nombre: o.nombre, direccion: o.direccion, tipo_obra_id: o.tipo_obra?.id, responsable: o.responsable, telefono_responsable: o.telefono_responsable })),
      p_percepciones_ids: currentCliente.percepciones?.map(p => p.id) || []
    };

    const { error } = await supabase.rpc('guardar_cliente_v2', params);

    if (error) {
      enqueueSnackbar(`Error al guardar cliente: ${error.message}`, { variant: 'error' });
      return;
    }

    enqueueSnackbar(`Cliente ${isEdit ? 'actualizado' : 'creado'} con éxito.`, { variant: 'success' });
    await fetchClientes();
    await fetchCatalogos();
    handleCloseDialog();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      const { error } = await supabase.from('ven_clientes').delete().eq('id', id);
      if (error) {
        enqueueSnackbar(`Error al eliminar cliente: ${error.message}`, { variant: 'error' });
      } else {
        setClientes(prev => prev.filter(c => c.id !== id));
        enqueueSnackbar('Cliente eliminado con éxito.', { variant: 'info' });
      }
    }
  };

  const handleAddObra = () => {
    if (!obraActual.nombre) {
      enqueueSnackbar('El nombre de la obra es obligatorio.', { variant: 'warning' });
      return;
    }
    setCurrentCliente(prev => ({
      ...prev,
      obras: [...prev.obras, { ...obraActual, id: `new_${Date.now()}` }]
    }));
    setObraActual({ id: null, nombre: '', direccion: '', tipo_obra: null, responsable: '', telefono_responsable: '' });
  };

  const handleRemoveObra = (obraId) => {
    setCurrentCliente(prev => ({
      ...prev,
      obras: prev.obras.filter(o => o.id !== obraId)
    }));
  };

  const handleStartEditObra = (obra, index) => {
    setEditingObraIndex(index);
    setObraActual(obra);
  };

  const handleUpdateObra = () => {
    const updatedObras = [...currentCliente.obras];
    updatedObras[editingObraIndex] = obraActual;
    setCurrentCliente(prev => ({ ...prev, obras: updatedObras }));
    setEditingObraIndex(null);
    setObraActual({ id: null, nombre: '', direccion: '', tipo_obra: null, responsable: '', telefono_responsable: '' });
  };

  const handleCancelEditObra = () => {
    setEditingObraIndex(null);
    setObraActual({ id: null, nombre: '', direccion: '', tipo_obra: null, responsable: '', telefono_responsable: '' });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredClientes = clientes.filter(cliente => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      (cliente.codigo && cliente.codigo.toLowerCase().includes(term)) ||
      (cliente.razon_social && cliente.razon_social.toLowerCase().includes(term)) ||
      (cliente.nombre_fantasia && cliente.nombre_fantasia.toLowerCase().includes(term)) ||
      (cliente.cuit && cliente.cuit.toLowerCase().includes(term))
    );
  });

  const filteredLocalidades = useMemo(() => {
    if (!currentCliente?.provincia?.id) {
      return [];
    }
    return localidades.filter(l => l.provincia_id === currentCliente.provincia.id);
  }, [currentCliente?.provincia, localidades]);

  const filteredZonas = useMemo(() => {
    if (!currentCliente?.localidad?.id) {
      return [];
    }
    return zonas.filter(z => z.localidad_id === currentCliente.localidad.id);
  }, [currentCliente?.localidad, zonas]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Clientes
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
          Nuevo Cliente
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Buscar por código, razón social, fantasía o CUIT"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Razón Social</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Localidad</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : (
              filteredClientes.map((cliente) => (
                <TableRow key={cliente.id} hover>
                  <TableCell>{cliente.codigo}</TableCell>
                  <TableCell>{cliente.razon_social}</TableCell>
                  <TableCell>{cliente.cuit}</TableCell>
                  <TableCell>{cliente.localidad?.nombre}</TableCell>
                  <TableCell>{cliente.telefono1}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleOpenDialog(cliente, true)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(cliente)}>
                        <PencilSimple />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(cliente.id)}>
                        <Trash />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isViewOnly ? 'Detalle del Cliente' : (isEdit ? 'Editar Cliente' : 'Nuevo Cliente')}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="pestañas de cliente">
              <Tab label="Datos Generales" />
              <Tab label="Facturación" />
              <Tab label="Obras / Destinos" disabled={!config.habilitarObras} />
            </Tabs>
          </Box>

          <Box role="tabpanel" hidden={tabValue !== 0} sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} md={2}><TextField label="Código Cliente" value={currentCliente?.codigo || ''} fullWidth disabled /></Grid>
              <Grid item xs={12} sm={4} md={2}><TextField label="Fecha de Alta" value={currentCliente?.fecha_alta || ''} fullWidth disabled /></Grid>
              <Grid item xs={12} sm={4} md={8}><TextField label="Razón Social" value={currentCliente?.razon_social || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, razon_social: e.target.value }))} fullWidth required disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="Nombre de Fantasía" value={currentCliente?.nombre_fantasia || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, nombre_fantasia: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="CUIT" value={currentCliente?.cuit || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, cuit: e.target.value }))} fullWidth required disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="DNI" value={currentCliente?.dni || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, dni: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Domicilio Principal" /></Divider></Grid>
              <Grid item xs={12} md={6}><TextField label="Dirección" value={currentCliente?.domicilio || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, domicilio: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={3}><Autocomplete options={provincias} getOptionLabel={(o) => o.nombre} value={currentCliente?.provincia || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, provincia: v, localidad: null, zona: null }))} renderInput={(params) => <TextField {...params} label="Provincia" />} disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={3}><Autocomplete options={filteredLocalidades} getOptionLabel={(o) => o.nombre} value={currentCliente?.localidad || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, localidad: v, zona: null }))} renderInput={(params) => <TextField {...params} label="Localidad" />} disabled={isViewOnly || !currentCliente?.provincia} /></Grid>
              <Grid item xs={12} sm={6} md={4}><Autocomplete options={filteredZonas} getOptionLabel={(o) => o.nombre} value={currentCliente?.zona || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, zona: v }))} renderInput={(params) => <TextField {...params} label="Zona / Barrio" />} disabled={isViewOnly || !currentCliente?.localidad} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="Teléfono 1" value={currentCliente?.telefono1 || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, telefono1: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="Teléfono 2" value={currentCliente?.telefono2 || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, telefono2: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField label="Email" type="email" value={currentCliente?.email || ''} onChange={(e) => setCurrentCliente(p => ({ ...p, email: e.target.value }))} fullWidth disabled={isViewOnly} /></Grid>
              <Grid item xs={12} sm={6} md={4}><Autocomplete options={categoriasCliente} getOptionLabel={(o) => o.nombre} value={currentCliente?.categoria || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, categoria: v }))} renderInput={(params) => <TextField {...params} label="Categoría Cliente" />} disabled={isViewOnly} /></Grid>
            </Grid>
          </Box>

          <Box role="tabpanel" hidden={tabValue !== 1} sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete options={condicionesIVA} getOptionLabel={(o) => o.nombre} value={currentCliente?.condicion_iva || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, condicion_iva: v }))} renderInput={(params) => <TextField {...params} label="Condición de IVA" required />} disabled={isViewOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete options={alicuotas} getOptionLabel={(o) => o.nombre} value={currentCliente?.alicuota_iva || null} onChange={(_, v) => setCurrentCliente(p => ({ ...p, alicuota_iva: v }))} renderInput={(params) => <TextField {...params} label="Alícuota IVA por defecto" />} disabled={isViewOnly} />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete multiple options={percepciones} getOptionLabel={(o) => o.nombre} value={currentCliente?.percepciones || []} onChange={(_, v) => setCurrentCliente(p => ({ ...p, percepciones: v }))} renderInput={(params) => <TextField {...params} label="Percepciones por defecto" />} disableCloseOnSelect disabled={isViewOnly} />
              </Grid>
            </Grid>
          </Box>

          <Box role="tabpanel" hidden={tabValue !== 2} sx={{ pt: 3 }}>
            {currentCliente && (
              <>
                {!isViewOnly && (
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}><TextField label="Nombre de la Obra" value={obraActual.nombre} onChange={(e) => setObraActual(p => ({...p, nombre: e.target.value}))} fullWidth size="small" required /></Grid>
                    <Grid item xs={12} sm={6} md={3}><TextField label="Dirección" value={obraActual.direccion} onChange={(e) => setObraActual(p => ({...p, direccion: e.target.value}))} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={2}><Autocomplete options={tiposDeObra} getOptionLabel={(o) => o.nombre} value={obraActual.tipo_obra || null} onChange={(_, v) => setObraActual(p => ({...p, tipo_obra: v}))} renderInput={(params) => <TextField {...params} label="Tipo" size="small" />} /></Grid>
                    <Grid item xs={12} sm={6} md={2}><TextField label="Responsable" value={obraActual.responsable || ''} onChange={(e) => setObraActual(p => ({...p, responsable: e.target.value}))} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={2}><TextField label="Tel. Responsable" value={obraActual.telefono_responsable || ''} onChange={(e) => setObraActual(p => ({...p, telefono_responsable: e.target.value}))} fullWidth size="small" /></Grid>
                    <Grid item xs={12}>
                      {editingObraIndex !== null ? (
                        <Stack direction="row" spacing={1}>
                          <Button onClick={handleUpdateObra} variant="contained" size="small">Actualizar Obra</Button>
                          <Button onClick={handleCancelEditObra} variant="outlined" size="small">Cancelar</Button>
                        </Stack>
                      ) : (
                        <Button onClick={handleAddObra} variant="contained" startIcon={<PlusCircle />}>Agregar Obra</Button>
                      )}
                    </Grid>
                  </Grid>
                )}

                <List dense sx={{ mt: 2, maxHeight: 250, overflow: 'auto', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {currentCliente.obras?.length > 0 ? currentCliente.obras.map((obra, index) => (
                    <ListItem
                      key={obra.id}
                      secondaryAction={
                        !isViewOnly && (
                          <>
                            <IconButton edge="end" aria-label="edit" onClick={() => handleStartEditObra(obra, index)}><PencilSimple /></IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveObra(obra.id)}><Trash /></IconButton>
                          </>
                        )
                      }
                    >
                      <ListItemIcon><Buildings /></ListItemIcon>
                      <ListItemText 
                        primary={`${obra.nombre} (${obra.tipo_obra?.nombre || 'Sin tipo'})`} 
                        secondary={`${obra.direccion || 'Sin dirección'} - Contacto: ${obra.responsable || 'N/A'} (${obra.telefono_responsable || 'N/A'})`} 
                      />
                    </ListItem>
                  )) : (
                    <ListItem><ListItemText primary="Este cliente no tiene obras asignadas." align="center" /></ListItem>
                  )}
                </List>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{isViewOnly ? 'Cerrar' : 'Cancelar'}</Button>
          {!isViewOnly && (
            <Button onClick={handleSave} variant="contained">Guardar</Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Clientes;
