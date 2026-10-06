import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Button, Autocomplete, Chip, InputAdornment, Alert, CircularProgress
} from '@mui/material';
import { FloppyDisk, XCircle } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$ 0.00';
    return amount.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
};

const NuevaFacturaCompra = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data from DB
  const [proveedores, setProveedores] = useState([]);
  const [remitosDisponibles, setRemitosDisponibles] = useState([]);

  // Form state
  const [proveedor, setProveedor] = useState(null);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split('T')[0]);
  const [remitosSeleccionados, setRemitosSeleccionados] = useState([]);
  const [totalRemitos, setTotalRemitos] = useState(0);
  const [totalFactura, setTotalFactura] = useState('');
  const [diferencia, setDiferencia] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // Load initial data (proveedores)
  useEffect(() => {
    const fetchProveedores = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('com_proveedores')
        .select('*')
        .eq('activo', true);
      
      if (error) {
        enqueueSnackbar('Error al cargar proveedores.', { variant: 'error' });
      } else {
        setProveedores(data);
      }
      setLoading(false);
    };
    fetchProveedores();
  }, [enqueueSnackbar]);

  // Fetch available remitos when a provider is selected
  useEffect(() => {
    const fetchRemitos = async () => {
      if (proveedor) {
        const { data, error } = await supabase
          .from('v_remitos_pendientes_facturacion')
          .select('*')
          .eq('proveedor_id', proveedor.id);
        
        if (error) {
          enqueueSnackbar('Error al cargar remitos pendientes.', { variant: 'error' });
          setRemitosDisponibles([]);
        } else {
          setRemitosDisponibles(data);
        }
        setRemitosSeleccionados([]); // Reset selection when provider changes
      } else {
        setRemitosDisponibles([]);
        setRemitosSeleccionados([]);
      }
    };
    fetchRemitos();
  }, [proveedor, enqueueSnackbar]);

  // Calculate total from selected remitos
  useEffect(() => {
    const nuevoTotal = remitosSeleccionados.reduce((sum, remito) => sum + (remito.total || 0), 0);
    setTotalRemitos(nuevoTotal);
  }, [remitosSeleccionados]);

  // Calculate difference between invoice total and remitos total
  useEffect(() => {
    const numTotalFactura = parseFloat(totalFactura) || 0;
    setDiferencia(numTotalFactura - totalRemitos);
  }, [totalFactura, totalRemitos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proveedor || !numeroFactura || remitosSeleccionados.length === 0 || !totalFactura) {
      enqueueSnackbar('Por favor, completa todos los campos obligatorios.', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const remitosIds = remitosSeleccionados.map(r => r.id);

      const { error } = await supabase.rpc('crear_factura_compra', {
        p_proveedor_id: proveedor.id,
        p_numero_factura: numeroFactura,
        p_fecha_factura: fechaFactura,
        p_total_factura: parseFloat(totalFactura),
        p_observaciones: observaciones,
        p_responsable_id: user.id,
        p_remitos_ids: remitosIds
      });

      if (error) throw error;

      enqueueSnackbar('Factura de compra guardada con éxito.', { variant: 'success' });
      navigate('/compras/facturas');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la factura: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/compras/facturas');
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Cargar Nueva Factura de Compra
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          {/* Fila 1: Proveedor y Fecha */}
          <Grid item xs={12} md={8}>
            <Autocomplete
              options={proveedores}
              getOptionLabel={(option) => option.razon_social}
              value={proveedor}
              onChange={(_, newValue) => setProveedor(newValue)}
              renderInput={(params) => <TextField {...params} label="Proveedor" required />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha de Factura"
              type="date"
              value={fechaFactura}
              onChange={(e) => setFechaFactura(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Fila 2: Número de Factura */}
          <Grid item xs={12} md={8}>
            <TextField
              label="Número de Factura (ej: FA-0001-00123456)"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              fullWidth
              required
            />
          </Grid>

          {/* Fila 3: Remitos */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={remitosDisponibles}
              getOptionLabel={(option) => `${option.numero_remito_proveedor} (${formatCurrency(option.total)})`}
              value={remitosSeleccionados}
              onChange={(_, newValue) => setRemitosSeleccionados(newValue)}
              disabled={!proveedor}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remitos a incluir"
                  placeholder={proveedor ? 'Seleccionar remitos' : 'Primero selecciona un proveedor'}
                  required
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option.numero_remito_proveedor} {...getTagProps({ index })} />
                ))
              }
            />
          </Grid>

          {/* Fila 4: Totales y Discrepancias */}
          <Grid item xs={12} md={6}>
            {remitosSeleccionados.length > 0 && (
              <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                Total según Remitos: <strong>{formatCurrency(totalRemitos)}</strong>
              </Alert>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Total según Factura"
              type="number"
              value={totalFactura}
              onChange={(e) => setTotalFactura(e.target.value)}
              fullWidth
              required
              disabled={remitosSeleccionados.length === 0}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{
                step: "0.01"
              }}
            />
          </Grid>

          {diferencia !== 0 && totalFactura && (
            <Grid item xs={12}>
              <Alert severity={Math.abs(diferencia) > 0.01 ? "warning" : "info"}>
                Existe una diferencia de <strong>{formatCurrency(diferencia)}</strong> entre el total de la factura y la suma de los remitos.
              </Alert>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>

          {/* Fila 5: Acciones */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
                startIcon={<XCircle />}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={<FloppyDisk />}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Factura'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default NuevaFacturaCompra;
