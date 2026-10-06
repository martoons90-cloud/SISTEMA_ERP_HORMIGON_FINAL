import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Breadcrumbs, Link
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';

const GestionTiposObra = () => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [tiposDeObra, setTiposDeObra] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchTiposDeObra = useCallback(async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('ven_tipos_obra').select('*').order('nombre');
          if (error) throw error;
          setTiposDeObra(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando tipos de obra: ${error.message}`, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchTiposDeObra();
    }, [fetchTiposDeObra]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Tipo de Obra' : 'Nuevo Tipo de Obra';
        setDialogConfig({ data, title });
        setCurrentItem(data ? { ...data } : { nombre: '' });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogConfig({ data: null, title: '' });
        setCurrentItem({});
    };

    const handleSave = async () => {
        try {
          const { error } = await supabase.from('ven_tipos_obra').upsert(currentItem);
          if (error) throw error;
          await fetchTiposDeObra();
          enqueueSnackbar('Tipo de obra guardado.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar el tipo de obra "${item.nombre}"?`)) {
          try {
            const { error } = await supabase.from('ven_tipos_obra').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso.');
                throw error;
            }
            await fetchTiposDeObra();
            enqueueSnackbar('Tipo de obra eliminado.', { variant: 'info' });
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
                <Typography color="text.primary">Gestión de Tipos de Obra</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Tipos de Obra</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nuevo Tipo de Obra
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tiposDeObra.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell>
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
                            <TextField autoFocus label="Nombre del Tipo de Obra" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
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

export default GestionTiposObra;
