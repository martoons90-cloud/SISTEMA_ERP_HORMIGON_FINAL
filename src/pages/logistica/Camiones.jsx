import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash, User as UserIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import CamionDialog from './CamionDialog';

const Camiones = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [camiones, setCamiones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCamion, setCurrentCamion] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [camionToDelete, setCamionToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_camiones')
        .select('*, chofer:log_choferes(nombre)') // Hacemos un join para traer el nombre del chofer
        .order('patente');
      if (error) throw error;
      setCamiones(data || []);
    } catch (error) {
      enqueueSnackbar('Error al cargar camiones: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (camion = null) => {
    if (camion) {
      setIsEdit(true);
      setCurrentCamion({ ...camion });
    } else {
      setIsEdit(false);
      setCurrentCamion({ id: null, patente: '', marca: '', modelo: '', capacidad_m3: '', activo: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentCamion(null);
  };

  const handleSave = async (camionData) => {
    if (!camionData.patente) {
      enqueueSnackbar('La patente es obligatoria.', { variant: 'warning' });
      return;
    }

    const { id, ...data } = camionData;
    // El chofer_asignado_id no se gestiona desde aquí, sino desde la pantalla de flota.
    // Nos aseguramos de no sobreescribirlo si no viene en el formulario.
    delete data.chofer_asignado_id;
    delete data.chofer;

    const payload = isEdit ? { id, ...data } : data;

    const { error } = await supabase.from('log_camiones').upsert(payload, { onConflict: 'patente' });

    if (error) {
      enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
    } else {
      enqueueSnackbar('Camión guardado con éxito.', { variant: 'success' });
      fetchData();
    }
    handleCloseDialog();
  };

  const handleDeleteRequest = (camion) => {
    setCamionToDelete(camion);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!camionToDelete) return;
    const { error } = await supabase.from('log_camiones').delete().eq('id', camionToDelete.id);
    if (error) {
      enqueueSnackbar(`Error al eliminar: ${error.message}. Puede que esté en uso.`, { variant: 'error' });
    } else {
      enqueueSnackbar('Camión eliminado.', { variant: 'info' });
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setCamionToDelete(null);
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Gestión de Camiones
          </Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
            Nuevo Camión
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Patente</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell align="right">Capacidad (m³)</TableCell>
                <TableCell>Chofer Asignado</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
              ) : (
                camiones.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{c.patente}</TableCell>
                    <TableCell>{c.marca}</TableCell>
                    <TableCell>{c.modelo}</TableCell>
                    <TableCell align="right">{c.capacidad_m3}</TableCell>
                    <TableCell>
                      {c.chofer ? (
                        <Chip icon={<UserIcon />} label={c.chofer.nombre} size="small" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">Libre</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={c.activo ? 'Activo' : 'Inactivo'} color={c.activo ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenDialog(c)}><PencilSimple /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteRequest(c)}><Trash /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CamionDialog open={dialogOpen} onClose={handleCloseDialog} onSave={handleSave} camion={currentCamion} isEdit={isEdit} />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>¿Está seguro de que desea eliminar el camión con patente "{camionToDelete?.patente}"?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Camiones;