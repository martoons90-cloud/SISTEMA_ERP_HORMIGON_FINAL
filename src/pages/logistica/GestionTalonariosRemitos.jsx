import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Stack, Switch, FormControlLabel, Chip
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const TalonarioDialog = ({ open, onClose, onSave, talonario, isEdit }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    prefijo: '',
    ultimo_numero: 0,
    cantidad_digitos: 8,
    activo: true
  });

  useEffect(() => {
    if (talonario) {
      setFormData(talonario);
    } else {
      setFormData({ nombre: '', prefijo: '', ultimo_numero: 0, cantidad_digitos: 8, activo: true });
    }
  }, [talonario, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveClick = () => {
    if (!formData.nombre || !formData.prefijo) {
      // You might want to show a snackbar here
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Talonario' : 'Nuevo Talonario de Remitos'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField autoFocus name="nombre" label="Nombre del Talonario" value={formData.nombre} onChange={handleChange} fullWidth required />
          <TextField name="prefijo" label="Prefijo (Ej: R-001-)" value={formData.prefijo} onChange={handleChange} fullWidth required />
          <TextField name="ultimo_numero" label="Último Número Usado" type="number" value={formData.ultimo_numero} onChange={handleChange} fullWidth required />
          <TextField name="cantidad_digitos" label="Cantidad de Dígitos (sin prefijo)" type="number" value={formData.cantidad_digitos} onChange={handleChange} fullWidth required />
          <FormControlLabel control={<Switch checked={formData.activo} onChange={handleChange} name="activo" />} label="Activo" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveClick} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

const GestionTalonariosRemitos = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [talonarios, setTalonarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentTalonario, setCurrentTalonario] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [talonarioToDelete, setTalonarioToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('log_talonarios_remitos').select('*').order('nombre');
      if (error) throw error;
      setTalonarios(data || []);
    } catch (error) {
      enqueueSnackbar('Error al cargar talonarios: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (talonario = null) => {
    setIsEdit(!!talonario);
    setCurrentTalonario(talonario);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentTalonario(null);
  };

  const handleSave = async (talonarioData) => {
    const { id, ...data } = talonarioData;
    const payload = isEdit ? { id, ...data } : data;
    const { error } = await supabase.from('log_talonarios_remitos').upsert(payload);

    if (error) {
      enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
    } else {
      enqueueSnackbar('Talonario guardado con éxito.', { variant: 'success' });
      fetchData();
    }
    handleCloseDialog();
  };

  const handleDeleteRequest = (talonario) => {
    setTalonarioToDelete(talonario);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!talonarioToDelete) return;
    const { error } = await supabase.from('log_talonarios_remitos').delete().eq('id', talonarioToDelete.id);
    if (error) {
      enqueueSnackbar(`Error al eliminar: ${error.message}. Puede que esté en uso.`, { variant: 'error' });
    } else {
      enqueueSnackbar('Talonario eliminado.', { variant: 'info' });
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setTalonarioToDelete(null);
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Gestión de Talonarios de Remitos
          </Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
            Nuevo Talonario
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Prefijo</TableCell>
                <TableCell>Último Número</TableCell>
                <TableCell>Próximo Número</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
              ) : (
                talonarios.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell>{t.prefijo}</TableCell>
                    <TableCell>{t.ultimo_numero}</TableCell>
                    <TableCell><strong>{`${t.prefijo}${String(t.ultimo_numero + 1).padStart(t.cantidad_digitos, '0')}`}</strong></TableCell>
                    <TableCell><Chip label={t.activo ? 'Sí' : 'No'} color={t.activo ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenDialog(t)}><PencilSimple /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteRequest(t)}><Trash /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <TalonarioDialog open={dialogOpen} onClose={handleCloseDialog} onSave={handleSave} talonario={currentTalonario} isEdit={isEdit} />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Está seguro de que desea eliminar el talonario "{talonarioToDelete?.nombre}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GestionTalonariosRemitos;
