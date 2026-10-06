import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, Grid
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash, Eye, ClockCounterClockwise } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const GestionFormulas = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [formulas, setFormulas] = useState([]);
  const [viewingFormula, setViewingFormula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: formulasData, error: formulasError } = await supabase
        .from('prod_formulas')
        .select(`*,
          articulo_terminado:articulo_terminado_id(*),
          detalle:prod_formulas_detalle(articulo_componente_id, cantidad, articulo:articulo_componente_id(*))
        `)
        .order('nombre', { ascending: true });
      if (formulasError) throw formulasError;
      
      setFormulas(formulasData || []);
    } catch (error) {
      enqueueSnackbar(`Error al cargar datos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (id) => {
    navigate(`/produccion/formulas/editar/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta fórmula?')) {
      try {
        const { error } = await supabase.from('prod_formulas').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        enqueueSnackbar('Fórmula eliminada.', { variant: 'info' });
      } catch (error) {
        enqueueSnackbar(`Error al eliminar: ${error.message}`, { variant: 'error' });
      }
    }
  };

  const handleOpenView = (formula) => {
    setViewingFormula(formula);
  };

  const handleCloseView = () => {
    setViewingFormula(null);
  };

  const handleViewHistory = async (formula) => {
    setHistoryLoading(true);
    setHistoryDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from('prod_formulas_historial')
        .select('*, modificado_por:user_profiles(full_name)')
        .eq('formula_id', formula.id)
        .order('version', { ascending: false });
      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      enqueueSnackbar(`Error al cargar el historial: ${error.message}`, { variant: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setHistoryDialogOpen(false);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Gestión de Fórmulas (Recetas)
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => navigate('/produccion/formulas/nueva')}>
          Nueva Fórmula
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre de la Fórmula</TableCell>
              <TableCell>Producto Terminado</TableCell>
              <TableCell align="center">Versión</TableCell>
              <TableCell align="center">Última Modificación</TableCell>
              <TableCell align="center">Activa</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
            ) : formulas.map((formula) => (
              <TableRow hover key={formula.id}>
                <TableCell><strong>{formula.nombre}</strong></TableCell>
                <TableCell>{`${formula.articulo_terminado?.name || 'N/A'}${formula.articulo_terminado?.variant_name ? ` - ${formula.articulo_terminado.variant_name}` : ''}`}</TableCell>
                <TableCell align="center">{formula.version}</TableCell>
                <TableCell align="center">{new Date(formula.fecha_ultima_modificacion || formula.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="center">
                  <Chip label={formula.activa ? 'Sí' : 'No'} color={formula.activa ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver Detalle">
                    <IconButton size="small" color="default" onClick={() => handleOpenView(formula)}>
                      <Eye />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Historial de Cambios">
                    <IconButton size="small" color="secondary" onClick={() => handleViewHistory(formula)}>
                      <ClockCounterClockwise />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => handleEdit(formula.id)}><PencilSimple /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(formula.id)}><Trash /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!viewingFormula} onClose={handleCloseView} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de Fórmula: {viewingFormula?.nombre}</DialogTitle>
        <DialogContent>
          {viewingFormula && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Typography><strong>Producto Terminado:</strong> {`${viewingFormula.articulo_terminado?.name || 'N/A'}${viewingFormula.articulo_terminado?.variant_name ? ` - ${viewingFormula.articulo_terminado.variant_name}` : ''}`}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Versión:</strong> {viewingFormula.version}</Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography><strong>Cantidad Base:</strong> {viewingFormula.cantidad_base}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Activa:</strong> {viewingFormula.activa ? 'Sí' : 'No'}</Typography>
                </Grid>
              </Grid>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Ingredientes:</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Componente</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewingFormula.detalle.map(item => (
                      <TableRow key={item.articulo_componente_id}>
                        <TableCell>{item.articulo?.name || 'Componente no encontrado'}</TableCell>
                        <TableCell align="right">{item.cantidad} {item.articulo?.unidad_medida}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onClose={handleCloseHistory} maxWidth="lg" fullWidth>
        <DialogTitle>Historial de Cambios</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <CircularProgress />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Versión</TableCell>
                    <TableCell>Fecha Modificación</TableCell>
                    <TableCell>Modificado Por</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Activa</TableCell>
                    <TableCell>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">No hay historial para esta fórmula.</TableCell></TableRow>
                  ) : (
                    historyData.map(h => (
                      <TableRow key={h.id}>
                        <TableCell align="center">{h.version}</TableCell>
                        <TableCell>{new Date(h.fecha_modificacion).toLocaleString()}</TableCell>
                        <TableCell>{h.modificado_por?.full_name || 'N/A'}</TableCell>
                        <TableCell>{h.nombre}</TableCell>
                        <TableCell align="center">{h.activa ? 'Sí' : 'No'}</TableCell>
                        <TableCell>{h.observaciones}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default GestionFormulas;
