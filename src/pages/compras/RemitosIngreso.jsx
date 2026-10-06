import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Tooltip, Button, Chip
} from '@mui/material';
import { Eye, PlusCircle, Trash } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import SeleccionarOcParaRecepcionModal from './SeleccionarOcParaRecepcionModal';
import VerDetalleRemitoModal from './VerDetalleRemitoModal';

// Helper para formatear la fecha
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  // Ajuste para asegurar que la fecha se muestre correctamente sin importar la zona horaria
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const getStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE':
      return 'warning';
    case 'FACTURADO':
      return 'success';
    case 'ANULADO':
      return 'error';
    default:
      return 'default';
  }
};

const RemitosIngreso = () => {
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [selectOcModalOpen, setSelectOcModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRemitoId, setSelectedRemitoId] = useState(null);

  const fetchRemitos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_remitos_ingreso_listado')
        .select('*');

      if (error) throw error;
      setRemitos(data);
    } catch (error) {
      enqueueSnackbar(`Error al cargar remitos: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchRemitos();
  }, [fetchRemitos]);

  const handleViewDetails = (id) => {
    setSelectedRemitoId(id);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedRemitoId(null);
    setViewModalOpen(false);
  };

  const handleOrdenSeleccionada = (ordenId) => {
    setSelectOcModalOpen(false);
    navigate(`/compras/recepcion/nueva/${ordenId}`);
  };

  const handleAnularRemito = async (remito) => {
    if (window.confirm(`¿Estás seguro de que quieres anular el remito N° ${String(remito.id).padStart(6, '0')}? Esta acción no se puede deshacer y afectará el stock.`)) {
      try {
        const { error } = await supabase.rpc('anular_remito_ingreso', { p_remito_id: remito.id });
        if (error) throw error;

        enqueueSnackbar('Remito de ingreso anulado con éxito.', { variant: 'success' });
        fetchRemitos(); // Recargar la lista
      } catch (error) {
        enqueueSnackbar(`Error al anular el remito: ${error.message}`, { variant: 'error' });
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Remitos de Ingreso
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusCircle />}
          onClick={() => setSelectOcModalOpen(true)}
        >
          Nuevo Ingreso desde OC
        </Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Remito Interno</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>OC Asociada</TableCell>
              <TableCell>N° Remito Proveedor</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
            ) : remitos.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">No hay remitos registrados.</TableCell></TableRow>
            ) : (
              remitos.map((remito) => (
                <TableRow key={remito.id} hover>
                  <TableCell>{String(remito.id).padStart(6, '0')}</TableCell>
                  <TableCell>{formatDate(remito.fecha_recepcion)}</TableCell>
                  <TableCell>{remito.proveedor_razon_social}</TableCell>
                  <TableCell>OC-{String(remito.orden_compra_id).padStart(6, '0')}</TableCell>
                  <TableCell>{remito.numero_remito_proveedor}</TableCell>
                  <TableCell>{remito.responsable_nombre}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={remito.estado}
                      color={getStatusChipColor(remito.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleViewDetails(remito.id)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Anular Ingreso">
                      <span> {/* Span para que el Tooltip funcione con el botón deshabilitado */}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleAnularRemito(remito)}
                          disabled={remito.estado === 'ANULADO' || remito.estado === 'FACTURADO'}
                        >
                          <Trash />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <SeleccionarOcParaRecepcionModal
        open={selectOcModalOpen}
        onClose={() => setSelectOcModalOpen(false)}
        onSelect={handleOrdenSeleccionada}
      />

      {viewModalOpen && (
        <VerDetalleRemitoModal
          remitoId={selectedRemitoId}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
    </Paper>
  );
};

export default RemitosIngreso;
