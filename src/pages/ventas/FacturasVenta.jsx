import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton,
  Tooltip, Chip, Button, TextField, InputAdornment
} from '@mui/material';
import { Eye, Trash, PlusCircle, MagnifyingGlass, Printer } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import VerDetalleFacturaVentaModal from './VerDetalleFacturaVentaModal';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-AR');
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$ 0.00';
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const getStatusChip = (status) => {
  switch (status) {
    case 'PAGADO':
      return <Chip label="Pagado" color="success" size="small" />;
    case 'PENDIENTE':
      return <Chip label="Pendiente" color="warning" size="small" />;
    case 'ANULADO':
      return <Chip label="Anulado" color="error" size="small" />;
    default:
      return <Chip label={status || 'N/A'} size="small" />;
  }
};

const FacturasVenta = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ven_facturas_venta')
        .select(`
          id,
          numero_factura,
          fecha_factura,
          total,
          estado_pago,
          cliente:ven_clientes(id, razon_social, codigo),
          talonario:ven_talonarios(id, letra, punto_venta)
        `)
        .order('fecha_factura', { ascending: false })
        .order('numero_factura', { ascending: false });

      if (error) throw error;
      setFacturas(data || []);
    } catch (error) {
      enqueueSnackbar(`Error al cargar facturas: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  const filteredFacturas = facturas.filter(factura => {
    const term = searchTerm.toLowerCase();
    if (!factura.talonario || !factura.cliente) return false;
    const numeroCompleto = `${String(factura.talonario.punto_venta).padStart(4, '0')}-${String(factura.numero_factura).padStart(8, '0')}`;
    return (
      numeroCompleto.includes(term) ||
      factura.cliente.razon_social.toLowerCase().includes(term) ||
      factura.cliente.codigo.toLowerCase().includes(term)
    );
  });

  const handleViewDetails = (factura) => {
    setSelectedFactura(factura);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedFactura(null);
    setViewModalOpen(false);
  };

  const handleAnnul = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres anular esta factura? Esta acción es irreversible y revertirá el estado de los pedidos asociados.')) {
      try {
        setLoading(true);
        // Llamamos a la nueva función RPC para anular la factura
        const { error } = await supabase.rpc('anular_factura_venta', { p_factura_id: id });
        if (error) throw error;

        enqueueSnackbar('Factura anulada con éxito.', { variant: 'success' });
        fetchFacturas(); // Recargar la lista
      } catch (error) {
        enqueueSnackbar(`Error al anular la factura: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Facturas de Venta
        </Typography>
        <Button variant="contained" startIcon={<PlusCircle />} onClick={() => navigate('/ventas/facturas/nueva')}>
          Nueva Factura
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por N° de Factura, Código o Razón Social del Cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MagnifyingGlass />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Número</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado Pago</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ p: 4 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredFacturas.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No se encontraron facturas.</TableCell></TableRow>
            ) : (
              filteredFacturas.map((factura) => (
                <TableRow key={factura.id} hover>
                  <TableCell>
                    {factura.talonario 
                      ? `${factura.talonario.letra} ${String(factura.talonario.punto_venta).padStart(4, '0')}-${String(factura.numero_factura).padStart(8, '0')}`
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>{formatDate(factura.fecha_factura)}</TableCell>
                  <TableCell>{factura.cliente.codigo} - {factura.cliente.razon_social}</TableCell>
                  <TableCell align="right">{formatCurrency(factura.total)}</TableCell>
                  <TableCell align="center">
                    {getStatusChip(factura.estado_pago)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleViewDetails(factura)}>
                        <Eye />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Imprimir">
                      <IconButton size="small" onClick={() => enqueueSnackbar('Función de impresión no implementada.', { variant: 'info' })}>
                        <Printer />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Anular">
                      <span>
                        <IconButton size="small" color="error" disabled={factura.estado_pago === 'ANULADO' || factura.estado_pago === 'PAGADO'} onClick={() => handleAnnul(factura.id)}>
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

      {viewModalOpen && selectedFactura && (
        <VerDetalleFacturaVentaModal
          facturaId={selectedFactura.id}
          open={viewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
    </Paper>
  );
};

export default FacturasVenta;
