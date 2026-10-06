import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import { PencilSimple, Trash, MagnifyingGlass, PlusCircle, Buildings, CheckCircle, XCircle } from 'phosphor-react';
import StockDetalleModal from './StockDetalleModal';
import FormularioArticulo from './FormularioArticulo';

const Articulos = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [tiposArticulo, setTiposArticulo] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const fetchData = useCallback(async () => {
     try {
       const { data, error: rpcError } = await supabase.rpc('get_articulos_con_stock_total');
       if (rpcError) throw rpcError;
       setArticles(data);
     } catch (err) {
       console.error('Error fetching articles:', err);
       setError('No se pudieron cargar los artículos.');
     }
   }, []);
 
   useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      await fetchData();
      setLoading(false);
    };
    initialLoad();

    const fetchSupportData = async () => {
      try {
        const unidadesPromise = supabase.from('stk_unidades_medida').select('nombre').order('nombre');
        const tiposPromise = supabase.from('stk_tipos_articulo').select('id, nombre, prefijo, color').order('nombre');
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

    // Suscripción a cambios en artículos Y en stock
    const channel = supabase
      .channel('articulos-y-stock-realtime-update')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stk_articulos' },
        () => {
          enqueueSnackbar('La lista de artículos se ha actualizado.', { variant: 'info' });
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stk_stock_por_deposito' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, enqueueSnackbar]);

  const filteredArticles = useMemo(() => {
    let tempArticles = [...articles];

    // Filtrar por tipo
    if (tipoFiltro !== 'todos') {
      tempArticles = tempArticles.filter(
        (article) => article.tipo_articulo_id === tipoFiltro
      );
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      tempArticles = tempArticles.filter((article) =>
        article.name.toLowerCase().includes(lowercasedTerm) ||
        (article.code && article.code.toLowerCase().includes(lowercasedTerm))
      );
    }
    return tempArticles;
  }, [articles, searchTerm, tipoFiltro]);

  const handleOpenDialog = (article = null) => {
    if (article) {
      setEditingArticleId(article.id);
    } else {
      setEditingArticleId(null);
    }
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

  const handleOpenDetailModal = (articulo) => {
    setSelectedArticle(articulo);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedArticle(null);
  };

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);

  const handleOpenDeleteConfirm = (article) => {
    setArticleToDelete(article);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setArticleToDelete(null);
    setOpenDeleteConfirm(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!articleToDelete) return;
    try {
      const { error } = await supabase
        .from('stk_articulos')
        .update({ activo: false })
        .eq('id', articleToDelete.id);

      if (error) throw error;
      
      enqueueSnackbar('Artículo archivado correctamente', { variant: 'info' });
      handleCloseDeleteConfirm();
      fetchData();
    } catch (err) {
      enqueueSnackbar(`Error al archivar: ${err.message}`, { variant: 'error' });
      console.error(err);
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>Gestión de Artículos</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField label="Buscar por nombre o código..." variant="outlined" size="small" sx={{ width: 300 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><MagnifyingGlass /></InputAdornment>), }} />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Tipo de Artículo</InputLabel>
              <Select
                value={tipoFiltro}
                label="Tipo de Artículo"
                onChange={(e) => setTipoFiltro(e.target.value)}
              >
                <MenuItem value="todos">Todos los Tipos</MenuItem>
                {tiposArticulo.map((tipo) => (
                  <MenuItem key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {(searchTerm || tipoFiltro !== 'todos') && (
              <Button variant="outlined" size="small" onClick={() => { setSearchTerm(''); setTipoFiltro('todos'); }}>
                Limpiar Filtros
              </Button>
            )}
          </Stack>
          <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>Nuevo Artículo</Button>
        </Box>
        <TableContainer>
          {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box> : error ? <Alert severity="error">{error}</Alert> : (
            <Table sx={{ minWidth: 650 }} size="small" aria-label="tabla de artículos">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Stock Total</TableCell>
                  <TableCell>U. Medida</TableCell>
                  <TableCell align="center">Componente</TableCell>
                  <TableCell align="center">Controla Stock</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredArticles.map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.tipo_articulo_nombre}
                        size="small"
                        sx={{
                          backgroundColor: row.tipo_articulo_color || '#e0e0e0',
                          color: theme.palette.getContrastText(row.tipo_articulo_color || '#e0e0e0'),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.stock_total}
                      <IconButton size="small" onClick={() => handleOpenDetailModal(row)} sx={{ ml: 1 }} title="Ver detalle por depósito">
                        <Buildings size={16} />
                      </IconButton>
                    </TableCell>
                    <TableCell>{row.unidad_medida}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {row.es_componente
                        ? <CheckCircle size={22} color={theme.palette.success.main} />
                        : <XCircle size={22} color={theme.palette.error.main} />
                      }
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {row.controla_stock
                        ? <CheckCircle size={22} color={theme.palette.success.main} />
                        : <XCircle size={22} color={theme.palette.error.main} />
                      }
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(row)}><PencilSimple size={20} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleOpenDeleteConfirm(row)}><Trash size={20} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      {/* Create/Edit Dialog */}
      <FormularioArticulo
        open={openDialog}
        onClose={handleCloseDialog}
        onSuccess={handleFormSuccess}
        editingArticleId={editingArticleId}
        tiposArticulo={tiposArticulo}
        unidadesMedida={unidadesMedida}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirmar Archivamiento</DialogTitle>
        <DialogContent><Typography>¿Estás seguro de que quieres archivar el artículo "{articleToDelete?.name}"? Dejará de aparecer en las listas pero se mantendrá en el historial.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancelar</Button>
          <Button onClick={handleDeleteConfirmed} variant="contained" color="error">Archivar</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Detail Modal */}
      {selectedArticle && (
        <StockDetalleModal
          open={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          articulo={selectedArticle}
        />
      )}
    </>
  );
};

export default Articulos;
