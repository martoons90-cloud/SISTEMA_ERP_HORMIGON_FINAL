import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button,
  Switch, FormControlLabel
} from '@mui/material';

const BombaDialog = ({ open, onClose, onSave, isEdit, bomba }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    patente: '',
    marca: '',
    modelo: '',
    capacidad_bombeo_m3h: '',
    activo: true
  });

  useEffect(() => {
    if (bomba) {
      setFormData({
        id: bomba.id || null,
        nombre: bomba.nombre || '',
        patente: bomba.patente || '',
        marca: bomba.marca || '',
        modelo: bomba.modelo || '',
        capacidad_bombeo_m3h: bomba.capacidad_bombeo_m3h || '',
        activo: bomba.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        patente: '',
        marca: '',
        modelo: '',
        capacidad_bombeo_m3h: '',
        activo: true
      });
    }
  }, [bomba, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    onSave({ ...formData, capacidad_bombeo_m3h: parseFloat(formData.capacidad_bombeo_m3h) || null });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Bomba' : 'Nueva Bomba'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField autoFocus name="nombre" label="Nombre / Identificación" fullWidth required value={formData.nombre} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="patente" label="Patente" fullWidth value={formData.patente} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="marca" label="Marca" fullWidth value={formData.marca} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="modelo" label="Modelo" fullWidth value={formData.modelo} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="capacidad_bombeo_m3h" label="Capacidad (m³/h)" type="number" fullWidth value={formData.capacidad_bombeo_m3h} onChange={handleChange} />
          </Grid>
          <Grid xs={12}>
            <FormControlLabel
              control={<Switch checked={formData.activo} onChange={handleChange} name="activo" />}
              label="Activa"
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

export default BombaDialog;