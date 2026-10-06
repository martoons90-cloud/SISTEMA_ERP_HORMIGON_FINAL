import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const EditarFacturaCompra = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { facturaId } = useParams();

  // State
  const [loading, setLoading] = useState(true);
  const [facturaOriginal, setFacturaOriginal] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState('');
  const [remitosSeleccionados, setRemitosSeleccionados] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [remitosDisponibles, setRemitosDisponibles] = useState([]);
  const [totalRemitos, setTotalRemitos] = useState(0);
  const [totalFactura, setTotalFactura] = useState('');
  const [diferencia, setDiferencia] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load invoice data
  useEffect(() => {
    const fetchFacturaData = async () => {
      setLoading(true);
      try {
        const id = parseInt(facturaId, 10);

        // 1. Fetch the invoice header and provider
        const { data: facturaData, error: facturaError } = await supabase
          .from('com_facturas_compra')
          .select('*, proveedor:com_proveedores(*)')
          .eq('id', id)
          .single();
        if (facturaError) throw facturaError;

        // 2. Fetch currently associated remitos
        const { data: asociadosData, error: asociadosError } = await supabase
          .from('com_facturas_compra_remitos')
          .select('remito:com_remitos_ingreso(*)')
          .eq('factura_compra_id', id);
        if (asociadosError) throw asociadosError;
        const remitosAsociados = asociadosData.map(item => item.remito);

        // 3. Fetch pending remitos for the same provider
        const { data: pendientesData, error: pendientesError } = await supabase
          .from('v_remitos_pendientes_facturacion')
          .select('*')
          .eq('proveedor_id', facturaData.proveedor_id);
        if (pendientesError) throw pendientesError;

        // 4. Set state
        setFacturaOriginal(facturaData);
        setProveedor(facturaData.proveedor);
        setNumeroFactura(facturaData.numero_factura);
        setFechaFactura(facturaData.fecha_factura);
        setTotalFactura(String(facturaData.total));
        setObservaciones(facturaData.observaciones || '');
        setRemitosSeleccionados(remitosAsociados);
        
        // Available remitos are the pending ones plus the ones already associated with this invoice
        const remitosDisponiblesUnicos = [...remitosAsociados, ...pendientesData];
        const remitosMap = new Map(remitosDisponiblesUnicos.map(r => [r.id, r]));
        setRemitosDisponibles(Array.from(remitosMap.values()));

      } catch (error) {
        enqueueSnackbar(`Error al cargar la factura: ${error.message}`, { variant: 'error' });
        navigate('/compras/facturas');
      } finally {
        setLoading(false);
      }
    };
    fetchFacturaData();
  }, [facturaId, navigate, enqueueSnackbar]);

  // Calculate totals and difference
  useEffect(() => {
    const nuevoTotal = remitosSeleccionados.reduce((sum, remito) => sum + remito.total, 0);
    setTotalRemitos(nuevoTotal);
  }, [remitosSeleccionados]);

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
      const remitosIds = remitosSeleccionados.map(r => r.id);

      const { error } = await supabase.rpc('actualizar_factura_compra', {
        p_factura_id: facturaOriginal.id,
        p_numero_factura: numeroFactura,
        p_fecha_factura: fechaFactura,
        p_total_factura: parseFloat(totalFactura),
        p_observaciones: observaciones,
        p_nuevos_remitos_ids: remitosIds
      });

      if (error) throw error;

      enqueueSnackbar('Factura actualizada con éxito.', { variant: 'success' });
      navigate('/compras/facturas');
    } catch (error) {
      enqueueSnackbar(`Error al actualizar la factura: ${error.message}`, { variant: 'error' });
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
        Editar Factura de Compra N° {facturaOriginal?.numero_factura}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Autocomplete
              options={proveedor ? [proveedor] : []}
              getOptionLabel={(option) => option.razon_social}
              value={proveedor}
              readOnly
              renderInput={(params) => <TextField {...params} label="Proveedor" required />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Fecha de Factura" type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Número de Factura" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={remitosDisponibles}
              getOptionLabel={(option) => `${option.numero_remito_proveedor} (${formatCurrency(option.total)})`}
              value={remitosSeleccionados}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => setRemitosSeleccionados(newValue)}
              disabled={!proveedor}
              renderInput={(params) => <TextField {...params} label="Remitos a incluir" required />}
              renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant="outlined" label={option.numero_remito_proveedor} {...getTagProps({ index })} />)}
            />
          </Grid>
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
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ step: "0.01" }}
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
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button variant="outlined" color="secondary" onClick={handleCancel} startIcon={<XCircle />}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={<FloppyDisk />}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default EditarFacturaCompra;
