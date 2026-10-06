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
  Chip,
  Divider
} from '@mui/material';
import { PlusCircle, Trash } from 'phosphor-react';

const FormularioAjusteInventario = ({ onSuccess, onCancel }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [articles, setArticles] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [depositoId, setDepositoId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([{ articulo: null, conteoFisico: '', stockSistema: null, diferencia: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const articlesPromise = supabase.from('stk_articulos').select('id, name, code, unidad_medida').eq('activo', true);
        const depositosPromise = supabase.from('stk_depositos').select('id, nombre');
        
        const [articlesRes, depositosRes] = await Promise.all([
          articlesPromise,
          depositosPromise,
        ]);

        if (articlesRes.error) throw articlesRes.error;
        if (depositosRes.error) throw depositosRes.error;
        
        setArticles(articlesRes.data);
        setDepositos(depositosRes.data);

      } catch (error) {
        enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [enqueueSnackbar]);

  const fetchItemStock = async (articuloId, depoId) => {
    if (!articuloId || !depoId) return null;
    try {
      const { data, error } = await supabase.from('stk_stock_por_deposito').select('stock_actual').eq('articulo_id', articuloId).eq('deposito_id', depoId).single();
      if (error && error.code !== 'PGRST116') throw error; // Ignora el error si no encuentra filas
      return data ? data.stock_actual : 0;
    } catch (err) {
      console.error("Error fetching stock for item:", err);
      return 'Error';
    }
  };

  const updateItem = async (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    item[field] = value;

    if (field === 'articulo' && value && depositoId) {
      item.stockSistema = await fetchItemStock(value.id, depositoId);
    }

    if (item.stockSistema !== null && item.conteoFisico !== '') {
      item.diferencia = Number(item.conteoFisico) - item.stockSistema;
    } else {
      item.diferencia = 0;
    }
    setItems(newItems);
  };

  const handleDepositoChange = async (newDepositoId) => {
    setDepositoId(newDepositoId);
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.articulo) {
          const stock = await fetchItemStock(item.articulo.id, newDepositoId);
          const diferencia = item.conteoFisico !== '' ? Number(item.conteoFisico) - stock : 0;
          return { ...item, stockSistema: stock, diferencia };
        }
        return item;
      })
    );
    setItems(updatedItems);
  };

  const handleAddItem = () => setItems([...items, { articulo: null, conteoFisico: '', stockSistema: null, diferencia: 0 }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!depositoId || items.some(item => !item.articulo || item.conteoFisico === '')) {
      enqueueSnackbar('Completa el depósito y todos los artículos con su conteo físico.', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const itemsToSubmit = items
        .filter(item => item.articulo && item.conteoFisico !== '' && item.diferencia !== 0)
        .map(item => ({
          articulo_id: item.articulo.id,
          nueva_cantidad: Number(item.conteoFisico),
        }));

      if (itemsToSubmit.length === 0) {
        enqueueSnackbar('No hay diferencias de stock para ajustar.', { variant: 'info' });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.rpc('realizar_ajuste_inventario', {
        p_deposito_id: depositoId,
        p_fecha: fecha,
        p_referencia: referencia || 'Ajuste de Inventario',
        p_observaciones: observaciones,
        p_responsable_id: user?.id,
        p_items: itemsToSubmit,
      });

      if (error) throw error;

      enqueueSnackbar('Ajuste de inventario registrado con éxito', { variant: 'success' });
      onSuccess();
    } catch (error) {
      enqueueSnackbar(`Error al registrar el ajuste: ${error.message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;

  return (
    <Box component="div" sx={{ p: 2 }}>
      <Stack spacing={3}>
        
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="deposito-label">Depósito</InputLabel>
                <Select 
                  labelId="deposito-label"
                  value={depositoId} 
                  label="Depósito" 
                  onChange={(e) => handleDepositoChange(e.target.value)}
                >
                  {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Fecha" 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)} 
                fullWidth
                InputLabelProps={{ shrink: true }} 
                size="small" 
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Referencia" 
                value={referencia} 
                onChange={(e) => setReferencia(e.target.value)} 
                fullWidth 
                size="small" 
                placeholder="Ej: Conteo Mensual"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <TextField 
                label="Observaciones" 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)} 
                fullWidth 
                size="small" 
              />
            </Grid>
          </Grid>
        </Stack>

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 500 }}>
            Artículos a Ajustar
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '45%', p: 1.5 }}>Artículo</TableCell>
                  <TableCell align="center">Stock Sistema</TableCell>
                  <TableCell>Conteo Físico</TableCell>
                  <TableCell align="center">Unidad</TableCell>
                  <TableCell align="center">Diferencia</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ p: 1 }}>
                      <Autocomplete 
                        options={articles} 
                        getOptionLabel={(o) => `${o.code || 'S/C'} - ${o.name}`} 
                        value={item.articulo} 
                        onChange={(_, v) => updateItem(index, 'articulo', v)} 
                        renderInput={(p) => <TextField {...p} placeholder="Buscar..." variant="outlined" size="small" />} 
                        isOptionEqualToValue={(o, v) => o.id === v.id} 
                        disabled={!depositoId} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{item.stockSistema ?? 'N/A'}</Typography>
                    </TableCell>
                    <TableCell sx={{ p: 1, width: '120px' }}>
                      <TextField 
                        type="number" 
                        variant="outlined" 
                        size="small" 
                        value={item.conteoFisico} 
                        onChange={(e) => updateItem(index, 'conteoFisico', e.target.value)} 
                        inputProps={{ min: 0 }} 
                        disabled={!item.articulo} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.articulo?.unidad_medida || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia}
                        color={item.diferencia > 0 ? 'success' : item.diferencia < 0 ? 'error' : 'default'} 
                        size="small" 
                        variant="outlined" 
                      />
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
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting} color="warning">
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar Ajuste'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default FormularioAjusteInventario;
