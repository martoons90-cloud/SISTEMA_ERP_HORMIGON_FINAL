import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { PencilSimple, MagnifyingGlass, PlusCircle, Link as LinkIcon, Trash } from 'phosphor-react';
import FormularioArticulo from './FormularioArticulo'; // Reutilizamos el formulario

const GestionVariantes = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Datos de soporte para el formulario
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [tiposArticulo, setTiposArticulo] = useState([]);

  // Estado para el diálogo de edición
  const [openDialog, setOpenDialog] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);

  // Estado para el diálogo de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase
        .from('stk_articulos')
        .select('*, parent:parent_articulo_id(id, name, code)')
        .not('parent_articulo_id', 'is', null) // Solo traer variantes
        .order('name', { ascending: true });

      if (rpcError) throw rpcError;
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err);
      setError('No se pudieron cargar las variantes.');
      enqueueSnackbar('Error al cargar variantes', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();

    // Cargar datos de soporte para el formulario de edición
    const fetchSupportData = async () => {
      try {
        const unidadesPromise = supabase.from('stk_unidades_medida').select('nombre').order('nombre');
        const tiposPromise = supabase.from('stk_tipos_articulo').select('id, nombre, prefijo').order('nombre');
        const [unidadesRes, tiposRes] = await Promise.all([unidadesPromise, tiposPromise]);

        if (unidadesRes.error) throw unidadesRes.error;
        if (tiposRes.error) throw tiposRes.error;

        setUnidadesMedida(unidadesRes.data || []);
        setTiposArticulo(tiposRes.data || []);
      } catch (error) {
        enqueueSnackbar(`Error al cargar datos de soporte: ${error.message}`, { variant: 'error' });
      }
    };
    fetchSupportData();
  }, [fetchData, enqueueSnackbar]);

  const filteredVariants = useMemo(() => {
    if (!searchTerm) {
      return variants;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return variants.filter((variant) =>
      (variant.name && variant.name.toLowerCase().includes(lowercasedTerm)) || // Nombre del padre
      (variant.variant_name && variant.variant_name.toLowerCase().includes(lowercasedTerm)) || // Nombre de la variante
      (variant.code && variant.code.toLowerCase().includes(lowercasedTerm))
    );
  }, [variants, searchTerm]);

  const handleOpenDialog = (article = null) => {
    setEditingArticleId(article ? article.id : null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingArticleId(null);
  };

  const handleFormSuccess = () => {
    handleCloseDialog();
    fetchData();
  };

  const handleOpenDeleteConfirm = (variant) => {
    setVariantToDelete(variant);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setVariantToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!variantToDelete) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('stk_articulos')
        .delete()
        .eq('id', variantToDelete.id);

      if (deleteError) {
        if (deleteError.code === '23503') { // Error de foreign key
          throw new Error('No se puede eliminar porque está en uso en cotizaciones, pedidos o movimientos de stock.');
        }
        throw deleteError;
      }

      enqueueSnackbar(`Variante "${variantToDelete.variant_name}" eliminada con éxito.`, { variant: 'success' });
      fetchData(); // Recargar la lista
    } catch (err) {
      enqueueSnackbar(`Error al eliminar: ${err.message}`, { variant: 'error' });
    } finally {
      setIsDeleting(false);
      handleCloseDeleteConfirm();
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
          Gestión de Variantes de Artículos
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            label="Buscar por nombre de variante, padre o código..."
            variant="outlined"
            size="small"
            sx={{ width: 400 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><MagnifyingGlass /></InputAdornment>),
            }}
          />
          <Button
            variant="contained"
            startIcon={<PlusCircle />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Variante
          </Button>
        </Box>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código Variante</TableCell>
                  <TableCell>Nombre Específico</TableCell>
                  <TableCell>Artículo Padre</TableCell>
                  <TableCell>Propósito</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVariants.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell><strong>{row.variant_name}</strong></TableCell>
                    <TableCell>
                      <Chip icon={<LinkIcon />} label={row.name || 'N/A'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.proposito_comercial} size="small" color="info" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(row)}><PencilSimple size={20} /></IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleOpenDeleteConfirm(row)}><Trash size={20} /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      <FormularioArticulo
        open={openDialog}
        onClose={handleCloseDialog}
        onSuccess={handleFormSuccess}
        editingArticleId={editingArticleId}
        tiposArticulo={tiposArticulo}
        unidadesMedida={unidadesMedida}
        startAsVariant={true}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar la variante "{variantToDelete?.variant_name}" del artículo "{variantToDelete?.name}"?
            <br />
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color="inherit">Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={isDeleting}>{isDeleting ? <CircularProgress size={24} /> : 'Eliminar'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GestionVariantes;