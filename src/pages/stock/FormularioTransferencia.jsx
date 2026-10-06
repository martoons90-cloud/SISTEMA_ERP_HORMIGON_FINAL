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

const FormularioTransferencia = ({ onSuccess, onCancel }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [articles, setArticles] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [depositoOrigenId, setDepositoOrigenId] = useState('');
  const [depositoDestinoId, setDepositoDestinoId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([{ articulo: null, cantidad: '', stockDisponible: null }]);
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
      const { data, error } = await supabase
        .from('stk_stock_por_deposito')
        .select('stock_actual')
        .eq('articulo_id', articuloId)
        .eq('deposito_id', depoId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? data.stock_actual : 0;
    } catch (err) {
      console.error("Error fetching stock for item:", err);
      return 'Error';
    }
  };

  const handleArticleChange = async (index, newArticle) => {
    const newItems = [...items];
    newItems[index].articulo = newArticle;
    if (newArticle && depositoOrigenId) {
      const stock = await fetchItemStock(newArticle.id, depositoOrigenId);
      newItems[index].stockDisponible = stock;
    } else {
      newItems[index].stockDisponible = null;
    }
    setItems(newItems);
  };

  const handleDepositoOrigenChange = async (newDepositoId) => {
    setDepositoOrigenId(newDepositoId);
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.articulo) {
          const stock = await fetchItemStock(item.articulo.id, newDepositoId);
          return { ...item, stockDisponible: stock };
        }
        return item;
      })
    );
    setItems(updatedItems);
  };

  const handleItemCantidadChange = (index, newCantidad) => {
    const newItems = [...items];
    newItems[index].cantidad = newCantidad;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { articulo: null, cantidad: '', stockDisponible: null }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!depositoOrigenId || !depositoDestinoId || items.some(item => !item.articulo || !item.cantidad || Number(item.cantidad) <= 0)) {
      enqueueSnackbar('Completa los depósitos y todos los artículos con cantidad positiva.', { variant: 'warning' });
      return;
    }
    if (depositoOrigenId === depositoDestinoId) {
      enqueueSnackbar('El depósito de origen y destino no pueden ser el mismo.', { variant: 'error' });
      return;
    }
    for (const item of items) {
      if (Number(item.cantidad) > item.stockDisponible) {
        enqueueSnackbar(`Stock insuficiente para "${item.articulo.name}". Disponible: ${item.stockDisponible}`, { variant: 'error' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const itemsToSubmit = items.map(item => ({
        articulo_id: item.articulo.id,
        cantidad: Number(item.cantidad),
      }));

      const { error } = await supabase.rpc('crear_transferencia_stock', {
        p_fecha: fecha,
        p_deposito_origen_id: depositoOrigenId,
        p_deposito_destino_id: depositoDestinoId,
        p_referencia: referencia || 'Transferencia Interna',
        p_observaciones: observaciones,
        p_responsable_id: user?.id,
        p_items: itemsToSubmit,
      });

      if (error) throw error;

      enqueueSnackbar('Transferencia registrada con éxito', { variant: 'success' });
      onSuccess();
    } catch (error) {
      enqueueSnackbar(`Error al registrar la transferencia: ${error.message}`, { variant: 'error' });
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
        
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="deposito-origen-label">Depósito Origen</InputLabel>
                <Select 
                  labelId="deposito-origen-label"
                  value={depositoOrigenId} 
                  label="Depósito Origen" 
                  onChange={(e) => handleDepositoOrigenChange(e.target.value)}
                >
                  {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="deposito-destino-label">Depósito Destino</InputLabel>
                <Select 
                  labelId="deposito-destino-label"
                  value={depositoDestinoId} 
                  label="Depósito Destino" 
                  onChange={(e) => setDepositoDestinoId(e.target.value)}
                >
                  {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
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
            <Grid item xs={12} sm={8}>
              <TextField 
                label="Referencia" 
                value={referencia} 
                onChange={(e) => setReferencia(e.target.value)} 
                fullWidth 
                size="small" 
              />
            </Grid>
          </Grid>
        </Stack>

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 500 }}>
            Artículos a Transferir
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
                        onChange={(event, newValue) => handleArticleChange(index, newValue)}
                        renderInput={(params) => <TextField {...params} placeholder="Buscar artículo..." variant="outlined" size="small" />}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        disabled={!depositoOrigenId}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1, width: '140px' }}>
                      <TextField 
                        type="number" 
                        variant="outlined" 
                        size="small"
                        value={item.cantidad} 
                        onChange={(e) => handleItemCantidadChange(index, e.target.value)} 
                        inputProps={{ min: 0 }} 
                        helperText={item.stockDisponible !== null ? `Disp: ${item.stockDisponible}` : ''}
                        error={item.stockDisponible !== null && Number(item.cantidad) > item.stockDisponible}
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
        
        <TextField 
          label="Observaciones" 
          multiline
          rows={2}
          fullWidth 
          value={observaciones} 
          onChange={(e) => setObservaciones(e.target.value)} 
        />

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button onClick={onCancel} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting} color="info">
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar Transferencia'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default FormularioTransferencia;
