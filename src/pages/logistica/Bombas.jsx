import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import BombaDialog from './BombaDialog';

const Bombas = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [bombas, setBombas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentBomba, setCurrentBomba] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bombaToDelete, setBombaToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_bombas')
        .select('*')
        .order('nombre');
      if (error) throw error;
      setBombas(data || []);
    } catch (error) {
      enqueueSnackbar('Error al cargar bombas: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (bomba = null) => {
    setIsEdit(!!bomba);
    setCurrentBomba(bomba);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentBomba(null);
  };

  const handleSave = async (bombaData) => {
    if (!bombaData.nombre) {
      enqueueSnackbar('El nombre de la bomba es obligatorio.', { variant: 'warning' });
      return;
    }

    const { id, ...data } = bombaData;
    const payload = isEdit ? { id, ...data } : data;

    const { error } = await supabase.from('log_bombas').upsert(payload);

    if (error) {
      enqueueSnackbar(`Error al guardar: ${error.message}`, { variant: 'error' });
    } else {
      enqueueSnackbar('Bomba guardada con éxito.', { variant: 'success' });
      fetchData();
    }
    handleCloseDialog();
  };

  const handleDeleteRequest = (bomba) => {
    setBombaToDelete(bomba);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bombaToDelete) return;
    const { error } = await supabase.from('log_bombas').delete().eq('id', bombaToDelete.id);
    if (error) {
      enqueueSnackbar(`Error al eliminar: ${error.message}. Puede que esté en uso.`, { variant: 'error' });
    } else {
      enqueueSnackbar('Bomba eliminada.', { variant: 'info' });
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setBombaToDelete(null);
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Gestión de Bombas de Hormigón
          </Typography>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
            Nueva Bomba
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre / ID</TableCell>
                <TableCell>Patente</TableCell>
                <TableCell>Marca / Modelo</TableCell>
                <TableCell align="right">Capacidad (m³/h)</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
              ) : (
                bombas.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell>{b.nombre}</TableCell>
                    <TableCell>{b.patente}</TableCell>
                    <TableCell>{b.marca} {b.modelo}</TableCell>
                    <TableCell align="right">{b.capacidad_bombeo_m3h}</TableCell>
                    <TableCell>
                      <Chip label={b.activo ? 'Activa' : 'Inactiva'} color={b.activo ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenDialog(b)}><PencilSimple /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteRequest(b)}><Trash /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <BombaDialog open={dialogOpen} onClose={handleCloseDialog} onSave={handleSave} bomba={currentBomba} isEdit={isEdit} />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>¿Está seguro de que desea eliminar la bomba "{bombaToDelete?.nombre}"?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Bombas;