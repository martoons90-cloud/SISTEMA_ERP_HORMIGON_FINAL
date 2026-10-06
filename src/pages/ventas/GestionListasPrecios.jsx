import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Breadcrumbs, Link, Chip, Switch, FormControlLabel
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash, ListNumbers } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const GestionListasPrecios = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [listas, setListas] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchListas = useCallback(async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('ven_listas_precios').select('*').order('nombre');
          if (error) throw error;
          setListas(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando listas de precios: ${error.message}`, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchListas();
    }, [fetchListas]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Lista de Precios' : 'Nueva Lista de Precios';
        setDialogConfig({ data, title });
        
        const itemData = data ? { 
            ...data,
            valida_desde: data.valida_desde ? data.valida_desde.split('T')[0] : '',
            valida_hasta: data.valida_hasta ? data.valida_hasta.split('T')[0] : ''
        } : { nombre: '', descripcion: '', moneda: 'ARS', activa: true, valida_desde: '', valida_hasta: '' };
        
        setCurrentItem(itemData);
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
              ...currentItem,
              valida_desde: currentItem.valida_desde || null,
              valida_hasta: currentItem.valida_hasta || null
          };
          const { error } = await supabase.from('ven_listas_precios').upsert(itemToSave);
          if (error) throw error;
          await fetchListas();
          enqueueSnackbar('Lista de precios guardada.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar la lista "${item.nombre}"? Esto podría eliminar todos los precios asociados.`)) {
          try {
            const { error } = await supabase.from('ven_listas_precios').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso por un cliente.');
                throw error;
            }
            await fetchListas();
            enqueueSnackbar('Lista de precios eliminada.', { variant: 'info' });
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
                <Typography color="text.primary">Gestión de Listas de Precios</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Listas de Precios</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nueva Lista
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell>Vigencia</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {listas.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{item.nombre}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell>
                                        {item.valida_desde ? new Date(item.valida_desde + 'T00:00:00').toLocaleDateString() : 'N/A'} - {item.valida_hasta ? new Date(item.valida_hasta + 'T00:00:00').toLocaleDateString() : 'Indefinida'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={item.activa ? 'Activa' : 'Inactiva'} color={item.activa ? 'success' : 'default'} size="small" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Gestionar Precios">
                                            <IconButton size="small" color="primary" component={RouterLink} to={`/ventas/listas-precios/${item.id}`}><ListNumbers /></IconButton>
                                        </Tooltip>
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
                        <Grid xs={12}>
                            <TextField autoFocus label="Nombre de la Lista" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
                        </Grid>
                        <Grid xs={12}>
                            <TextField label="Descripción" fullWidth multiline rows={2} value={currentItem.descripcion || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, descripcion: e.target.value }))} />
                        </Grid>
                        <Grid xs={12} sm={6}>
                            <TextField label="Válida Desde" type="date" InputLabelProps={{ shrink: true }} fullWidth value={currentItem.valida_desde || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, valida_desde: e.target.value }))} />
                        </Grid>
                        <Grid xs={12} sm={6}>
                            <TextField label="Válida Hasta" type="date" InputLabelProps={{ shrink: true }} fullWidth value={currentItem.valida_hasta || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, valida_hasta: e.target.value }))} />
                        </Grid>
                        <Grid xs={12}>
                            <FormControlLabel control={<Switch checked={!!currentItem.activa} onChange={(e) => setCurrentItem(prev => ({ ...prev, activa: e.target.checked }))} />} label="Lista activa" />
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

export default GestionListasPrecios;