import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { PlusCircle, PencilSimple, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import FormularioProveedor from './FormularioProveedor';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [usarColores, setUsarColores] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchProveedores = async () => {
      setLoading(true);
      try {
        // Fetch proveedores with clasificacion data
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from('com_proveedores')
          .select('*, clasificacion:com_proveedores_clasificacion(*)')
          .order('razon_social', { ascending: true });

        if (proveedoresError) throw proveedoresError;
        setProveedores(proveedoresData);

      } catch (error) {
        enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchProveedores();
  }, [enqueueSnackbar]);


  const handleOpenDialog = (proveedor = null) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
    } else {
      setEditingProveedor(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProveedor(null);
  };

  const handleSaveSuccess = (savedProvider) => {
    if (editingProveedor) {
      setProveedores(prev => prev.map(p => p.id === savedProvider.id ? savedProvider : p));
    } else {
      setProveedores(prev => [...prev, savedProvider]);
    }
  };

  const handleToggleActivo = async (id, activo) => {
    try {
      const { error } = await supabase.from('com_proveedores').update({ activo: !activo }).eq('id', id);
      if (error) throw error;
      setProveedores(prev => prev.map(p => p.id === id ? { ...p, activo: !activo } : p));
      enqueueSnackbar('Estado del proveedor actualizado.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Error al cambiar estado: ${error.message}`, { variant: 'error' });
    }
  };

  const openDeleteConfirm = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setItemToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('com_proveedores').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      setProveedores(prev => prev.filter(p => p.id !== itemToDelete.id));
      enqueueSnackbar('Proveedor eliminado con éxito.', { variant: 'info' });
      closeDeleteConfirm();
    } catch (error) {
      enqueueSnackbar(`Error eliminando proveedor: ${error.message}`, { variant: 'error' });
    }
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Proveedores
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => handleOpenDialog()}>
          Nuevo Proveedor
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Razón Social</TableCell>
              <TableCell>Clasificación</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>DNI/CUIT</TableCell>
              <TableCell>Condición IVA</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center"><CircularProgress /></TableCell>
              </TableRow>
            ) : proveedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">No hay proveedores registrados.</TableCell>
              </TableRow>
            ) : (
              proveedores.map((proveedor) => (
                <TableRow key={proveedor.id} hover>
                  <TableCell>{proveedor.codigo}</TableCell>
                  <TableCell>{proveedor.razon_social}</TableCell>
                  <TableCell>
                    {proveedor.clasificacion && (
                      <Chip label={proveedor.clasificacion.nombre} size="small" sx={{ backgroundColor: usarColores && proveedor.clasificacion.color ? proveedor.clasificacion.color : 'default', color: '#fff', textShadow: '1px 1px 2px #000' }} />
                    )}
                  </TableCell>
                  <TableCell>{proveedor.email}</TableCell>
                  <TableCell>{proveedor.direccion}</TableCell>
                  <TableCell>{proveedor.telefono}</TableCell>
                  <TableCell>{proveedor.dni_cuit}</TableCell>
                  <TableCell>{proveedor.condicion_iva}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={proveedor.activo ? 'Desactivar' : 'Activar'}>
                      <Switch checked={proveedor.activo} onChange={() => handleToggleActivo(proveedor.id, proveedor.activo)} size="small" />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(proveedor)}><PencilSimple /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => openDeleteConfirm(proveedor)}><Trash /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <FormularioProveedor
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSaveSuccess}
        editingProveedor={editingProveedor}
      />

      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar al proveedor "<strong>{itemToDelete?.razon_social}</strong>"?
            <br />
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Proveedores;
