import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button,
  Switch, FormControlLabel
} from '@mui/material';

const ChoferDialog = ({ open, onClose, onSave, isEdit, chofer }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    legajo: '',
    telefono: '',
    vencimiento_licencia: '',
    activo: true
  });

  useEffect(() => {
    if (chofer) {
      setFormData({
        id: chofer.id || null,
        nombre: chofer.nombre || '',
        legajo: chofer.legajo || '',
        telefono: chofer.telefono || '',
        vencimiento_licencia: chofer.vencimiento_licencia || '',
        activo: chofer.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        legajo: '',
        telefono: '',
        vencimiento_licencia: '',
        activo: true
      });
    }
  }, [chofer, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Chofer' : 'Nuevo Chofer'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField autoFocus name="nombre" label="Nombre y Apellido" fullWidth required value={formData.nombre} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="legajo" label="Legajo" fullWidth value={formData.legajo} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField name="telefono" label="Teléfono" fullWidth value={formData.telefono} onChange={handleChange} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              name="vencimiento_licencia"
              label="Vencimiento de Licencia"
              type="date"
              fullWidth
              value={formData.vencimiento_licencia}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid xs={12} sm={6} container alignItems="center">
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

export default ChoferDialog;