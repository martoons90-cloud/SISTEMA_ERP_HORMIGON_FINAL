import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button, Autocomplete
} from '@mui/material';

const PlantaDialog = ({ open, onClose, onSave, isEdit, planta, depositos, talonarios }) => {
  const [formData, setFormData] = useState({ nombre: '', direccion: '', latitud: '', longitud: '', tiempo_ciclo_fijo: '', ratio_ciclo_m3: '', deposito_id: null, talonario_remito_id: null });

  useEffect(() => {
    // Cuando el diálogo se abre y recibe una planta, actualizamos el estado del formulario.
    if (planta) {
      setFormData({
        id: planta.id || null,
        nombre: planta.nombre || '',
        direccion: planta.direccion || '',
        latitud: planta.latitud || '',
        longitud: planta.longitud || '',
        tiempo_ciclo_fijo: planta.tiempo_ciclo_fijo || '',
        ratio_ciclo_m3: planta.ratio_ciclo_m3 || '',
        deposito_id: planta.deposito_id || null,
        talonario_remito_id: planta.talonario_remito_id || null,
      });
    } else {
      // Si no hay planta (es una creación), reseteamos el formulario.
      setFormData({ id: null, nombre: '', direccion: '', latitud: '', longitud: '', tiempo_ciclo_fijo: '', ratio_ciclo_m3: '', deposito_id: null, talonario_remito_id: null });
    }
  }, [planta, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDepositoChange = (_, newValue) => {
    setFormData(prev => ({ ...prev, deposito_id: newValue ? newValue.id : null }));
  };

  const handleTalonarioChange = (_, newValue) => {
    setFormData(prev => ({ ...prev, talonario_remito_id: newValue ? newValue.id : null }));
  };

  const handleSave = () => {
    // Pasamos el objeto completo (con id si existe) de vuelta al componente padre.
    onSave({ 
        ...formData,
        latitud: parseFloat(formData.latitud) || null,
        longitud: parseFloat(formData.longitud) || null,
        tiempo_ciclo_fijo: parseInt(formData.tiempo_ciclo_fijo, 10) || 0,
        ratio_ciclo_m3: parseFloat(formData.ratio_ciclo_m3) || 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Planta' : 'Nueva Planta'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              name="nombre"
              label="Nombre de la Planta"
              fullWidth
              required
              value={formData.nombre}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="direccion"
              label="Dirección"
              fullWidth
              value={formData.direccion}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="latitud"
              label="Latitud (GPS)"
              type="number"
              fullWidth
              value={formData.latitud}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="longitud"
              label="Longitud (GPS)"
              type="number"
              fullWidth
              value={formData.longitud}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="tiempo_ciclo_fijo"
              label="Tiempo Fijo de Ciclo (min)"
              type="number"
              fullWidth
              value={formData.tiempo_ciclo_fijo}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="ratio_ciclo_m3"
              label="Ratio por m³ (min/m³)"
              type="number"
              fullWidth
              value={formData.ratio_ciclo_m3}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              options={depositos || []}
              getOptionLabel={(option) => option.nombre || ''}
              value={depositos.find(d => d.id === formData.deposito_id) || null}
              onChange={handleDepositoChange}
              renderInput={(params) => (
                <TextField {...params} label="Vincular a Depósito de Stock" />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              options={talonarios || []}
              getOptionLabel={(option) => `${option.nombre} (${option.prefijo})` || ''}
              value={talonarios.find(t => t.id === formData.talonario_remito_id) || null}
              onChange={handleTalonarioChange}
              renderInput={(params) => (
                <TextField {...params} label="Talonario de Remitos por Defecto" />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlantaDialog;