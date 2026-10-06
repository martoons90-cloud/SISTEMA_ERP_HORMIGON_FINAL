import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Button, Autocomplete, Checkbox,
  List, ListItem, ListItemText, ListItemIcon, Divider, Alert, CircularProgress
} from '@mui/material';
import { FloppyDisk, XCircle } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const METODOS_PAGO = ['Transferencia Bancaria', 'Efectivo', 'Cheque', 'Tarjeta de Crédito'];

const NuevaOrdenPago = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data from DB
  const [proveedores, setProveedores] = useState([]);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [notasCreditoPendientes, setNotasCreditoPendientes] = useState([]);

  // Form state
  const [proveedor, setProveedor] = useState(null);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [notasCreditoSeleccionadas, setNotasCreditoSeleccionadas] = useState([]);
  const [metodoPago, setMetodoPago] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Load initial data (proveedores)
  useEffect(() => {
    const fetchProveedores = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('com_proveedores')
        .select('id, razon_social')
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

  // Fetch pending documents when a provider is selected
  useEffect(() => {
    const fetchDocumentos = async () => {
      if (proveedor) {
        setLoading(true);
        try {
          const [facturasRes, ncRes] = await Promise.all([
            supabase.from('com_facturas_compra').select('*').eq('proveedor_id', proveedor.id).eq('estado', 'PENDIENTE DE PAGO'),
            supabase.from('com_notas_credito_proveedor').select('*').eq('proveedor_id', proveedor.id).eq('estado', 'PENDIENTE')
          ]);

          if (facturasRes.error) throw facturasRes.error;
          setFacturasPendientes(facturasRes.data);

          if (ncRes.error) throw ncRes.error;
          setNotasCreditoPendientes(ncRes.data);

        } catch (error) {
          enqueueSnackbar(`Error al cargar documentos: ${error.message}`, { variant: 'error' });
        } finally {
          setLoading(false);
        }
      } else {
        setFacturasPendientes([]);
        setNotasCreditoPendientes([]);
      }
      setFacturasSeleccionadas([]);
      setNotasCreditoSeleccionadas([]);
    };
    fetchDocumentos();
  }, [proveedor, enqueueSnackbar]);

  const handleToggle = (item, list, setList) => () => {
    const currentIndex = list.findIndex(i => i.id === item.id);
    const newList = [...list];

    if (currentIndex === -1) {
      newList.push(item);
    } else {
      newList.splice(currentIndex, 1);
    }
    setList(newList);
  };

  const totales = useMemo(() => {
    const totalFacturas = facturasSeleccionadas.reduce((sum, f) => sum + f.total, 0);
    const totalNC = notasCreditoSeleccionadas.reduce((sum, nc) => sum + nc.total, 0);
    const totalAPagar = totalFacturas - totalNC;
    return { totalFacturas, totalNC, totalAPagar };
  }, [facturasSeleccionadas, notasCreditoSeleccionadas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proveedor || facturasSeleccionadas.length === 0 || !metodoPago) {
      enqueueSnackbar('Debe seleccionar un proveedor, al menos una factura y un método de pago.', { variant: 'warning' });
      return;
    }
    if (totales.totalAPagar < 0) {
        enqueueSnackbar('El total a pagar no puede ser negativo. Ajuste las notas de crédito seleccionadas.', { variant: 'error' });
        return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('registrar_orden_pago', {
        p_proveedor_id: proveedor.id,
        p_fecha_pago: fechaPago,
        p_metodo_pago: metodoPago,
        p_referencia_pago: referenciaPago,
        p_observaciones: observaciones,
        p_responsable_id: user.id,
        p_facturas_ids: facturasSeleccionadas.map(f => f.id),
        p_notas_credito_ids: notasCreditoSeleccionadas.map(nc => nc.id)
      });

      if (error) throw error;

      enqueueSnackbar('Orden de Pago guardada con éxito.', { variant: 'success' });
      navigate('/tesoreria/pagos');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la Orden de Pago: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Nueva Orden de Pago
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
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha de Pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              disabled={isSubmitting}
            />
          </Grid>

          {/* Fila 2: Documentos a Pagar */}
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>Facturas Pendientes de Pago</Typography>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {facturasPendientes.length === 0 ? (
                  <ListItem><ListItemText primary="No hay facturas pendientes para este proveedor." /></ListItem>
                ) : facturasPendientes.map(factura => (
                  <ListItem key={factura.id} button onClick={handleToggle(factura, facturasSeleccionadas, setFacturasSeleccionadas)} disabled={!proveedor || isSubmitting}>
                    <ListItemIcon><Checkbox edge="start" checked={facturasSeleccionadas.some(f => f.id === factura.id)} tabIndex={-1} disableRipple /></ListItemIcon>
                    <ListItemText primary={`Factura N° ${factura.numero_factura}`} secondary={`Fecha: ${formatDate(factura.fecha_factura)} - Total: ${formatCurrency(factura.total)}`} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="h6" gutterBottom>Notas de Crédito Disponibles</Typography>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {notasCreditoPendientes.length === 0 ? (
                  <ListItem><ListItemText primary="No hay notas de crédito disponibles." /></ListItem>
                ) : notasCreditoPendientes.map(nc => (
                  <ListItem key={nc.id} button onClick={handleToggle(nc, notasCreditoSeleccionadas, setNotasCreditoSeleccionadas)} disabled={!proveedor || isSubmitting}>
                    <ListItemIcon><Checkbox edge="start" checked={notasCreditoSeleccionadas.some(n => n.id === nc.id)} tabIndex={-1} disableRipple /></ListItemIcon>
                    <ListItemText primary={`NC N° ${nc.numero_nota_credito}`} secondary={`Fecha: ${formatDate(nc.fecha_nota_credito)} - Total: ${formatCurrency(nc.total)}`} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Fila 3: Resumen y Totales */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Grid container spacing={2}>
                <Grid item xs={4}><Typography>Total Facturas: <strong>{formatCurrency(totales.totalFacturas)}</strong></Typography></Grid>
                <Grid item xs={4}><Typography>Total NC Aplicadas: <strong style={{color: 'green'}}>-{formatCurrency(totales.totalNC)}</strong></Typography></Grid>
                <Grid item xs={4}><Typography variant="h6">Total a Pagar: {formatCurrency(totales.totalAPagar)}</Typography></Grid>
              </Grid>
            </Alert>
          </Grid>

          {/* Fila 4: Datos del Pago */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={METODOS_PAGO}
              value={metodoPago}
              onChange={(_, newValue) => setMetodoPago(newValue)}
              renderInput={(params) => <TextField {...params} label="Método de Pago" required />}
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Referencia del Pago (N° Cheque, ID Transferencia, etc.)"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              fullWidth
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={isSubmitting}
            />
          </Grid>

          {/* Fila 5: Acciones */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button variant="outlined" color="secondary" onClick={() => navigate('/tesoreria/pagos')} startIcon={<XCircle />} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting || totales.totalAPagar < 0} startIcon={<FloppyDisk />}>
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Guardar Pago'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default NuevaOrdenPago;
