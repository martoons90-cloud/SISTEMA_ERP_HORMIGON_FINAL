import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button,
  Autocomplete, Box, Typography, Divider, CircularProgress
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';

const AsignarRecursosDialog = ({ open, onClose, onSave, viaje, pedido }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [asignacion, setAsignacion] = useState({ planta_id: null, camion_id: null, chofer_id: null });
  const [plantas, setPlantas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [choferes, setChoferes] = useState([]);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const { data: plantasData, error: plantasError } = await supabase.from('log_plantas').select('*');
        const { data: camionesData, error: camionesError } = await supabase.from('log_camiones').select('*').eq('activo', true);
        const { data: choferesData, error: choferesError } = await supabase.from('log_choferes').select('*').eq('activo', true);
        if (plantasError || camionesError || choferesError) throw new Error("Error al cargar recursos");
        setPlantas(plantasData || []);
        setCamiones(camionesData || []);
        setChoferes(choferesData || []);
      } catch (error) {
        enqueueSnackbar('Error al cargar recursos: ' + error.message, { variant: 'error' });
      }
      setLoading(false);
    };

    if (viaje) {
      setAsignacion({
        planta_id: viaje.planta_id || null,
        camion_id: viaje.camion_id || null,
        chofer_id: viaje.chofer_id || null,
      });
    }

    if (open) {
      fetchResources();
    }
  }, [viaje, open, enqueueSnackbar]);

  const handleSave = () => {
    onSave(viaje.id, asignacion);
  };

  const getOptionById = (list, id) => list.find(item => item.id === id) || null;

  if (!viaje || !pedido) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar Recursos al Viaje</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1">Pedido: <strong>{String(pedido.id).padStart(6, '0')}</strong></Typography>
          <Typography variant="body2">Cliente: {pedido.cliente.razon_social}</Typography>
          <Typography variant="body2">Obra: {pedido.obra?.nombre || 'Principal'}</Typography>
          <Typography variant="body2">Producto: {viaje.articulo.nombre} ({viaje.cantidad} m³)</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {loading && <Box sx={{textAlign: 'center'}}><CircularProgress /></Box>}
        <Grid container spacing={2}>
          <Grid xs={12}>
            <Autocomplete
              options={plantas}
              getOptionLabel={(option) => option.nombre}
              value={getOptionById(plantas, asignacion.planta_id)}
              onChange={(_, newValue) => setAsignacion(prev => ({ ...prev, planta_id: newValue?.id || null }))}
              renderInput={(params) => <TextField {...params} label="Planta de Origen" required />}
            />
          </Grid>
          <Grid xs={12}>
            <Autocomplete
              options={camiones}
              getOptionLabel={(option) => `${option.patente} - ${option.marca} ${option.modelo}`}
              value={getOptionById(camiones, asignacion.camion_id)}
              onChange={(_, newValue) => setAsignacion(prev => ({ ...prev, camion_id: newValue?.id || null }))}
              renderInput={(params) => <TextField {...params} label="Camión" required />}
            />
          </Grid>
          <Grid xs={12}>
            <Autocomplete
              options={choferes}
              getOptionLabel={(option) => option.nombre}
              value={getOptionById(choferes, asignacion.chofer_id)}
              onChange={(_, newValue) => setAsignacion(prev => ({ ...prev, chofer_id: newValue?.id || null }))}
              renderInput={(params) => <TextField {...params} label="Chofer" required />}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Guardar Asignación</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AsignarRecursosDialog;