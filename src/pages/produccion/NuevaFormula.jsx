import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Grid, TextField, Autocomplete, Switch, FormControlLabel, Divider, Dialog, DialogTitle, DialogContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress, Chip, Alert
} from '@mui/material';
import { ArrowLeft, FloppyDisk, PlusCircle, Trash, MagnifyingGlass, LinkSimpleBreak } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const NuevaFormula = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formulaId } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const isViewMode = location.pathname.includes('/ver/');
  const isEditMode = !!formulaId && !isViewMode;

  const [loading, setLoading] = useState(true);
  const [productosTerminados, setProductosTerminados] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [linkedArticleIds, setLinkedArticleIds] = useState(new Set());
  
  const [formula, setFormula] = useState({
    nombre: '',
    articulo_terminado: null,
    version: 1,
    cantidad_base: 1,
    activa: true,
    fecha_ultima_modificacion: new Date().toISOString().split('T')[0], // This is for display
    created_at: new Date().toISOString().split('T')[0], // This is for display
    observaciones: '' // New field
  });
  const [detalle, setDetalle] = useState([]);
  const [ingredienteActual, setIngredienteActual] = useState({ articulo: null, cantidad: '' });
  const [buscadorArticulosOpen, setBuscadorArticulosOpen] = useState(false);
  const [buscadorProductoTerminadoOpen, setBuscadorProductoTerminadoOpen] = useState(false);
  const [buscadorProductoTerminadoSearchTerm, setBuscadorProductoTerminadoSearchTerm] = useState('');
  const [buscadorSearchTerm, setBuscadorSearchTerm] = useState('');

  const fetchCatalogs = useCallback(async () => {
    try {
      const { data: articulosData, error: articulosError } = await supabase.from('stk_articulos').select('*');
      if (articulosError) throw articulosError;

      setProductosTerminados(articulosData.filter(a => a.proposito_comercial === 'Solo Venta' && a.es_componente !== true));
      setMateriasPrimas(articulosData.filter(a => a.es_componente === true));
    } catch (error) {
      enqueueSnackbar(`Error cargando catálogos: ${error.message}`, { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const loadFormulaData = useCallback(async () => {
    if (!formulaId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('prod_formulas')
        .select(`*,
          articulo_terminado:articulo_terminado_id(*),
          detalle:prod_formulas_detalle(id, cantidad, articulo:articulo_componente_id(*))
        `)
        .eq('id', formulaId)
        .single();

      if (error) throw error;

      setFormula({
        nombre: data.nombre,
        articulo_terminado: data.articulo_terminado,
        version: data.version,
        cantidad_base: data.cantidad_base,
        activa: data.activa,
        fecha_ultima_modificacion: data.fecha_ultima_modificacion ? new Date(data.fecha_ultima_modificacion).toISOString().split('T')[0] : new Date(data.created_at).toISOString().split('T')[0], // For display
        created_at: new Date(data.created_at).toISOString().split('T')[0], // For display
        observaciones: data.observaciones || '' // Load observations
      });
      setDetalle(data.detalle.map(d => ({ articulo: d.articulo, cantidad: d.cantidad })));

    } catch (error) {
      enqueueSnackbar(`Error al cargar la fórmula: ${error.message}`, { variant: 'error' });
      navigate('/produccion/formulas');
    }
  }, [formulaId, navigate, enqueueSnackbar]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await fetchCatalogs();

        let query = supabase.from('prod_formulas').select('articulo_terminado_id').eq('activa', true);
        if (isEditMode) {
          query = query.not('id', 'eq', formulaId);
        }
        const { data: existingFormulas, error: formulasError } = await query;
        if (formulasError) throw formulasError;
        setLinkedArticleIds(new Set(existingFormulas.map(f => f.articulo_terminado_id).filter(Boolean)));

        if (isEditMode || isViewMode) {
          await loadFormulaData();
        }
      } catch (error) {
        enqueueSnackbar('Ocurrió un error al inicializar el formulario.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [isEditMode, isViewMode, formulaId, fetchCatalogs, loadFormulaData, enqueueSnackbar]);

  const handleAddItem = () => {
    if (!ingredienteActual.articulo || !ingredienteActual.cantidad) {
      enqueueSnackbar('Seleccione una materia prima y una cantidad.', { variant: 'warning' });
      return;
    }
    setDetalle(prev => [...prev, { ...ingredienteActual, cantidad: parseFloat(ingredienteActual.cantidad) }]);
    setIngredienteActual({ articulo: null, cantidad: '' });
  };

  const handleRemoveItem = (index) => {
    setDetalle(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenBuscador = () => {
    setBuscadorArticulosOpen(true);
  };

  const handleOpenBuscadorProductoTerminado = () => {
    setBuscadorProductoTerminadoOpen(true);
  };

  const handleSave = async () => {
    if (!formula.nombre || !formula.articulo_terminado || detalle.length === 0) {
      enqueueSnackbar('Debe completar el nombre, el producto y agregar al menos un ingrediente.', { variant: 'error' });
      return;
    }

    const dataToSave = {
      p_formula_id: isEditMode ? parseInt(formulaId) : null,
      p_nombre: formula.nombre,
      p_articulo_terminado_id: formula.articulo_terminado.id,
      p_cantidad_base: parseFloat(formula.cantidad_base) || 1,
      p_activa: formula.activa,
      p_observaciones: formula.observaciones, // Pass observations
      p_detalle: detalle.map(item => ({
        articulo_id: item.articulo.id,
        cantidad: item.cantidad
      }))
    };

    try {
      const { error } = await supabase.rpc('guardar_formula', dataToSave);
      if (error) throw error;

      enqueueSnackbar(`Fórmula ${isEditMode ? 'actualizada' : 'guardada'} con éxito.`, { variant: 'success' });
      navigate('/produccion/formulas');
    } catch (error) {
      enqueueSnackbar(`Error al guardar la fórmula: ${error.message}`, { variant: 'error' });
    }
  };

  const handleSelectArticulo = (articulo) => {
    setIngredienteActual(prev => ({ ...prev, articulo: articulo }));
    setBuscadorArticulosOpen(false);
  };

  const handleSelectProductoTerminado = (articulo) => {
    setFormula(p => ({ ...p, articulo_terminado: articulo }));
    setBuscadorProductoTerminadoOpen(false);
  };

  const filteredPopupArticulos = useMemo(() => {
    if (!buscadorSearchTerm) return materiasPrimas;
    const term = buscadorSearchTerm.toLowerCase();
    return materiasPrimas.filter(art =>
        (art.code && art.code.toLowerCase().includes(term)) ||
        (art.name && art.name.toLowerCase().includes(term))
    );
  }, [materiasPrimas, buscadorSearchTerm]);

  const filteredPopupProductosTerminados = useMemo(() => {
    if (!buscadorProductoTerminadoSearchTerm) return productosTerminados;
    const term = buscadorProductoTerminadoSearchTerm.toLowerCase();
    return productosTerminados.filter(art =>
        (art.code && art.code.toLowerCase().includes(term)) ||
        (art.name && art.name.toLowerCase().includes(term))
    );
  }, [productosTerminados, buscadorProductoTerminadoSearchTerm]);

  const isArticuloYaEnlazado = useMemo(() => {
    if (!formula.articulo_terminado) return false;
    return linkedArticleIds.has(formula.articulo_terminado.id);
  }, [formula.articulo_terminado, linkedArticleIds]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          {isEditMode ? `Editando Fórmula N° ${formulaId}` : isViewMode ? `Viendo Fórmula N° ${formulaId}` : 'Nueva Fórmula'}
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/produccion/formulas')} sx={{ mr: 2 }}>Volver</Button>
          {!isViewMode && <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSave}>Guardar Fórmula</Button>}
        </Box>
      </Box>
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField label="Nombre de la Fórmula" fullWidth value={formula.nombre} onChange={(e) => setFormula(p => ({ ...p, nombre: e.target.value }))} disabled={isViewMode} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField label="Versión" fullWidth value={formula.version} disabled />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField label={isEditMode || isViewMode ? "Última Modificación" : "Fecha Creación"} type="date" InputLabelProps={{ shrink: true }} fullWidth value={isEditMode || isViewMode ? formula.fecha_ultima_modificacion : formula.created_at} disabled />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel control={<Switch checked={formula.activa} onChange={(e) => setFormula(p => ({ ...p, activa: e.target.checked }))} disabled={isViewMode} />} label="Fórmula Activa" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={productosTerminados}
            getOptionLabel={(option) => option ? 
              `${option.name}${option.variant_name ? ` - ${option.variant_name}` : ''}` 
              : ''}
            value={formula.articulo_terminado}
            renderOption={(props, option) => <li {...props} key={option.id}>{`${option.name}${option.variant_name ? ` - ${option.variant_name}` : ''}`}</li>}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, newValue) => setFormula(p => ({ ...p, articulo_terminado: newValue }))}
            renderInput={(params) => <TextField {...params} label="Producto Terminado a Fabricar" />}
            disabled={isViewMode}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
            <Button variant="outlined" startIcon={<MagnifyingGlass />} onClick={handleOpenBuscadorProductoTerminado} fullWidth sx={{ height: '100%' }} disabled={isViewMode}>
              Buscar
            </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Para fabricar (Cantidad Base)" type="number" fullWidth value={formula.cantidad_base} onChange={(e) => setFormula(p => ({ ...p, cantidad_base: e.target.value }))} helperText="Ej: la receta es para 1 m³" disabled={isViewMode} />
        </Grid>
        {isArticuloYaEnlazado && !isViewMode && (
          <Grid item xs={12}>
            <Alert severity="warning" icon={<LinkSimpleBreak size={20} />}>
              ¡Atención! Este producto ya tiene una fórmula activa. Si guarda esta como "activa", la anterior se desactivará automáticamente.
            </Alert>
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12}><TextField label="Observaciones" fullWidth multiline rows={3} value={formula.observaciones} onChange={(e) => setFormula(p => ({ ...p, observaciones: e.target.value }))} disabled={isViewMode} /></Grid>
      </Grid>

      <Divider sx={{ my: 3 }}><Chip label={isViewMode ? "Detalle de Ingredientes" : "Ingredientes"} /></Divider>

      {!isViewMode && (
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={materiasPrimas}
            key={(ingredienteActual.articulo?.id)}
            getOptionLabel={(option) => option ? 
              `${option.name}${option.variant_name ? ` - ${option.variant_name}` : ''}` 
              : ''}
            renderOption={(props, option) => <li {...props} key={option.id}>{`${option.name}${option.variant_name ? ` - ${option.variant_name}` : ''}`}</li>}
            value={ingredienteActual.articulo}
            onChange={(_, newValue) => setIngredienteActual(p => ({ ...p, articulo: newValue }))}
            renderInput={(params) => <TextField {...params} label="Materia Prima / Componente" />}
            disabled={isViewMode}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            value={ingredienteActual.cantidad}
            onChange={(e) => setIngredienteActual(p => ({ ...p, cantidad: e.target.value }))}
            InputProps={{
              endAdornment: <Typography variant="caption" color="text.secondary">{ingredienteActual.articulo?.unidad_medida || ''}</Typography>
            }}
            disabled={isViewMode}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
            <Button variant="outlined" startIcon={<MagnifyingGlass />} onClick={handleOpenBuscador} fullWidth disabled={isViewMode}>
              Buscar
            </Button>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button variant="outlined" startIcon={<PlusCircle />} onClick={handleAddItem} fullWidth disabled={isViewMode}>
            Agregar
          </Button>
        </Grid>
      </Grid>
      )}
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Componente</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              {!isViewMode && <TableCell align="center">Acción</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {detalle.length === 0 ? (
              <TableRow><TableCell colSpan={3} align="center">Agregue ingredientes a la fórmula.</TableCell></TableRow>
            ) : detalle.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{`${item.articulo.name}${item.articulo.variant_name ? ` - ${item.articulo.variant_name}` : ''}`}</TableCell>
                <TableCell align="right">{item.cantidad} {item.articulo.unidad_medida}</TableCell>
                {!isViewMode && <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}><Trash /></IconButton>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
    <Dialog open={buscadorArticulosOpen} onClose={() => setBuscadorArticulosOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Seleccionar Materia Prima</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Buscar por código o nombre..."
            type="text"
            fullWidth
            variant="standard"
            value={buscadorSearchTerm}
            onChange={(e) => setBuscadorSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper} sx={{ mt: 1, maxHeight: '60vh' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPopupArticulos.map((articulo) => (
                  <TableRow key={articulo.id}>
                    <TableCell>{`${articulo.name}${articulo.variant_name ? ` - ${articulo.variant_name}` : ''}`}</TableCell>
                    <TableCell align="center">
                      <Button onClick={() => handleSelectArticulo(articulo)}>
                        Seleccionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    <Dialog open={buscadorProductoTerminadoOpen} onClose={() => setBuscadorProductoTerminadoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Seleccionar Producto Terminado</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Buscar por código o nombre..."
            type="text"
            fullWidth
            variant="standard"
            value={buscadorProductoTerminadoSearchTerm}
            onChange={(e) => setBuscadorProductoTerminadoSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper} sx={{ mt: 1, maxHeight: '60vh' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPopupProductosTerminados.map((articulo) => (
                  <TableRow key={articulo.id}>
                    <TableCell>{`${articulo.name}${articulo.variant_name ? ` - ${articulo.variant_name}` : ''}`}</TableCell>
                    <TableCell align="center">
                      <Button onClick={() => handleSelectProductoTerminado(articulo)}>Seleccionar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NuevaFormula;
