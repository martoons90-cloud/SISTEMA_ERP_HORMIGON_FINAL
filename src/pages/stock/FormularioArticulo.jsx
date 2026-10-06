import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Stack,
  Divider,
  Typography,
  Box,
  Autocomplete,
} from '@mui/material';
import { useCallback } from 'react';

const initialFormData = {
  name: '',
  description: '',
  precio_ultima_compra: '',
  unidad_medida: '',
  es_componente: false,
  proposito_comercial: 'Compra y Venta',
  controla_stock: true,
  permite_stock_negativo: false,
  tipo_articulo_id: '',
  stock_minimo: 0,
  stock_maximo: 0,
  activo: true,
  acepta_variantes: false,
  parent_articulo_id: null,
  variant_name: '',
};

const FormularioArticulo = ({ open, onClose, onSuccess, editingArticleId, tiposArticulo, unidadesMedida, startAsVariant = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVariant, setIsVariant] = useState(false);
  const [parentArticles, setParentArticles] = useState([]);
  const isEditMode = editingArticleId !== null;

  const fetchArticle = useCallback(async () => {
    if (!isEditMode) {
      setFormData(initialFormData);
      setIsVariant(startAsVariant);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stk_articulos')
        .select('*')
        .eq('id', editingArticleId)
        .single();
      
      if (error) throw error;

      setFormData({
        name: data.name ?? '',
        description: data.description ?? '',
        precio_ultima_compra: data.precio_ultima_compra ?? '',
        unidad_medida: data.unidad_medida ?? '',
        es_componente: data.es_componente ?? false,
        proposito_comercial: data.proposito_comercial ?? 'Compra y Venta',
        controla_stock: data.controla_stock ?? true,
        permite_stock_negativo: data.permite_stock_negativo ?? false,
        tipo_articulo_id: data.tipo_articulo_id ?? '',
        stock_minimo: data.stock_minimo ?? 0,
        stock_maximo: data.stock_maximo ?? 0,
        activo: data.activo ?? true,
        acepta_variantes: data.acepta_variantes ?? false,
        parent_articulo_id: data.parent_articulo_id,
        variant_name: data.variant_name ?? '',
      });

      if (data.parent_articulo_id) {
        setIsVariant(true);
      }
    } catch (error) {
      enqueueSnackbar(`Error al cargar el artículo: ${error.message}`, { variant: 'error' });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [editingArticleId, isEditMode, enqueueSnackbar, onClose, startAsVariant]);

  useEffect(() => {
    if (open) {
      const fetchParentArticles = async () => {
        try {
          const { data, error } = await supabase
            .from('stk_articulos')
            .select('*') // Obtenemos todos los datos para poder heredarlos
            .eq('acepta_variantes', true)
            .eq('activo', true);
          if (error) throw error;
          setParentArticles(data || []);
        } catch (error) {
          enqueueSnackbar(`Error al cargar artículos padre: ${error.message}`, { variant: 'error' });
        }
      };
      fetchParentArticles();
      fetchArticle();
    } else {
      // Limpiamos el estado al cerrar para evitar problemas
      setIsVariant(false);
      setFormData(initialFormData);
    }
  }, [open, fetchArticle]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'switch' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (isEditMode) {
      await handleUpdateArticle();
    } else {
      await handleCreateArticle();
    }
  };

  const handleCreateArticle = async () => {
    // Validación
    if (isVariant && !formData.parent_articulo_id) {
      enqueueSnackbar('Debe seleccionar un Artículo Padre para la variante.', { variant: 'warning' });
      return;
    }
    if (!formData.name.trim() || !formData.tipo_articulo_id) {
        enqueueSnackbar('El Nombre y el Tipo de Artículo son obligatorios.', { variant: 'warning' });
        return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.rpc('crear_articulo_con_codigo', {
        p_tipo_articulo_id: Number(formData.tipo_articulo_id),
        p_name: isVariant ? formData.variant_name : formData.name, // Usamos variant_name si es una variante
        p_description: formData.description || '',
        p_precio_ultima_compra: Number(formData.precio_ultima_compra) || 0,
        p_unidad_medida: formData.unidad_medida,
        p_es_componente: formData.es_componente,
        p_proposito_comercial: formData.proposito_comercial,
        p_controla_stock: formData.controla_stock,
        p_permite_stock_negativo: formData.permite_stock_negativo,
        p_stock_minimo: Number(formData.stock_minimo) || 0,
        p_stock_maximo: Number(formData.stock_maximo) || 0,
        p_acepta_variantes: formData.acepta_variantes,
        p_parent_articulo_id: isVariant ? formData.parent_articulo_id : null
      });

      if (error) throw error;

      enqueueSnackbar('Artículo creado con éxito', { variant: 'success' });
      onSuccess();
    } catch (err) {
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateArticle = async () => {
    // Construimos el objeto a enviar explícitamente para asegurar que se envían los datos correctos del estado.
    const dataToSubmit = {
      name: formData.name,
      description: formData.description,
      variant_name: formData.variant_name, // Añadimos el campo para actualizar
      precio_ultima_compra: formData.precio_ultima_compra ? Number(formData.precio_ultima_compra) : 0,
      unidad_medida: formData.unidad_medida,
      es_componente: formData.es_componente,
      proposito_comercial: formData.proposito_comercial,
      controla_stock: formData.controla_stock,
      permite_stock_negativo: formData.permite_stock_negativo,
      stock_minimo: formData.stock_minimo ? Number(formData.stock_minimo) : 0,
      stock_maximo: formData.stock_maximo ? Number(formData.stock_maximo) : 0,
      activo: formData.activo,
      acepta_variantes: formData.acepta_variantes,
    };

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('stk_articulos').update(dataToSubmit).eq('id', editingArticleId);
      if (error) throw error;
      enqueueSnackbar('Artículo actualizado correctamente', { variant: 'success' });
      onSuccess();
    } catch (err) {
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? `Editar Artículo` : 'Crear Nuevo Artículo'}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {isVariant ? (
              // --- FORMULARIO SIMPLIFICADO PARA VARIANTES ---
              <>
                <Grid xs={12}>
                  <Autocomplete
                    options={parentArticles}
                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                    value={parentArticles.find(p => p.id === formData.parent_articulo_id) || null}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setFormData({
                          ...initialFormData, // Reseteamos para no mezclar datos
                          name: newValue.name, // Heredamos el nombre del padre
                          variant_name: '', // Limpiamos el nombre específico
                          parent_articulo_id: newValue.id,
                          // Heredamos los datos importantes del padre
                          tipo_articulo_id: newValue.tipo_articulo_id,
                          unidad_medida: newValue.unidad_medida,
                          proposito_comercial: newValue.proposito_comercial,
                          controla_stock: newValue.controla_stock,
                          permite_stock_negativo: newValue.permite_stock_negativo,
                          es_componente: newValue.es_componente,
                          stock_minimo: newValue.stock_minimo,
                          stock_maximo: newValue.stock_maximo,
                        });
                      } else {
                        setFormData(initialFormData);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Artículo Padre" required={isVariant} />}
                    disabled={isEditMode}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField name="variant_name" label="Nombre Específico de la Variante" fullWidth size="small" value={formData.variant_name} onChange={handleInputChange} required helperText="Ej: Diseño Invierno, Color Rojo, Talle L" />
                </Grid>
                <Grid xs={12}>
                  <TextField name="name" label="Nombre Heredado del Padre" fullWidth size="small" value={formData.name} disabled />
                </Grid>
                <Grid xs={12}>
                  <TextField name="description" label="Descripción de la Variante (Opcional)" fullWidth multiline rows={2} size="small" value={formData.description} onChange={handleInputChange} />
                </Grid>

                <Grid xs={12}><Divider sx={{ my: 1 }}><Typography variant="overline">Datos Heredados del Padre (No editables)</Typography></Divider></Grid>

                <Grid xs={12} sm={6}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Tipo de Artículo</InputLabel>
                    <Select name="tipo_articulo_id" label="Tipo de Artículo" value={formData.tipo_articulo_id} disabled>
                      {tiposArticulo.map((t) => (<MenuItem key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Unidad de Medida</InputLabel>
                    <Select name="unidad_medida" label="Unidad de Medida" value={formData.unidad_medida} disabled>
                      {unidadesMedida.map((u) => (<MenuItem key={u.nombre} value={u.nombre}>{u.nombre}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                    <FormControlLabel control={<Switch checked={formData.controla_stock} name="controla_stock" />} label="Controla Stock" disabled />
                    <FormControlLabel control={<Switch checked={formData.permite_stock_negativo} name="permite_stock_negativo" />} label="Permite Stock Negativo" disabled />
                    <FormControlLabel control={<Switch checked={formData.es_componente} name="es_componente" />} label="Es Componente" disabled />
                  </Stack>
                </Grid>
              </>
            ) : (
              // --- FORMULARIO COMPLETO PARA ARTÍCULOS NORMALES ---
              <>
                <Grid xs={12} sm={8}>
                  <TextField name="name" label="Nombre del Artículo" fullWidth size="small" value={formData.name} onChange={handleInputChange} required />
                </Grid>
                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Tipo de Artículo</InputLabel>
                    <Select name="tipo_articulo_id" label="Tipo de Artículo" value={formData.tipo_articulo_id} onChange={handleInputChange} disabled={isEditMode}>
                      {tiposArticulo.map((t) => (<MenuItem key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                  <TextField name="description" label="Descripción" fullWidth multiline rows={2} size="small" value={formData.description} onChange={handleInputChange} />
                </Grid>
                <Grid xs={12}><Divider sx={{ my: 1 }}><Typography variant="overline">Datos Comerciales</Typography></Divider></Grid>
                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Unidad de Medida</InputLabel>
                    <Select name="unidad_medida" label="Unidad de Medida" value={formData.unidad_medida} onChange={handleInputChange}>
                      {unidadesMedida.map((u) => (<MenuItem key={u.nombre} value={u.nombre}>{u.nombre}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={4}>
                  <TextField name="precio_ultima_compra" label="Precio de Última Compra" type="number" fullWidth size="small" value={formData.precio_ultima_compra} onChange={handleInputChange} />
                </Grid>
                <Grid xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Propósito Comercial</InputLabel>
                    <Select name="proposito_comercial" label="Propósito Comercial" value={formData.proposito_comercial} onChange={handleInputChange}>
                      <MenuItem value="Solo Compra">Solo Compra</MenuItem>
                      <MenuItem value="Solo Venta">Solo Venta</MenuItem>
                      <MenuItem value="Compra y Venta">Compra y Venta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12}><Divider sx={{ my: 1 }}><Typography variant="overline">Gestión de Stock</Typography></Divider></Grid>
                <Grid xs={12} sm={6}>
                  <TextField name="stock_minimo" label="Stock Mínimo" type="number" fullWidth size="small" value={formData.stock_minimo} onChange={handleInputChange} />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField name="stock_maximo" label="Stock Máximo" type="number" fullWidth size="small" value={formData.stock_maximo} onChange={handleInputChange} />
                </Grid>
                <Grid xs={12}>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <FormControlLabel control={<Switch checked={formData.controla_stock} onChange={handleInputChange} name="controla_stock" />} label="Controla Stock" />
                    <FormControlLabel control={<Switch checked={formData.permite_stock_negativo} onChange={handleInputChange} name="permite_stock_negativo" />} label="Permite Stock Negativo" />
                    <FormControlLabel control={<Switch checked={formData.es_componente} onChange={handleInputChange} name="es_componente" />} label="Es Componente" />
                    <FormControlLabel control={<Switch checked={formData.acepta_variantes} onChange={handleInputChange} name="acepta_variantes" disabled={isVariant} />} label="Acepta Variantes" />
                  </Stack>
                </Grid>
              </>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !formData.name.trim() || (!isEditMode && !formData.tipo_articulo_id) || isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? 'Guardar Cambios' : 'Crear')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioArticulo;
