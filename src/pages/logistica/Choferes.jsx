import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash, User as UserIcon } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import ChoferDialog from './ChoferDialog';

const Choferes = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [choferes, setChoferes] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentChofer, setCurrentChofer] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [choferToDelete, setChoferToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: choferesData, error: choferesError } = await supabase
        .from('log_choferes')
        .select('*')
        .order('nombre');
      if (choferesError) throw choferesError;
      setChoferes(choferesData || []);

      const { data: camionesData, error: camionesError } = await supabase
        .from('log_camiones')
        .select('patente, chofer_asignado_id');
      if (camionesError) throw camionesError;
      setCamiones(camionesData || []);

    } catch (error) {
      enqueueSnackbar('Error al cargar datos: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (chofer = null) => {
    if (chofer) {
      setIsEdit(true);
      setCurrentChofer({ ...chofer });
    } else {
      setIsEdit(false);
      setCurrentChofer({ id: null, nombre: '', legajo: '', telefono: '', vencimiento_licencia: '', activo: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentChofer(null);
  };

  const handleSave = async (choferToSave) => {
    if (!choferToSave.nombre) {
      enqueueSnackbar('El nombre del chofer es obligatorio.', { variant: 'warning' });
      return;
    }

    const { id, ...data } = choferToSave;
    const payload = isEdit ? { id, ...data } : data;

    const { error } = await supabase.from('log_choferes').upsert(payload);

    if (error) {
      enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
    } else {
      enqueueSnackbar('Chofer guardado con éxito.', { variant: 'success' });
      fetchData();
    }
    handleCloseDialog();
  };

  const handleDeleteRequest = (chofer) => {
    setChoferToDelete(chofer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!choferToDelete) return;
    const { error } = await supabase.from('log_choferes').delete().eq('id', choferToDelete.id);
    if (error) {
      enqueueSnackbar(`Error al eliminar: ${error.message}. Puede que esté en uso.`, { variant: 'error' });
    } else {
      enqueueSnackbar('Chofer eliminado.', { variant: 'info' });
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setChoferToDelete(null);
  };

  const isLicenciaVencida = (fecha) => {
    if (!fecha) return false;
    const hoy = new Date();
    const vencimiento = new Date(fecha + 'T00:00:00');
    hoy.setHours(0, 0, 0, 0);
    return vencimiento < hoy;
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Gestión de Choferes
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
          Nuevo Chofer
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Legajo</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Vencimiento Licencia</TableCell>
              <TableCell>Asignado a</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
            ) : (
              choferes.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>{item.legajo}</TableCell>
                  <TableCell>{item.telefono}</TableCell>
                  <TableCell>
                    <Chip
                      label={isLicenciaVencida(item.vencimiento_licencia) ? 'VENCIDA' : item.vencimiento_licencia || 'N/A'}
                      color={isLicenciaVencida(item.vencimiento_licencia) ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const camion = camiones.find(c => c.chofer_asignado_id === item.id);
                      return camion ? <Chip icon={<UserIcon />} label={camion.patente} size="small" variant="outlined" /> : <Typography variant="caption" color="text.secondary">Libre</Typography>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Chip label={item.activo ? 'Activo' : 'Inactivo'} color={item.activo ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenDialog(item)}><PencilSimple /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteRequest(item)}><Trash /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ChoferDialog open={dialogOpen} onClose={handleCloseDialog} onSave={handleSave} chofer={currentChofer} isEdit={isEdit} />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>¿Está seguro de que desea eliminar al chofer "{choferToDelete?.nombre}"?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Choferes;