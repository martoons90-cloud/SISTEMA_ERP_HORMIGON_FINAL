import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Grid,
  FormControlLabel,
  Chip,
  Autocomplete,
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import GestionarMotivosDevolucion from './GestionarMotivosDevolucion'; // <-- RUTA CORREGIDA

const initialClasificacionState = { id: null, nombre: '', prefijo: '', color: '#808080' };
const initialCondicionState = { id: null, nombre: '' };

const ConfiguracionCompras = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);

  // Estados para Clasificaciones
  const [clasificaciones, setClasificaciones] = useState([]);
  const [clasificacionOpen, setClasificacionOpen] = useState(false);
  const [isClasificacionEdit, setIsClasificacionEdit] = useState(false);
  const [clasificacionActual, setClasificacionActual] = useState(initialClasificacionState);

  // Estados para Condiciones de Compra
  const [condiciones, setCondiciones] = useState([]);
  const [condicionOpen, setCondicionOpen] = useState(false);
  const [isCondicionEdit, setIsCondicionEdit] = useState(false);
  const [condicionActual, setCondicionActual] = useState(initialCondicionState);

  // Estados para Configuración General y Autorización
  const [usarColores, setUsarColores] = useState(false);
  const [requiereAutorizacion, setRequeriereAutorizacion] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [autorizadores, setAutorizadores] = useState([]);

  // Estados para Diálogos
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clasificacionesRes, condicionesRes, configRes, usersRes, autorizadoresRes] = await Promise.all([
        supabase.from('com_proveedores_clasificacion').select('*').order('nombre', { ascending: true }),
        supabase.from('com_condiciones_compra').select('*').order('nombre', { ascending: true }),
        supabase.from('sys_configuracion').select('clave, valor'),
        supabase.from('user_profiles_list').select('id, email, full_name').order('full_name', { ascending: true }),
        supabase.from('com_autorizadores').select('user_id')
      ]);

      if (clasificacionesRes.error) throw clasificacionesRes.error;
      setClasificaciones(clasificacionesRes.data);

      if (condicionesRes.error) throw condicionesRes.error;
      setCondiciones(condicionesRes.data);

      if (configRes.error) throw configRes.error;
      const configMap = new Map(configRes.data.map(c => [c.clave, c.valor]));
      setUsarColores(configMap.get('compras_usar_colores_clasificacion') === 'true');
      setRequeriereAutorizacion(configMap.get('compras_requiere_autorizacion') === 'true');

      if (usersRes.error) throw usersRes.error;
      setAllUsers(usersRes.data);

      if (autorizadoresRes.error) throw autorizadoresRes.error;
      const autorizadoresActuales = autorizadoresRes.data
        .map(a => usersRes.data.find(u => u.id === a.user_id))
        .filter(Boolean);
      setAutorizadores(autorizadoresActuales);

    } catch (error) {
      enqueueSnackbar(`Error cargando datos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSwitch = async (clave, nuevoValor) => {
    const setter = {
      'compras_usar_colores_clasificacion': setUsarColores,
      'compras_requiere_autorizacion': setRequeriereAutorizacion,
    }[clave];

    setter(nuevoValor);

    try {
      const { error } = await supabase.from('sys_configuracion').update({ valor: nuevoValor.toString() }).eq('clave', clave);
      if (error) throw error;
      enqueueSnackbar('Configuración guardada.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Error guardando configuración: ${error.message}`, { variant: 'error' });
      setter(!nuevoValor);
    }
  };

  const handleSaveAutorizadores = async () => {
    setLoading(true);
    try {
      await supabase.from('com_autorizadores').delete().neq('id', 0);

      if (autorizadores.length > 0) {
        const dataToInsert = autorizadores.map(user => ({ user_id: user.id, user_email: user.email }));
        const { error: insertError } = await supabase.from('com_autorizadores').insert(dataToInsert);
        if (insertError) throw insertError;
      }
      enqueueSnackbar('Lista de autorizadores guardada con éxito.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Error guardando autorizadores: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClasificacion = async () => {
    if (!clasificacionActual.nombre || !clasificacionActual.prefijo) {
      enqueueSnackbar('Nombre y Prefijo son obligatorios.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { id, created_at, ...dataToSave } = clasificacionActual;
      const { error } = isClasificacionEdit
        ? await supabase.from('com_proveedores_clasificacion').update(dataToSave).eq('id', id)
        : await supabase.from('com_proveedores_clasificacion').insert([dataToSave]);
      if (error) throw error;
      enqueueSnackbar(`Clasificación ${isClasificacionEdit ? 'actualizada' : 'creada'} con éxito.`, { variant: 'success' });
      setClasificacionOpen(false);
      fetchData();
    } catch (error) {
      enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCondicion = async () => {
    if (!condicionActual.nombre) {
      enqueueSnackbar('El nombre es obligatorio.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { id, created_at, ...dataToSave } = condicionActual;
      const { error } = isCondicionEdit
        ? await supabase.from('com_condiciones_compra').update(dataToSave).eq('id', id)
        : await supabase.from('com_condiciones_compra').insert([dataToSave]);
      if (error) throw error;
      enqueueSnackbar(`Condición ${isCondicionEdit ? 'actualizada' : 'creada'} con éxito.`, { variant: 'success' });
      setCondicionOpen(false);
      fetchData();
    } catch (error) {
      enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (item, type) => {
    setItemToDelete({ data: item, type: type });
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setItemToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    const { type, data } = itemToDelete;
    const table = type === 'clasificacion' ? 'com_proveedores_clasificacion' : 'com_condiciones_compra';
    
    try {
      const { error } = await supabase.from(table).delete().eq('id', data.id);
      if (error) throw error;
      enqueueSnackbar(`${type === 'clasificacion' ? 'Clasificación' : 'Condición'} eliminada con éxito.`, { variant: 'success' });
      closeDeleteConfirm();
      fetchData();
    } catch (error) {
      enqueueSnackbar(`Error al eliminar: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" component="h1" fontWeight="bold">Configuración de Compras</Typography>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Flujo de Autorización de Órdenes de Compra</Typography>
          <FormControlLabel
            control={<Switch checked={requiereAutorizacion} onChange={(e) => handleConfigSwitch('compras_requiere_autorizacion', e.target.checked)} />}
            label="Requerir autorización manual para Órdenes de Compra"
          />
          {requiereAutorizacion && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Usuarios Autorizadores</Typography>
              <Autocomplete
                multiple
                options={allUsers}
                getOptionLabel={(option) => option.full_name || option.email}
                value={autorizadores}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(event, newValue) => setAutorizadores(newValue)}
                renderInput={(params) => <TextField {...params} variant="outlined" label="Seleccionar usuarios" />}
              />
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveAutorizadores} disabled={loading}>
                Guardar Autorizadores
              </Button>
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Clasificación de Proveedores</Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => { setIsClasificacionEdit(false); setClasificacionActual(initialClasificacionState); setClasificacionOpen(true); }} sx={{ mb: 2 }}>Nueva Clasificación</Button>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Prefijo</TableCell><TableCell>Color</TableCell><TableCell align="center">Acciones</TableCell></TableRow></TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow> :
                  clasificaciones.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.prefijo}</TableCell>
                      <TableCell><Chip label={item.color} size="small" sx={{ backgroundColor: item.color, color: '#fff', textShadow: '1px 1px 2px #000' }} /></TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => { setIsClasificacionEdit(true); setClasificacionActual(item); setClasificacionOpen(true); }}><PencilSimple /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => openDeleteConfirm(item, 'clasificacion')}><Trash /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Condiciones de Compra</Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => { setIsCondicionEdit(false); setCondicionActual(initialCondicionState); setCondicionOpen(true); }} sx={{ mb: 2 }}>Nueva Condición</Button>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell align="center">Acciones</TableCell></TableRow></TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={2} align="center"><CircularProgress /></TableCell></TableRow> :
                  condiciones.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => { setIsCondicionEdit(true); setCondicionActual(item); setCondicionOpen(true); }}><PencilSimple /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => openDeleteConfirm(item, 'condicion')}><Trash /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* --- NUEVA SECCIÓN PARA MOTIVOS DE DEVOLUCIÓN --- */}
      <Grid item xs={12} md={6}>
        <GestionarMotivosDevolucion />
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Ajustes Visuales</Typography>
          <FormControlLabel control={<Switch checked={usarColores} onChange={(e) => handleConfigSwitch('compras_usar_colores_clasificacion', e.target.checked)} />} label="Usar colores por clasificación en tablas de proveedores" />
        </Paper>
      </Grid>

      <Dialog open={clasificacionOpen} onClose={() => setClasificacionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isClasificacionEdit ? 'Editar Clasificación' : 'Nueva Clasificación'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField name="nombre" label="Nombre" fullWidth value={clasificacionActual.nombre} onChange={(e) => setClasificacionActual(p => ({ ...p, nombre: e.target.value }))} required /></Grid>
            <Grid item xs={12} sm={6}><TextField name="prefijo" label="Prefijo (3 letras)" fullWidth value={clasificacionActual.prefijo} onChange={(e) => setClasificacionActual(p => ({ ...p, prefijo: e.target.value }))} required inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }} /></Grid>
            <Grid item xs={12} sm={6}><TextField name="color" label="Color" type="color" fullWidth value={clasificacionActual.color} onChange={(e) => setClasificacionActual(p => ({ ...p, color: e.target.value }))} sx={{ '& input[type="color"]': { height: '38px', p: '1px 2px' } }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setClasificacionOpen(false)}>Cancelar</Button><Button onClick={handleSaveClasificacion} variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : 'Guardar'}</Button></DialogActions>
      </Dialog>

      <Dialog open={condicionOpen} onClose={() => setCondicionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isCondicionEdit ? 'Editar Condición' : 'Nueva Condición'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" name="nombre" label="Nombre de la Condición" type="text" fullWidth variant="outlined" value={condicionActual.nombre} onChange={(e) => setCondicionActual(p => ({ ...p, nombre: e.target.value }))} required />
        </DialogContent>
        <DialogActions><Button onClick={() => setCondicionOpen(false)}>Cancelar</Button><Button onClick={handleSaveCondicion} variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : 'Guardar'}</Button></DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar "<strong>{itemToDelete?.data.nombre}</strong>"?
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={closeDeleteConfirm}>Cancelar</Button><Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : 'Eliminar'}</Button></DialogActions>
      </Dialog>
    </Grid>
  );
};

export default ConfiguracionCompras;
