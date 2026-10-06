import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Breadcrumbs, Link,
  FormControlLabel, Switch
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { Link as RouterLink } from 'react-router-dom';

const GestionTalonarios = () => {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [talonarios, setTalonarios] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ data: null, title: '' });
    const [currentItem, setCurrentItem] = useState({});

    // Fetching logic
    const fetchTalonarios = useCallback(async () => {
        setLoading(true);
        try { 
          const { data, error } = await supabase.from('ven_talonarios').select('*').order('punto_venta').order('letra');
          if (error) throw error;
          setTalonarios(data || []);
        } catch (error) {
          enqueueSnackbar(`Error cargando talonarios: ${error.message}`, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchTalonarios();
    }, [fetchTalonarios]);

    // Dialog and save/delete logic
    const handleOpenDialog = (data = null) => {
        const title = data ? 'Editar Talonario' : 'Nuevo Talonario';
        setDialogConfig({ data, title });
        setCurrentItem(data ? { ...data } : { nombre: '', punto_venta: '', letra: '', es_fiscal: true });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogConfig({ data: null, title: '' });
        setCurrentItem({});
    };

    const handleSave = async () => {
        try {
          let itemToSave = { 
            ...currentItem,
            punto_venta: parseInt(currentItem.punto_venta) || 0,
            letra: currentItem.letra?.toUpperCase() || ''
          };

          // Si es un item nuevo (no tiene id), nos aseguramos de no enviar la propiedad 'id'.
          if (!itemToSave.id) {
            delete itemToSave.id;
          }

          const { error } = await supabase.from('ven_talonarios').upsert(itemToSave, { onConflict: 'id' });
          if (error) throw error;
          await fetchTalonarios();
          enqueueSnackbar('Talonario guardado.', { variant: 'success' });
          handleCloseDialog();
        } catch (error) {
          enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Está seguro de que desea eliminar el talonario "${item.nombre}"?`)) {
          try {
            const { error } = await supabase.from('ven_talonarios').delete().eq('id', item.id);
            if (error) {
                if (error.code === '23503') throw new Error('No se puede eliminar porque está en uso.');
                throw error;
            }
            await fetchTalonarios();
            enqueueSnackbar('Talonario eliminado.', { variant: 'info' });
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
                <Typography color="text.primary">Gestión de Talonarios</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Talonarios / Puntos de Venta</Typography>
                    <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
                        Nuevo Talonario
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Punto de Venta</TableCell>
                                <TableCell>Letra</TableCell>
                                <TableCell>Fiscal</TableCell>
                                <TableCell align="right">Último Número</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {talonarios.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell> 
                                    <TableCell>{String(item.punto_venta).padStart(5, '0')}</TableCell>
                                    <TableCell>{item.letra}</TableCell>
                                    <TableCell>{item.es_fiscal ? 'Sí' : 'No'}</TableCell>
                                    <TableCell align="right">{item.ultimo_numero}</TableCell>
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
                            <TextField autoFocus label="Nombre descriptivo" fullWidth value={currentItem.nombre || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, nombre: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Punto de Venta (ej: 1)" type="number" fullWidth value={currentItem.punto_venta || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, punto_venta: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Letra (A, B, C, X)" fullWidth inputProps={{ maxLength: 1 }} value={currentItem.letra || ''} onChange={(e) => setCurrentItem(prev => ({ ...prev, letra: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={<Switch checked={currentItem.es_fiscal || false} onChange={(e) => setCurrentItem(prev => ({ ...prev, es_fiscal: e.target.checked }))} />}
                                label="Es un comprobante fiscal (para AFIP)"
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

export default GestionTalonarios;
