import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
} from '@mui/material';
import { PencilSimple, Trash, PlusCircle, MagnifyingGlass } from 'phosphor-react';

const Depositos = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDeposito, setEditingDeposito] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', ubicacion: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [depositoToDelete, setDepositoToDelete] = useState(null);

  const fetchDepositos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('stk_depositos').select('*').order('nombre');
      if (error) throw error;
      setDepositos(data);
    } catch (err) {
      setError('No se pudieron cargar los depósitos.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      await fetchDepositos();
      setLoading(false);
    };
    initialLoad();

    const channel = supabase
      .channel('stk_depositos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stk_depositos' },
        () => {
          enqueueSnackbar('La lista de depósitos se ha actualizado.', { variant: 'info' });
          fetchDepositos();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [enqueueSnackbar, fetchDepositos]);

  const handleOpenDialog = (deposito = null) => {
    if (deposito) {
      setEditingDeposito(deposito);
      setFormData({
        nombre: deposito.nombre || '',
        descripcion: deposito.descripcion || '',
        ubicacion: deposito.ubicacion || '',
      });
    } else {
      setEditingDeposito(null);
      setFormData({ nombre: '', descripcion: '', ubicacion: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDeposito(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      let error;

      if (editingDeposito) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('stk_depositos')
          .update(formData)
          .eq('id', editingDeposito.id);
        error = updateError;
      } else {
        // Crear
        const { error: insertError } = await supabase.from('stk_depositos').insert([formData]);
        error = insertError;
      }

      if (error) throw error;

      enqueueSnackbar(`Depósito ${editingDeposito ? 'actualizado' : 'creado'} con éxito`, { variant: 'success' });
      handleCloseDialog();
    } catch (err) {
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirm = (deposito) => {
    setDepositoToDelete(deposito);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDepositoToDelete(null);
    setOpenDeleteConfirm(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!depositoToDelete) return;
    try {
      const { error } = await supabase.from('stk_depositos').delete().eq('id', depositoToDelete.id);
      if (error) throw error;
      enqueueSnackbar('Depósito eliminado', { variant: 'info' });
      handleCloseDeleteConfirm();
    } catch (err) {
      enqueueSnackbar(`Error al eliminar: ${err.message}`, { variant: 'error' });
      console.error(err);
    }
  };

  const filteredDepositos = useMemo(() => {
    if (!searchTerm) return depositos;
    const lowercasedTerm = searchTerm.toLowerCase();
    return depositos.filter(
      (deposito) =>
        deposito.nombre.toLowerCase().includes(lowercasedTerm) ||
        (deposito.descripcion && deposito.descripcion.toLowerCase().includes(lowercasedTerm)) ||
        (deposito.ubicacion && deposito.ubicacion.toLowerCase().includes(lowercasedTerm))
    );
  }, [depositos, searchTerm]);

  return (
    <>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Gestión de Depósitos
          </Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
            Nuevo Depósito
          </Button>
        </Box>

        <TextField label="Buscar por nombre, descripción o ubicación..." variant="outlined" size="small" sx={{ mb: 2, maxWidth: 400 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><MagnifyingGlass /></InputAdornment>), }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepositos.map((deposito) => (
                <TableRow key={deposito.id}>
                  <TableCell>{deposito.id}</TableCell>
                  <TableCell>{deposito.nombre}</TableCell>
                  <TableCell>{deposito.descripcion}</TableCell>
                  <TableCell>{deposito.ubicacion}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(deposito)}><PencilSimple /></IconButton>
                    <IconButton size="small" onClick={() => handleOpenDeleteConfirm(deposito)} color="error"><Trash /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDeposito ? 'Editar Depósito' : 'Nuevo Depósito'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              name="nombre"
              label="Nombre del Depósito"
              fullWidth
              size="small"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
            <TextField
              name="descripcion"
              label="Descripción"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
            <TextField
              name="ubicacion"
              label="Ubicación (Ej: Galpón 3, Sector A)"
              fullWidth
              size="small"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting || !formData.nombre.trim()}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent><Typography>¿Estás seguro de que quieres eliminar el depósito "{depositoToDelete?.nombre}"? Esta acción no se puede deshacer.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancelar</Button>
          <Button onClick={handleDeleteConfirmed} variant="contained" color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Depositos;
