import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, Stack,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText
} from '@mui/material';
import { PlusCircle, PencilSimple, Link as LinkIcon, Trash, MapPin } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import PlantaDialog from './PlantaDialog';
import GeocodificacionDialog from './GeocodificacionDialog';

const Plantas = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [plantas, setPlantas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositos, setDepositos] = useState([]);
  const [talonarios, setTalonarios] = useState([]);

  // Estados para el diálogo de creación/edición
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentPlanta, setCurrentPlanta] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [plantaToDelete, setPlantaToDelete] = useState(null);

  // Estados para el diálogo de geocodificación
  const [geocodificacionDialogOpen, setGeocodificacionDialogOpen] = useState(false);
  const [plantaToGeocode, setPlantaToGeocode] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_plantas')
        .select('*, deposito:stk_depositos(id, nombre), talonario:log_talonarios_remitos(id, nombre)')
        .order('nombre');
      if (error) throw error;
      setPlantas(data || []);
    } catch (error) {
      enqueueSnackbar('Error al cargar las plantas: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
    const fetchDepositos = async () => {
      const { data, error } = await supabase.from('stk_depositos').select('*').order('nombre');
      if (error) {
        enqueueSnackbar('Error al cargar depósitos: ' + error.message, { variant: 'error' });
      } else {
        setDepositos(data);
      }
    };
    fetchDepositos();

    const fetchTalonarios = async () => {
      const { data, error } = await supabase.from('log_talonarios_remitos').select('*').eq('activo', true).order('nombre');
      if (error) {
        enqueueSnackbar('Error al cargar talonarios de remitos: ' + error.message, { variant: 'error' });
      } else {
        setTalonarios(data);
      }
    };
    fetchTalonarios();
  }, [fetchData, enqueueSnackbar]);

  const handleOpenDialog = (planta = null) => {
    if (planta) {
      setIsEdit(true);
      setCurrentPlanta({ ...planta });
    } else {
      setIsEdit(false);
      setCurrentPlanta({ id: null, nombre: '', direccion: '', latitud: '', longitud: '', deposito_id: null, talonario_remito_id: null });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentPlanta(null);
  };

  const handleSave = async (plantaToSave) => {
    if (!plantaToSave.nombre) {
      enqueueSnackbar('El nombre de la planta es obligatorio.', { variant: 'warning' });
      return;
    }

    // Preparamos los datos para Supabase.
    const { id, ...data } = plantaToSave;
    // Si es una edición, incluimos el 'id'. Si es una creación, lo omitimos para que la BD lo genere.
    const payload = isEdit ? { id, ...data } : data;

    const { error } = await supabase.from('log_plantas').upsert(payload);

    if (error) {
      enqueueSnackbar('Error al guardar la planta: ' + error.message, { variant: 'error' });
    } else {
      enqueueSnackbar(`Planta ${isEdit ? 'actualizada' : 'creada'} con éxito.`, { variant: 'success' });
      fetchData();
    }
    handleCloseDialog();
  };

  const handleDeleteRequest = (planta) => {
    setPlantaToDelete(planta);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!plantaToDelete) return;
    const { error } = await supabase.from('log_plantas').delete().eq('id', plantaToDelete.id);
    if (error) {
      enqueueSnackbar('Error al eliminar la planta: ' + error.message, { variant: 'error' });
    } else {
      enqueueSnackbar('Planta eliminada con éxito.', { variant: 'info' });
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setPlantaToDelete(null);
  };

  const handleOpenGeocodificacionDialog = (planta) => {
    // El diálogo de geocodificación espera una prop 'obra', pero podemos pasarle el objeto 'planta'
    // ya que tiene una estructura similar (id, nombre, latitud, longitud).
    setPlantaToGeocode(planta);
    setGeocodificacionDialogOpen(true);
  };

  const handleSaveGeocodificacion = async (plantaId, { latitud, longitud }) => {
    // Ya no necesitamos setLoading aquí, el diálogo maneja su propio estado.
    try {
      const { error } = await supabase
        .from('log_plantas')
        .update({ latitud, longitud })
        .eq('id', plantaId);
      if (error) throw error;
      enqueueSnackbar('Ubicación actualizada con éxito.', { variant: 'success' });
      await fetchData(); // Esperamos a que los datos se recarguen
    } catch (error) {
      enqueueSnackbar('Error al guardar la ubicación: ' + error.message, { variant: 'error' });
      throw error; // Lanzamos el error para que el diálogo sepa que falló
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Gestión de Plantas
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
          Nueva Planta
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Depósito Vinculado</TableCell>
              <TableCell>Talonario Remito</TableCell>
              <TableCell>Coordenadas (Lat, Lon)</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : (
              plantas.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>{item.direccion}</TableCell>
                  <TableCell>
                    {item.deposito ? (
                      <Chip icon={<LinkIcon />} label={item.deposito.nombre} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">No vinculado</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.talonario ? (
                      <Chip label={item.talonario.nombre} size="small" color="secondary" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">No asignado</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.latitud && item.longitud ? `${item.latitud}, ${item.longitud}` : 'N/A'}
                    <Tooltip title="Geocodificar Planta">
                      <IconButton size="small" sx={{ ml: 1 }} onClick={() => handleOpenGeocodificacionDialog(item)}><MapPin size={16} /></IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(item)}><PencilSimple /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDeleteRequest(item)}><Trash /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <PlantaDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        isEdit={isEdit}
        planta={currentPlanta}
        depositos={depositos}
        talonarios={talonarios}
      />

      <GeocodificacionDialog
        open={geocodificacionDialogOpen}
        onClose={() => setGeocodificacionDialogOpen(false)}
        onSave={(coords) => handleSaveGeocodificacion(plantaToGeocode.id, coords)}
        obra={plantaToGeocode} // Reutilizamos el diálogo pasándole el objeto planta
      />

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar la planta "{plantaToDelete?.nombre}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Plantas;
