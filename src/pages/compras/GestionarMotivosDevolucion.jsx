import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  IconButton, TextField, Button, Dialog, DialogActions,
  DialogContent, DialogTitle, Switch, FormControlLabel
} from '@mui/material';
import { PencilSimple, Trash, Plus } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const GestionarMotivosDevolucion = () => {
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentMotivo, setCurrentMotivo] = useState({ id: null, nombre: '', descripcion: '', activo: true });
  const { enqueueSnackbar } = useSnackbar();

  const fetchMotivos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('com_motivos_devolucion')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      setMotivos(data);
    } catch (error) {
      enqueueSnackbar(`Error al cargar motivos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchMotivos();
  }, [fetchMotivos]);

  const handleOpen = (motivo = null) => {
    if (motivo) {
      setCurrentMotivo(motivo);
    } else {
      setCurrentMotivo({ id: null, nombre: '', descripcion: '', activo: true });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    if (!currentMotivo.nombre) {
      enqueueSnackbar('El nombre es obligatorio.', { variant: 'warning' });
      return;
    }

    try {
      let error;
      if (currentMotivo.id) {
        // Update
        ({ error } = await supabase
          .from('com_motivos_devolucion')
          .update({ nombre: currentMotivo.nombre, descripcion: currentMotivo.descripcion, activo: currentMotivo.activo })
          .eq('id', currentMotivo.id));
      } else {
        // Insert
        ({ error } = await supabase
          .from('com_motivos_devolucion')
          .insert([{ nombre: currentMotivo.nombre, descripcion: currentMotivo.descripcion, activo: currentMotivo.activo }]));
      }

      if (error) throw error;
      enqueueSnackbar('Motivo guardado con éxito.', { variant: 'success' });
      handleClose();
      fetchMotivos();
    } catch (error) {
      enqueueSnackbar(`Error al guardar el motivo: ${error.message}`, { variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este motivo?')) {
      try {
        const { error } = await supabase
          .from('com_motivos_devolucion')
          .delete()
          .eq('id', id);
        if (error) throw error;
        enqueueSnackbar('Motivo eliminado con éxito.', { variant: 'success' });
        fetchMotivos();
      } catch (error) {
        enqueueSnackbar(`Error al eliminar el motivo: ${error.message}`, { variant: 'error' });
      }
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Gestionar Motivos de Devolución</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={() => handleOpen()}>
          Nuevo Motivo
        </Button>
      </Box>
      <List>
        {motivos.map((motivo) => (
          <ListItem
            key={motivo.id}
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpen(motivo)}>
                  <PencilSimple />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(motivo.id)}>
                  <Trash />
                </IconButton>
              </>
            }
          >
            <ListItemText
              primary={motivo.nombre}
              secondary={motivo.descripcion}
              sx={{ textDecoration: motivo.activo ? 'none' : 'line-through' }}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{currentMotivo.id ? 'Editar' : 'Nuevo'} Motivo de Devolución</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            variant="standard"
            value={currentMotivo.nombre}
            onChange={(e) => setCurrentMotivo({ ...currentMotivo, nombre: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Descripción"
            fullWidth
            variant="standard"
            value={currentMotivo.descripcion || ''}
            onChange={(e) => setCurrentMotivo({ ...currentMotivo, descripcion: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={currentMotivo.activo}
                onChange={(e) => setCurrentMotivo({ ...currentMotivo, activo: e.target.checked })}
              />
            }
            label="Activo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GestionarMotivosDevolucion;
