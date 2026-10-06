import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button,
  Switch, FormControlLabel
} from '@mui/material';

const CamionDialog = ({ open, onClose, onSave, isEdit, camion }) => {
  const [formData, setFormData] = useState({ patente: '', marca: '', modelo: '', capacidad_m3: '', activo: true });

  useEffect(() => {
    if (camion) {
      setFormData({
        id: camion.id || null,
        patente: camion.patente || '',
        marca: camion.marca || '',
        modelo: camion.modelo || '',
        capacidad_m3: camion.capacidad_m3 || '',
        activo: camion.activo !== false,
      });
    } else {
      setFormData({ patente: '', marca: '', modelo: '', capacidad_m3: '', activo: true });
    }
  }, [camion, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    onSave({ ...formData, capacidad_m3: parseFloat(formData.capacidad_m3) || null });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Camión' : 'Nuevo Camión'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12} sm={6}>
            <TextField autoFocus name="patente" label="Patente" fullWidth required value={formData.patente} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="marca" label="Marca" fullWidth value={formData.marca} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="modelo" label="Modelo" fullWidth value={formData.modelo} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="capacidad_m3" label="Capacidad (m³)" type="number" fullWidth value={formData.capacidad_m3} onChange={handleChange} />
          </Grid>
          <Grid xs={12} container alignItems="center">
             <FormControlLabel
              control={<Switch checked={formData.activo} onChange={handleChange} name="activo" />}
              label="Activo"
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

export default CamionDialog;