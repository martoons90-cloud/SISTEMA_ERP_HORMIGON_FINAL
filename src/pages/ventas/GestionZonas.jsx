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

const GestionZonas = () => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [zonas, setZonas] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchZonas = useCallback(async () => {
        try {
          const { data, error } = await supabase
            .from('ven_zonas')
            .select('*, localidad:ven_localidades(id, nombre, provincia:ven_provincias(nombre))')
            .order('nombre');
          if (error) throw error;
          setZonas(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando zonas: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    const fetchLocalidades = useCallback(async () => {
        try {
          const { data, error } = await supabase.from('ven_localidades').select('id, nombre').order('nombre');
          if (error) throw error;
          setLocalidades(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando localidades: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchZonas(), fetchLocalidades()]).then(() => {
            setLoading(false);
        });
    }, [fetchZonas, fetchLocalidades]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Zona / Barrio' : 'Nueva Zona / Barrio';
        setDialogConfig({ data, title });
        setCurrentItem(data ? { ...data } : { nombre: '', localidad_id: null, localidad: null });
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
            localidad_id: currentItem.localidad?.id || null
          };
          const { error } = await supabase.from('ven_zonas').upsert(itemToSave);
          if (error) throw error;
          await fetchZonas();
          enqueueSnackbar('Zona guardada.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar la zona "${item.nombre}"?`)) {
          try {
            const { error } = await supabase.from('ven_zonas').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso.');
                throw error;
            }
            await fetchZonas();
            enqueueSnackbar('Zona eliminada.', { variant: 'info' });
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
                <Typography color="text.primary">Gestión de Zonas / Barrios</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Zonas / Barrios</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nueva Zona
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Localidad</TableCell>
                                <TableCell>Provincia</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {zonas.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.localidad?.nombre || 'N/A'}</TableCell>
                                    <TableCell>{item.localidad?.provincia?.nombre || 'N/A'}</TableCell>
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
                        <Grid item xs={12}>
                            <TextField autoFocus label="Nombre de la Zona / Barrio" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={localidades}
                                getOptionLabel={(option) => option.nombre || ''}
                                value={currentItem.localidad || null}
                                onChange={(_, newValue) => setCurrentItem(prev => ({ ...prev, localidad: newValue }))}
                                renderInput={(params) => <TextField {...params} label="Localidad" />}
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

export default GestionZonas;