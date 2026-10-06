import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Typography,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import { PlusCircle, Trash } from 'phosphor-react';

const FormularioIngresoManual = ({ onSuccess, onCancel }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [articles, setArticles] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [depositoId, setDepositoId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([{ articulo: null, cantidad: '' }]);
  const [provisionalId, setProvisionalId] = useState('Cargando...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const articlesPromise = supabase.from('stk_articulos').select('id, name, code, unidad_medida').eq('activo', true);
        const depositosPromise = supabase.from('stk_depositos').select('id, nombre');
        const lastIdPromise = supabase
          .from('stk_movimientos_stock')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const [articlesRes, depositosRes, lastIdRes] = await Promise.all([
          articlesPromise,
          depositosPromise,
          lastIdPromise,
        ]);

        if (articlesRes.error) throw articlesRes.error;
        if (depositosRes.error) throw depositosRes.error;
        // PGRST116 significa que no se encontraron filas, lo cual está bien si es el primer movimiento.
        if (lastIdRes.error && lastIdRes.error.code !== 'PGRST116') {
          throw lastIdRes.error;
        }

        setArticles(articlesRes.data);
        setDepositos(depositosRes.data);

        const nextId = lastIdRes.data ? lastIdRes.data.id + 1 : 1;
        setProvisionalId(`${nextId} (provisional)`);

      } catch (error) {
        enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
        setProvisionalId('Error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [enqueueSnackbar]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { articulo: null, cantidad: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!depositoId || items.some(item => !item.articulo || !item.cantidad || Number(item.cantidad) <= 0)) {
      enqueueSnackbar('Completa el depósito y todos los artículos con cantidad positiva.', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const itemsParaEnviar = items.map(item => ({
        articulo_id: item.articulo.id,
        cantidad: Number(item.cantidad)
      }));

      const { error } = await supabase.rpc('crear_ingreso_manual', {
        p_fecha: fecha,
        p_referencia: referencia || 'Ingreso Manual',
        p_observaciones: observaciones,
        p_responsable_id: user?.id,
        p_deposito_id: depositoId,
        p_items: itemsParaEnviar
      });

      if (error) throw error;

      enqueueSnackbar('Ingreso manual registrado con éxito', { variant: 'success' });
      onSuccess();

    } catch (error) {
      enqueueSnackbar(`Error al registrar el ingreso: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Box component="div" sx={{ p: 2 }}>
      <Stack spacing={3}>
        
{/* Section 1: Header */}
        <Stack spacing={4}>
          {/* Row 1: Código, Depósito, Fecha */}
          <Grid container spacing={2} justifyContent="space-between" alignItems="center">
            {/* Left Group */}
            <Grid item xs="auto">
              <Stack direction="row" spacing={3} alignItems="center">
                <TextField 
                  label="Código Movimiento" 
                  value={provisionalId} 
                  size="small" 
                  disabled 
                  InputProps={{
                    readOnly: true,
                    sx: { fontStyle: 'italic' }
                  }}
                  sx={{ width: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel id="deposito-destino-label">Depósito de Destino</InputLabel>
                  <Select 
                    labelId="deposito-destino-label"
                    value={depositoId} 
                    label="Depósito de Destino" 
                    onChange={(e) => setDepositoId(e.target.value)}
                  >
                    {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            
            {/* Right Group */}
            <Grid item xs="auto">
              <TextField 
                label="Fecha" 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)} 
                InputLabelProps={{ shrink: true }} 
                size="small" 
                sx={{ width: 180 }}
              />
            </Grid>
          </Grid>

          {/* Row 2: Referencia y Observaciones */}
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Referencia" 
                value={referencia} 
                onChange={(e) => setReferencia(e.target.value)} 
                fullWidth 
                size="small" 
                sx={{ width: 220 }}
              />
            </Grid>
            <Grid item xs={12} sm={12}>
              <TextField 
                label="Observaciones" 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)} 
                fullWidth 
                size="small" 
                sx={{ width: 575 }}
              />
            </Grid>
          </Grid>
        </Stack>

        <Divider />

        {/* Section 2: Items Table */}
        <Box>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 500 }}>
            Artículos a Ingresar
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '60%', p: 1.5 }}>Artículo</TableCell>
                  <TableCell sx={{ p: 1.5 }}>Cantidad</TableCell>
                  <TableCell sx={{ p: 1.5, textAlign: 'center' }}>Unidad</TableCell>
                  <TableCell align="right" sx={{ p: 1.5 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ p: 1 }}>
                      <Autocomplete
                        options={articles}
                        getOptionLabel={(option) => `${option.code || 'S/C'} - ${option.name}`}
                        value={item.articulo}
                        onChange={(event, newValue) => handleItemChange(index, 'articulo', newValue)}
                        renderInput={(params) => <TextField {...params} placeholder="Buscar artículo..." variant="outlined" size="small" />}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1, width: '100px' }}>
                      <TextField 
                        type="number" 
                        variant="outlined" 
                        size="small"
                        value={item.cantidad} 
                        onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} 
                        inputProps={{ min: 0 }} 
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.articulo?.unidad_medida || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ p: 1 }}>
                      <IconButton onClick={() => handleRemoveItem(index)} color="error" disabled={items.length === 1}><Trash /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<PlusCircle />} onClick={handleAddItem} sx={{ mt: 2 }}>Añadir Fila</Button>
        </Box>
        
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button onClick={onCancel} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar Ingreso'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default FormularioIngresoManual;
