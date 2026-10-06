import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Grid, TextField,
  CircularProgress, Tooltip, ToggleButtonGroup, ToggleButton, FormLabel,
  FormControlLabel, Switch
} from '@mui/material';
import { FloppyDisk, Info } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const ConfiguracionLogistica = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_configuracion')
        .select('*')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found, which is ok
      setConfig(data || {});
    } catch (error) {
      enqueueSnackbar('Error al cargar la configuración: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : (type === 'number'
          ? (parseFloat(value) || 0)
          : value),
    }));
  };

  const handleSave = async () => {
    const { error } = await supabase.from('log_configuracion').upsert({ ...config, id: 1 }); // Siempre usamos id=1 para la única fila de config
    if (error) {
      enqueueSnackbar('Error al guardar la configuración: ' + error.message, { variant: 'error' });
    } else {
      enqueueSnackbar('Configuración de logística guardada con éxito.', { variant: 'success' });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Configuración de Tiempos de Logística
        </Typography>
        <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSave}>
          Guardar Cambios
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <FormLabel component="legend">Base para la "Hora Programada"</FormLabel>
          <ToggleButtonGroup
            color="primary"
            value={config.programar_en_base_a || 'llegada_obra'}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) {
                handleChange({ target: { name: 'programar_en_base_a', value: newValue } });
              }
            }}
            aria-label="base para la programación"
          >
            <ToggleButton value="llegada_obra">Llegada a Obra</ToggleButton>
            <ToggleButton value="inicio_carga">Inicio de Carga</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Margen de Anticipación (minutos)"
              name="margen_anticipacion_minutos"
              value={config.margen_anticipacion_minutos || ''}
              onChange={handleChange}
              helperText="Cuánto intentar adelantar el primer viaje de un pedido."
            />
        </Grid>
        <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch checked={config.anticipar_primer_viaje || false} onChange={handleChange} name="anticipar_primer_viaje" />
              }
              label="Anticipar primer viaje si es posible"
              helperText="Si está desactivado, intentará cumplir la hora exacta."
            />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Tiempos de Descarga y Frecuencia</Typography>
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Descarga Fijo (minutos)"
            name="tiempo_descarga_fijo"
            value={config.tiempo_descarga_fijo || ''}
            onChange={handleChange}
            helperText="Tiempo para posicionarse en obra y preparar la descarga."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Ratio de Descarga (minutos por m³)"
            name="ratio_descarga"
            value={config.ratio_descarga || ''}
            onChange={handleChange}
            helperText="Tiempo que tarda en descargarse cada metro cúbico."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Llegada Ideal: Minutos ANTES de fin de descarga"
            name="intervalo_ideal_min_llegada"
            value={config.intervalo_ideal_min_llegada || ''}
            onChange={handleChange}
            helperText="Inicio de la ventana ideal. Ej: 5 min antes de que termine el camión anterior."
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Llegada Ideal: Minutos DESPUÉS de fin de descarga"
            name="intervalo_ideal_max_llegada"
            value={config.intervalo_ideal_max_llegada || ''}
            onChange={handleChange}
            helperText="Fin de la ventana ideal. Ej: 15 min después de que termine el camión anterior."
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Espera en Obra (min)"
            name="tiempo_espera_descarga"
            value={config.tiempo_espera_descarga || ''}
            onChange={handleChange}
            helperText="Tiempo desde que el camión llega a obra hasta que inicia la descarga."
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Tiempo Máx. Continuidad en Obra (min)"
            name="tiempo_max_continuidad_obra"
            value={config.tiempo_max_continuidad_obra || ''}
            onChange={handleChange}
            helperText="Tiempo máximo entre el fin de una descarga y el inicio de la siguiente en la misma obra."
            sx={{ mt: 2 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Tiempos de Carga (Default)</Typography>
          <TextField
            fullWidth
            type="number"
            label="Tiempo Fijo de Carga (min)"
            name="tiempo_carga_fijo"
            value={config.tiempo_carga_fijo || ''}
            onChange={handleChange}
            helperText="Tiempo base de carga. Usado si no se define en la planta."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Ratio de Carga (min/m³)"
            name="ratio_carga"
            value={config.ratio_carga || ''}
            onChange={handleChange}
            helperText="Default si no se define en la planta."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Maniobra de Salida (min)"
            name="tiempo_maniobra_salida"
            value={config.tiempo_maniobra_salida || ''}
            onChange={handleChange}
            helperText="Tiempo entre Fin de Carga y Salida de Planta."
          />
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Lavado (min)"
            name="tiempo_lavado"
            value={config.tiempo_lavado || ''}
            onChange={handleChange}
            helperText="Tiempo que el camión necesita para lavarse al volver a planta."
            sx={{ mt: 2 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Tiempos de Viaje (Default)</Typography>
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Viaje IDA (minutos)"
            name="tiempo_viaje_ida_default"
            value={config.tiempo_viaje_ida_default || ''}
            onChange={handleChange}
            helperText="Default: Planta -> Obra. Se usa si no hay GPS."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Tiempo de Viaje VUELTA (minutos)"
            name="tiempo_viaje_vuelta_default"
            value={config.tiempo_viaje_vuelta_default || ''}
            onChange={handleChange}
            helperText="Default: Obra -> Planta. Se usa si no hay GPS."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Cálculo de Rutas</Typography>
          <FormControlLabel
            control={
              <Switch checked={config.usar_tiempos_viaje_default || false} onChange={handleChange} name="usar_tiempos_viaje_default" />
            }
            label="Forzar uso de tiempos de viaje por defecto"
            helperText="Ignora el cálculo por GPS y usa los valores por defecto."
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Automatización</Typography>
           <FormControlLabel
            control={
              <Switch
                checked={config.reoptimizar_al_actualizar_tiempos || false}
                onChange={handleChange}
                name="reoptimizar_al_actualizar_tiempos"
              />
            }
            label="Re-optimizar automáticamente al ingresar tiempos reales"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Si está activado, el sistema recalculará la programación del día cada vez que se guarde un tiempo real (ej. llegada a obra), ajustando los viajes posteriores.
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ConfiguracionLogistica;
