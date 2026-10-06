import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, CircularProgress, Alert
} from '@mui/material';
import { ArrowLeft, FloppyDisk } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const NuevaDevolucion = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Estados
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [ordenesConIngreso, setOrdenesConIngreso] = useState([]);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [motivosDevolucion, setMotivosDevolucion] = useState([]);
  const [devolucionDetalle, setDevolucionDetalle] = useState([]);
  const [notaCredito, setNotaCredito] = useState({ numero: '', fecha: new Date().toISOString().split('T')[0] });

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [provRes, motRes] = await Promise.all([
          supabase.from('com_proveedores').select('id, razon_social').eq('activo', true),
          supabase.from('com_motivos_devolucion').select('nombre').eq('activo', true)
        ]);

        if (provRes.error) throw provRes.error;
        setProveedores(provRes.data);

        if (motRes.error) throw motRes.error;
        setMotivosDevolucion(motRes.data);

      } catch (error) {
        enqueueSnackbar(`Error cargando datos iniciales: ${error.message}`, { variant: 'error' });
      }
    };
    fetchInitialData();
  }, [enqueueSnackbar]);

  // Cargar OCs con ingresos cuando se selecciona un proveedor
  useEffect(() => {
    const fetchOrdenes = async () => {
      if (selectedProveedor) {
        const { data: remitosData, error: remitosError } = await supabase
          .from('com_remitos_ingreso')
          .select('orden_compra_id')
          .eq('proveedor_id', selectedProveedor.id)
          .not('orden_compra_id', 'is', null);

        if (remitosError) throw remitosError;
        const ordenesIds = [...new Set(remitosData.map(r => r.orden_compra_id))];

        if (ordenesIds.length > 0) {
            const { data: ordenesData, error: ordenesError } = await supabase
                .from('com_ordenes_compra')
                .select('id, fecha_orden')
                .in('id', ordenesIds);
            
            if (ordenesError) throw ordenesError;
            setOrdenesConIngreso(ordenesData);
        } else {
            setOrdenesConIngreso([]);
        }
      } else {
        setOrdenesConIngreso([]);
      }
      setSelectedOrden(null);
      setDevolucionDetalle([]);
    };
    fetchOrdenes();
  }, [selectedProveedor]);

  // Cargar artículos en la tabla cuando se selecciona una OC
  useEffect(() => {
    const fetchItemsRecibidos = async () => {
      if (selectedOrden) {
        try {
          const { data, error } = await supabase
              .from('v_remitos_con_detalle_para_oc')
              .select('*')
              .eq('orden_compra_id', selectedOrden.id);

          if (error) throw error;
          const detalleParaTabla = data.map(item => ({
              ...item,
              cantidad_a_devolver: '',
              motivo: null
          }));
          setDevolucionDetalle(detalleParaTabla);
        } catch (error) {
          enqueueSnackbar(`Error al cargar artículos de la OC: ${error.message}`, { variant: 'error' });
        }
      } else {
        setDevolucionDetalle([]);
      }
    };
    fetchItemsRecibidos();
  }, [selectedOrden, enqueueSnackbar]);

  const handleDetalleChange = (index, field, value) => {
    const newDetalle = [...devolucionDetalle];
    if (field === 'cantidad_a_devolver') {
      const cantidadNum = parseInt(value, 10) || 0;
      if (cantidadNum > newDetalle[index].cantidad_recibida) {
        enqueueSnackbar('No se puede devolver más de la cantidad recibida.', { variant: 'warning' });
        newDetalle[index][field] = newDetalle[index].cantidad_recibida;
      } else {
        newDetalle[index][field] = cantidadNum < 0 ? 0 : cantidadNum;
      }
    } else {
      newDetalle[index][field] = value;
    }
    setDevolucionDetalle(newDetalle);
  };

  const requiereNotaCredito = useMemo(() => {
    return devolucionDetalle.some(item => item.cantidad_a_devolver > 0 && item.remito_estado === 'FACTURADO');
  }, [devolucionDetalle]);

  const handleGuardar = async () => {
    const itemsADevolver = devolucionDetalle.filter(item => item.cantidad_a_devolver > 0);

    if (!selectedProveedor || !selectedOrden || itemsADevolver.length === 0) {
      enqueueSnackbar('Debe seleccionar Proveedor, OC y especificar la cantidad a devolver para al menos un artículo.', { variant: 'error' });
      return;
    }

    const itemsSinMotivo = itemsADevolver.some(item => !item.motivo);
    if (itemsSinMotivo) {
        enqueueSnackbar('Debe seleccionar un motivo para cada artículo que se devuelve.', { variant: 'warning' });
        return;
    }

    if (requiereNotaCredito && (!notaCredito.numero || !notaCredito.fecha)) {
        enqueueSnackbar('La devolución incluye items facturados. Debe ingresar el N° y Fecha de la Nota de Crédito.', { variant: 'error' });
        return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      const itemsParaEnviar = itemsADevolver.map(item => ({
        articulo_id: item.articulo_id,
        oc_detalle_id: item.oc_detalle_id,
        cantidad_devuelta: item.cantidad_a_devolver,
        motivo: item.motivo
      }));

      const { error } = await supabase.rpc('registrar_devolucion_proveedor', {
        p_proveedor_id: selectedProveedor.id,
        p_orden_compra_id: selectedOrden.id,
        p_observaciones: '',
        p_responsable_id: user.id,
        p_items_devueltos: itemsParaEnviar,
        p_nota_credito_numero: requiereNotaCredito ? notaCredito.numero : null,
        p_nota_credito_fecha: requiereNotaCredito ? notaCredito.fecha : null
      });

      if (error) throw error;

      enqueueSnackbar('Devolución a proveedor guardada con éxito.', { variant: 'success' });
      navigate('/compras/devoluciones');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la devolución: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">Nueva Devolución a Proveedor</Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/compras/devoluciones')} sx={{ mr: 2 }}>Volver</Button>
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleGuardar} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Devolución'}
          </Button>
        </Box>
      </Box>

      {/* --- SELECCIÓN DE PROVEEDOR Y OC --- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={proveedores}
            getOptionLabel={(option) => option.razon_social}
            value={selectedProveedor}
            onChange={(_, newValue) => setSelectedProveedor(newValue)}
            renderInput={(params) => <TextField {...params} label="1. Seleccione Proveedor" />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={ordenesConIngreso}
            getOptionLabel={(option) => `OC N° ${String(option.id).padStart(6, '0')} - ${formatDate(option.fecha_orden)}`}
            disabled={!selectedProveedor}
            value={selectedOrden}
            onChange={(_, newValue) => setSelectedOrden(newValue)}
            renderInput={(params) => <TextField {...params} label="2. Seleccione OC con Ingresos" />}
          />
        </Grid>
      </Grid>

      {requiereNotaCredito && (
        <Box component={Paper} variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'warning.main' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
                Está devolviendo artículos de un remito ya facturado. Es necesario registrar la Nota de Crédito del proveedor.
            </Alert>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField 
                        label="N° Nota de Crédito"
                        value={notaCredito.numero}
                        onChange={(e) => setNotaCredito(prev => ({ ...prev, numero: e.target.value }))}
                        fullWidth
                        required
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        label="Fecha Nota de Crédito"
                        type="date"
                        value={notaCredito.fecha}
                        onChange={(e) => setNotaCredito(prev => ({ ...prev, fecha: e.target.value }))}
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
            </Grid>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* --- TABLA DE ARTÍCULOS A DEVOLVER --- */}
      <Typography variant="h6" gutterBottom>Artículos Recibidos en la Orden de Compra</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              <TableCell>Remito Proveedor</TableCell>
              <TableCell align="right">Cant. Recibida</TableCell>
              <TableCell align="center" sx={{ width: '15%' }}>Cant. a Devolver</TableCell>
              <TableCell sx={{ width: '25%' }}>Motivo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devolucionDetalle.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">Seleccione una Orden de Compra para ver los artículos recibidos.</TableCell></TableRow>
            ) : (
              devolucionDetalle.map((item, index) => (
                <TableRow key={item.remito_detalle_id} sx={{ backgroundColor: item.remito_estado === 'FACTURADO' ? 'rgba(255, 230, 204, 0.3)' : 'inherit' }}>
                  <TableCell>{item.articulo_code} - {item.articulo_name}</TableCell>
                  <TableCell>{item.numero_remito_proveedor}</TableCell>
                  <TableCell align="right">{item.cantidad_recibida}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={item.cantidad_a_devolver}
                      onChange={(e) => handleDetalleChange(index, 'cantidad_a_devolver', e.target.value)}
                      variant="outlined"
                      size="small"
                      inputProps={{ style: { textAlign: 'center' }, min: 0, max: item.cantidad_recibida }}
                      sx={{ width: '100px' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      options={motivosDevolucion.map(m => m.nombre) || []}
                      value={item.motivo}
                      onChange={(_, newValue) => handleDetalleChange(index, 'motivo', newValue)}
                      renderInput={(params) => <TextField {...params} variant="standard" />}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default NuevaDevolucion;
