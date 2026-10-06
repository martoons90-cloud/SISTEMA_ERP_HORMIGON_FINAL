import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import { Trash, Plus, PencilSimple, CaretDown } from 'phosphor-react';

// --- Componente de Diálogo para Unidades ---
const UnitDialog = ({ open, onClose, onSave, unit }) => {
  const [formData, setFormData] = useState({ nombre: '', abreviatura: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (unit) {
      setFormData({ nombre: unit.nombre, abreviatura: unit.abreviatura || '' });
    } else {
      setFormData({ nombre: '', abreviatura: '' });
    }
  }, [unit, open]);

  const handleSave = async () => {
    if (!formData.nombre) return;
    setIsSubmitting(true);
    await onSave({ ...unit, ...formData });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{unit ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Nombre de la Unidad"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            fullWidth
          />
          <TextField
            label="Abreviatura (Opcional)"
            value={formData.abreviatura}
            onChange={(e) => setFormData({ ...formData, abreviatura: e.target.value })}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Componente de Diálogo para Tipos de Artículo ---
const TipoDialog = ({ open, onClose, onSave, tipo }) => {
  const [formData, setFormData] = useState({ nombre: '', prefijo: '', color: '#808080' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tipo) {
      setFormData({ nombre: tipo.nombre, prefijo: tipo.prefijo, color: tipo.color || '#808080' });
    } else {
      setFormData({ nombre: '', prefijo: '', color: '#808080' });
    }
  }, [tipo, open]);

  const handleSave = async () => {
    if (!formData.nombre || !formData.prefijo) return;
    setIsSubmitting(true);
    await onSave({ ...tipo, ...formData, prefijo: formData.prefijo.toUpperCase() });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{tipo ? 'Editar Tipo de Artículo' : 'Nuevo Tipo de Artículo'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Nombre del Tipo (Ej: Hormigones)"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            fullWidth
          />
          <TextField
            label="Prefijo (2-3 letras, Ej: HE)"
            value={formData.prefijo}
            inputProps={{ maxLength: 3 }}
            onChange={(e) => setFormData({ ...formData, prefijo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel shrink>Color</InputLabel>
            <TextField
              type="color"
              value={formData.color || '#808080'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            />
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Componente de Panel para Pestañas ---
function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// --- Componente Principal ---
const ConfiguracionStock = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [tabValue, setTabValue] = useState(0);
  const [unidades, setUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchUnidades = useCallback(async () => {
    setLoadingUnidades(true);
    const { data, error } = await supabase.from('stk_unidades_medida').select('*').order('nombre');
    if (error) enqueueSnackbar('Error al cargar unidades: ' + error.message, { variant: 'error' });
    else setUnidades(data);
    setLoadingUnidades(false);
  }, [enqueueSnackbar]);

  const fetchTipos = useCallback(async () => {
    setLoadingTipos(true);
    const { data, error } = await supabase.from('stk_tipos_articulo').select('*').order('nombre');
    if (error) enqueueSnackbar('Error al cargar tipos: ' + error.message, { variant: 'error' });
    else setTipos(data);
    setLoadingTipos(false);
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchUnidades();
    fetchTipos();

    const channel = supabase.channel('configuracion-stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stk_unidades_medida' }, () => fetchUnidades())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stk_tipos_articulo' }, () => fetchTipos())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enqueueSnackbar]);

  const handleSaveUnit = async (unitData) => {
    const { id, ...dataToSave } = unitData;
    const query = id
      ? supabase.from('stk_unidades_medida').update(dataToSave).eq('id', id)
      : supabase.from('stk_unidades_medida').insert(dataToSave);
    const { error } = await query;
    if (error) enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    else enqueueSnackbar(`Unidad ${id ? 'actualizada' : 'creada'} con éxito`, { variant: 'success' });
    if (!error) {
      fetchUnidades();
    }
    setUnitDialogOpen(false);
  };

  const handleSaveTipo = async (tipoData) => {
    const { id, ...dataToSave } = tipoData;
    const query = id
      ? supabase.from('stk_tipos_articulo').update(dataToSave).eq('id', id)
      : supabase.from('stk_tipos_articulo').insert(dataToSave);
    const { error } = await query;
    if (error) enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
    else {
      enqueueSnackbar(`Tipo ${id ? 'actualizado' : 'creado'} con éxito`, { variant: 'success' });
      fetchTipos();
    }
    setTipoDialogOpen(false);
  };

  const handleDeleteRequest = (item, type) => {
    setItemToDelete({ item, type });
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { item, type } = itemToDelete;
    const tableName = type === 'unit' ? 'stk_unidades_medida' : 'stk_tipos_articulo';
    const { error } = await supabase.from(tableName).delete().eq('id', item.id);
    if (error) {
      enqueueSnackbar(`Error al borrar: ${error.message}. Es posible que esté en uso.`, { variant: 'error' });
    } else {
      enqueueSnackbar('Elemento borrado con éxito', { variant: 'info' });
      if (type === 'unit') {
        fetchUnidades();
      } else {
        fetchTipos();
      }
    }
    setConfirmDialogOpen(false);
    setItemToDelete(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <>
      <Paper sx={{ p: 3, width: '100%' }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
          Configuración de Stock
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="pestañas de configuración">
            <Tab label="Generales" id="simple-tab-0" aria-controls="simple-tabpanel-0" />
          </Tabs>
        </Box>
        <CustomTabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            {/* Columna para Unidades de Medida */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Unidades de Medida</Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Accordion sx={{ width: '100%' }}>
                  <AccordionSummary
                    expandIcon={<CaretDown />}
                    sx={{
                      height: 35,
                      minHeight: 35,
                      '&.Mui-expanded': { minHeight: 35 },
                      '& .MuiAccordionSummary-content': { margin: '0px' },
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">Ver/Ocultar Lista</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
                    {loadingUnidades ? <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress /></Box> : (
                      <List dense>
                        {unidades.map((unit) => (
                          <ListItem key={unit.id} secondaryAction={
                            <>
                              <IconButton edge="end" onClick={() => { setEditingUnit(unit); setUnitDialogOpen(true); }}><PencilSimple /></IconButton>
                              <IconButton edge="end" onClick={() => handleDeleteRequest(unit, 'unit')}><Trash /></IconButton>
                            </>
                          }>
                            <ListItemText primary={unit.nombre} secondary={unit.abreviatura || 'Sin abreviatura'} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
                <Button
                  variant="contained"
                  onClick={() => { setEditingUnit(null); setUnitDialogOpen(true); }}
                  aria-label="Añadir nueva unidad de medida"
                  sx={{ minWidth: 'auto', width: '35px', height: '35px', p: 0 }}
                >
                  <Plus size={20} weight="bold" />
                </Button>
              </Stack>
            </Grid>

            {/* Columna para Tipos de Artículo */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Tipos de Artículo</Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Accordion sx={{ width: '100%' }}>
                  <AccordionSummary
                    expandIcon={<CaretDown />}
                    sx={{
                      height: 35,
                      minHeight: 35,
                      '&.Mui-expanded': { minHeight: 35 },
                      '& .MuiAccordionSummary-content': { margin: '0px' },
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">Ver/Ocultar Lista</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
                    {loadingTipos ? <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress /></Box> : (
                      <List dense>
                        {tipos.map((tipo) => (
                          <ListItem key={tipo.id} secondaryAction={
                            <>
                              <IconButton edge="end" onClick={() => { setEditingTipo(tipo); setTipoDialogOpen(true); }}><PencilSimple /></IconButton>
                              <IconButton edge="end" onClick={() => handleDeleteRequest(tipo, 'tipo')}><Trash /></IconButton>
                            </>
                          }>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: tipo.color || '#ccc', border: '1px solid #ddd' }} />
                            </ListItemIcon>
                            <ListItemText primary={tipo.nombre} secondary={`Prefijo: ${tipo.prefijo}`} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
                <Button
                  variant="contained"
                  onClick={() => { setEditingTipo(null); setTipoDialogOpen(true); }}
                  aria-label="Añadir nuevo tipo de artículo"
                  sx={{ minWidth: 'auto', width: '35px', height: '35px', p: 0 }}
                >
                  <Plus size={20} weight="bold" />
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CustomTabPanel>
      </Paper>

      {/* Diálogos */}
      <UnitDialog open={unitDialogOpen} onClose={() => setUnitDialogOpen(false)} onSave={handleSaveUnit} unit={editingUnit} />
      <TipoDialog open={tipoDialogOpen} onClose={() => setTipoDialogOpen(false)} onSave={handleSaveTipo} tipo={editingTipo} />

      {/* Diálogo de Confirmación de Borrado */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Borrado</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres borrar "{itemToDelete?.item.nombre}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Borrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfiguracionStock;
