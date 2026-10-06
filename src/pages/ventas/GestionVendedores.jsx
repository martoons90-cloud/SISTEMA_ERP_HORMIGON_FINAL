import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Autocomplete, Breadcrumbs, Link
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';

const GestionVendedores = () => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [vendedores, setVendedores] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchVendedores = useCallback(async () => {
        try {
          const { data, error } = await supabase.from('ven_vendedores').select('*, user:users(id, email)').order('nombre');
          if (error) throw error;
          setVendedores(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando vendedores: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    const fetchSystemUsers = useCallback(async () => {
        try {
          const { data, error } = await supabase.from('view_users').select('id, email');
          if (error) throw error;
          setSystemUsers(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando usuarios del sistema: ${error.message}`, { variant: 'error' });
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        Promise.all([fetchVendedores(), fetchSystemUsers()]).then(() => {
            setLoading(false);
        });
    }, [fetchVendedores, fetchSystemUsers]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Vendedor' : 'Nuevo Vendedor';
        setDialogConfig({ data, title });
        const userData = data?.user ? { id: data.user.id, email: data.user.email } : null;
        setCurrentItem(data ? { ...data, user: userData } : { 
            nombre: '', apellido: '', sector: '', dni_cuil: '', 
            comision: 0, telefono: '', domicilio: '', user: null 
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogConfig({ data: null, title: '' });
        setCurrentItem({});
    };

    const handleSaveVendedor = async () => {
        try {
          const itemToSave = {
            id: currentItem.id,
            nombre: currentItem.nombre,
            apellido: currentItem.apellido,
            sector: currentItem.sector,
            dni_cuil: currentItem.dni_cuil,
            comision: currentItem.comision,
            telefono: currentItem.telefono,
            domicilio: currentItem.domicilio,
            user_id: currentItem.user?.id || null
          };
          const { error } = await supabase.from('ven_vendedores').upsert(itemToSave);
          if (error) throw error;
          await fetchVendedores();
          enqueueSnackbar('Vendedor guardado.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar vendedor: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDeleteVendedor = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar al vendedor "${item.nombre}"?`)) {
          try {
            const { error } = await supabase.from('ven_vendedores').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso.');
                throw error;
            }
            await fetchVendedores();
            enqueueSnackbar('Vendedor eliminado.', { variant: 'info' });
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
                <Typography color="text.primary">Gestión de Vendedores</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Vendedores</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nuevo Vendedor
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Código</TableCell>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Apellido</TableCell>
                                <TableCell>Usuario Vinculado</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vendedores.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.codigo}</TableCell>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.apellido}</TableCell>
                                    <TableCell>{item.user?.email || 'Sin vincular'}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleOpenDialog(item)}><PencilSimple /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDeleteVendedor(item)}><Trash /></IconButton>
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
                        <Grid item xs={12} sm={6}>
                            <TextField autoFocus label="Nombre del Vendedor" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Apellido" fullWidth value={currentItem.apellido || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, apellido: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="DNI / CUIL" fullWidth value={currentItem.dni_cuil || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, dni_cuil: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Sector" fullWidth value={currentItem.sector || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, sector: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Teléfono" fullWidth value={currentItem.telefono || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, telefono: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Comisión (%)" type="number" fullWidth value={currentItem.comision || 0} onChange={(e) => setCurrentItem(prev => ({ ...prev, comision: parseFloat(e.target.value) || 0 }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Domicilio" fullWidth value={currentItem.domicilio || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, domicilio: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={
                                    systemUsers.filter(user => 
                                    !vendedores.some(v => v.user_id === user.id && v.id !== currentItem.id)
                                    )
                                }
                                getOptionLabel={(option) => option.email || ''}
                                value={currentItem.user || null}
                                onChange={(_, newValue) => setCurrentItem(prev => ({ ...prev, user: newValue }))}
                                renderInput={(params) => <TextField {...params} label="Vincular a Usuario del Sistema" />}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSaveVendedor} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestionVendedores;
