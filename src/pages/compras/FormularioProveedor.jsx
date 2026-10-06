import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  Autocomplete, CircularProgress, Stack, Typography, Card, CardContent
} from '@mui/material';

const CONDICIONES_IVA = ['IVA Responsable Inscripto', 'IVA Responsable No Inscripto', 'IVA Exento', 'Monotributista', 'Consumidor Final'];

const initialFormData = {
  razon_social: '',
  nombre_fantasia: '',
  cuit: '',
  clasificacion: null,
  telefono: '',
  email: '',
  pagina_web: '',
  domicilio: '',
  localidad: '',
  provincia: '',
  condicion_iva: 'IVA Responsable Inscripto',
  observaciones: '',
};

const FormularioProveedor = ({ open, onClose, onSuccess, editingProveedor }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (open) {
      const fetchClasificaciones = async () => {
        const { data, error } = await supabase.from('com_proveedores_clasificacion').select('*');
        if (error) {
          enqueueSnackbar('Error al cargar clasificaciones', { variant: 'error' });
        } else {
          setClasificaciones(data);
        }
      };
      fetchClasificaciones();
    }

    if (editingProveedor) {
      setFormData({
        razon_social: editingProveedor.razon_social || '',
        nombre_fantasia: editingProveedor.nombre_fantasia || '',
        cuit: editingProveedor.cuit || '',
        clasificacion: editingProveedor.clasificacion || null,
        telefono: editingProveedor.telefono || '',
        email: editingProveedor.email || '',
        pagina_web: editingProveedor.pagina_web || '',
        domicilio: editingProveedor.domicilio || '',
        localidad: editingProveedor.localidad || '',
        provincia: editingProveedor.provincia || '',
        condicion_iva: editingProveedor.condicion_iva || 'IVA Responsable Inscripto',
        observaciones: editingProveedor.observaciones || '',
      });
    } else {
        setFormData(initialFormData);
    }
  }, [open, editingProveedor, enqueueSnackbar]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.razon_social || !formData.clasificacion) {
      enqueueSnackbar('Razón Social y Clasificación son obligatorios.', { variant: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingProveedor) {
        const { clasificacion, ...dataToUpdate } = formData;
        const { data, error } = await supabase
          .from('com_proveedores')
          .update({ ...dataToUpdate, clasificacion_id: clasificacion?.id })
          .eq('id', editingProveedor.id)
          .select('*, clasificacion:com_proveedores_clasificacion(*)')
          .single();
        
        if (error) throw error;
        enqueueSnackbar('Proveedor actualizado con éxito.', { variant: 'success' });
        onSuccess(data);

      } else {
        const { data: nuevoProveedor, error } = await supabase.rpc('crear_proveedor_con_codigo', {
          p_razon_social: formData.razon_social,
          p_nombre_fantasia: formData.nombre_fantasia || null,
          p_cuit: formData.cuit || null,
          p_clasificacion_id: formData.clasificacion.id,
          p_telefono: formData.telefono || null,
          p_email: formData.email || null,
          p_pagina_web: formData.pagina_web || null,
          p_domicilio: formData.domicilio || null,
          p_localidad: formData.localidad || null,
          p_provincia: formData.provincia || null,
          p_condicion_iva: formData.condicion_iva || null,
          p_observaciones: formData.observaciones || null
        });

        if (error) throw error;

        const { data: fullProvider, error: fetchError } = await supabase
          .from('com_proveedores')
          .select('*, clasificacion:com_proveedores_clasificacion(*)')
          .eq('id', nuevoProveedor.id)
          .single();

        if (fetchError) throw fetchError;
        enqueueSnackbar('Proveedor creado con éxito.', { variant: 'success' });
        onSuccess(fullProvider);
      }
      handleClose();
    } catch (error) {
      enqueueSnackbar(`Error al guardar proveedor: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>Información General</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete options={clasificaciones} getOptionLabel={(option) => option.nombre} value={formData.clasificacion} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(_, newValue) => handleInputChange('clasificacion', newValue)} renderInput={(params) => <TextField {...params} label="Clasificación" required />} disabled={!!editingProveedor} />
                  </Grid>
                  <Grid item xs={12} sm={6}><TextField label="Razón Social" value={formData.razon_social} onChange={(e) => handleInputChange('razon_social', e.target.value)} required fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Nombre de Fantasía" value={formData.nombre_fantasia} onChange={(e) => handleInputChange('nombre_fantasia', e.target.value)} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="CUIT" value={formData.cuit} onChange={(e) => handleInputChange('cuit', e.target.value)} fullWidth /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>Datos de Contacto</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}><TextField label="Teléfono" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} fullWidth /></Grid>
                  <Grid item xs={12}><TextField label="Página Web" value={formData.pagina_web} onChange={(e) => handleInputChange('pagina_web', e.target.value)} fullWidth /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>Domicilio</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}><TextField label="Domicilio" value={formData.domicilio} onChange={(e) => handleInputChange('domicilio', e.target.value)} fullWidth /></Grid>
                  <Grid item xs={12} sm={3}><TextField label="Localidad" value={formData.localidad} onChange={(e) => handleInputChange('localidad', e.target.value)} fullWidth /></Grid>
                  <Grid item xs={12} sm={3}><TextField label="Provincia" value={formData.provincia} onChange={(e) => handleInputChange('provincia', e.target.value)} fullWidth /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>Información Comercial y Fiscal</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12}>
                    <Autocomplete options={CONDICIONES_IVA} value={formData.condicion_iva} onChange={(_, newValue) => handleInputChange('condicion_iva', newValue)} renderInput={(params) => <TextField {...params} label="Condición IVA" />} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>Otros</Typography>
                <TextField label="Observaciones" fullWidth multiline rows={3} value={formData.observaciones} onChange={(e) => handleInputChange('observaciones', e.target.value)} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Guardar Proveedor'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioProveedor;
