import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Breadcrumbs, Link, Autocomplete
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';

const GestionLocalidades = () => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [localidades, setLocalidades] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchLocalidades = useCallback(async () => {
        try {
          const { data, error } = await supabase
            .from('ven_localidades')
            .select('*, provincia:ven_provincias(id, nombre)')
            .order('nombre');
          if (error) throw error;
          setLocalidades(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando localidades: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    const fetchProvincias = useCallback(async () => {
        try {
          const { data, error } = await supabase.from('ven_provincias').select('*').order('nombre');
          if (error) throw error;
          setProvincias(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando provincias: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchLocalidades(), fetchProvincias()]).then(() => {
            setLoading(false);
        });
    }, [fetchLocalidades, fetchProvincias]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Localidad' : 'Nueva Localidad';
        setDialogConfig({ data, title });
        setCurrentItem(data ? { ...data } : { nombre: '', codigo_postal: '', provincia_id: null, provincia: null });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogConfig({ data: null, title: '' });
        setCurrentItem({});
    };

    const handleSave = async () => {
        try {
          const itemToSave = {
            id: currentItem.id,
            nombre: currentItem.nombre,
            codigo_postal: currentItem.codigo_postal,
            provincia_id: currentItem.provincia?.id || null
          };
          const { error } = await supabase.from('ven_localidades').upsert(itemToSave);
          if (error) throw error;
          await fetchLocalidades();
          enqueueSnackbar('Localidad guardada.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar la localidad "${item.nombre}"?`)) {
          try {
            const { error } = await supabase.from('ven_localidades').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso.');
                throw error;
            }
            await fetchLocalidades();
            enqueueSnackbar('Localidad eliminada.', { variant: 'info' });
          } catch (error) {
            enqueueSnackbar(`Error al eliminar: ${error.message}`, { variant: 'error' });
          }
        }
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link component={RouterLink} underline="hover" color="inherit" to="/ventas/configuracion">
                    Configuración de Ventas
                </Link>
                <Typography color="text.primary">Gestión de Localidades</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Localidades</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nueva Localidad
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Código Postal</TableCell>
                                <TableCell>Provincia</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {localidades.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.codigo_postal}</TableCell>
                                    <TableCell>{item.provincia?.nombre || 'N/A'}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleOpenDialog(item)}><PencilSimple /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(item)}><Trash /></IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* --- DIÁLOGO PARA CRUD --- */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{dialogConfig.title}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={8}>
                            <TextField autoFocus label="Nombre de la Localidad" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Código Postal" fullWidth value={currentItem.codigo_postal || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, codigo_postal: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={provincias}
                                getOptionLabel={(option) => option.nombre || ''}
                                value={currentItem.provincia || null}
                                onChange={(_, newValue) => setCurrentItem(prev => ({ ...prev, provincia: newValue }))}
                                renderInput={(params) => <TextField {...params} label="Provincia" />}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestionLocalidades;