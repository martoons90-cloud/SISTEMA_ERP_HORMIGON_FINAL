import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, Stack,
  TableContainer, TableHead, TableRow, CircularProgress, Chip, IconButton, Tooltip, Button,
  Tabs, Tab, Collapse, Grid, Divider,
} from '@mui/material';
import { Truck, Timer, CheckCircle, Play, Stop, Phone } from 'phosphor-react';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { mockViajesProgramados, mockPedidosVenta, mockPlantas, mockCamiones, mockChoferes, mockFormulas } from '../compras/mock-data';

const getStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'default';
    case 'ASIGNADO': return 'info';
    case 'EN_VIAJE': return 'primary';
    case 'LLAMADO': return 'warning';
    case 'ENTREGADO': return 'success';
    case 'CARGANDO': return 'secondary';
    default: return 'default';
  }
};

const DespachoRow = ({ viaje, onUpdateViaje }) => {
  const [open, setOpen] = useState(false);
  const [callCooldown, setCallCooldown] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleAction = (actionType) => {
    if (actionType === 'llamar') {
      if (callCooldown) {
        enqueueSnackbar('Debe esperar 1 minuto antes de volver a llamar.', { variant: 'warning' });
        return;
      }

      // Si es la primera vez que se llama, se cambia el estado para habilitar el siguiente paso.
      if (viaje.estado === 'ASIGNADO') {
        onUpdateViaje(viaje.id, 'llamar');
      }
      
      enqueueSnackbar(`Notificación enviada al chofer del camión ${viaje.camion.patente}.`, { variant: 'success' });
      
      // Se activa el temporizador de 1 minuto.
      setCallCooldown(true);
      setTimeout(() => {
        setCallCooldown(false);
      }, 60000); // 60000 ms = 1 minuto

    } else {
      // Las otras acciones funcionan como antes.
      onUpdateViaje(viaje.id, actionType);
      let message = actionType === 'iniciar_carga' ? `Iniciando carga para el viaje ${viaje.id}.` : `Carga finalizada para el viaje ${viaje.id}.`;
      enqueueSnackbar(message, { variant: 'info' });
    }
  };

  const materiales = useMemo(() => {
    if (!viaje.formula || !viaje.formula.detalle) return [];
    return viaje.formula.detalle.map(item => ({
      ...item,
      cantidad_necesaria: (item.cantidad * viaje.cantidad).toFixed(2),
    }));
  }, [viaje]);

  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell><IconButton size="small" onClick={() => setOpen(!open)}>{open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton></TableCell>
        <TableCell><strong>{viaje.hora_programada}</strong></TableCell>
        <TableCell>{viaje.cliente?.razon_social || 'N/A'}</TableCell>
        <TableCell>{viaje.articulo.nombre}</TableCell>
        <TableCell align="right">{viaje.cantidad} {viaje.articulo.unidad_medida}</TableCell>
        <TableCell>{viaje.camion?.patente || 'N/A'} / {viaje.chofer?.nombre || 'N/A'}</TableCell>
        <TableCell align="center"><Chip label={viaje.estado} color={getStatusChipColor(viaje.estado)} size="small" /></TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Typography variant="h6" gutterBottom>Ciclo de Carga</Typography>
                  <Stack spacing={2}>
                    <Button 
                      variant="outlined" 
                      color="info" 
                      startIcon={<Phone />} 
                      disabled={!['ASIGNADO', 'LLAMADO'].includes(viaje.estado) || callCooldown} 
                      onClick={() => handleAction('llamar')}>
                      Llamar a Posicionar
                    </Button>
                    <Button variant="contained" color="primary" startIcon={<Play />} disabled={viaje.estado !== 'LLAMADO'} onClick={() => handleAction('iniciar_carga')}>Iniciar Carga</Button>
                    <Button variant="contained" color="secondary" startIcon={<Stop />} disabled={viaje.estado !== 'CARGANDO'} onClick={() => handleAction('finalizar_carga')}>Finalizar Carga</Button>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                        <Box>
                            <Typography variant="overline">Inicio Carga</Typography>
                            <Typography variant="body2" color="text.secondary">Teórico: {viaje.hora_inicio_carga_teorica || '--:--'}</Typography>
                            <Typography variant="body1" fontWeight="bold">Real: {viaje.hora_inicio_carga_real || '--:--'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="overline">Fin Carga</Typography>
                            <Typography variant="body2" color="text.secondary">Teórico: {viaje.hora_fin_carga_teorica || '--:--'}</Typography>
                            <Typography variant="body1" fontWeight="bold">Real: {viaje.hora_fin_carga_real || '--:--'}</Typography>
                        </Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Typography variant="h6" gutterBottom>Materiales Teóricos</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Componente</TableCell><TableCell align="right">Cantidad Necesaria</TableCell></TableRow></TableHead>
                      <TableBody>
                        {materiales.map((mat, index) => (
                          <TableRow key={index}>
                            <TableCell>{mat.articulo.nombre}</TableCell>
                            <TableCell align="right">{mat.cantidad_necesaria} {mat.articulo.unidad_medida}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const DespachosPlanta = () => {
  const navigate = useNavigate();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const enrichedViajes = mockViajesProgramados.map(viaje => {
        const pedido = mockPedidosVenta.find(p => p.id === viaje.pedido_id);
        return {
          ...viaje,
          cliente: pedido?.cliente,
          planta: mockPlantas.find(p => p.id === viaje.planta_id),
          formula: mockFormulas.find(f => f.id === viaje.formula_id),
          camion: mockCamiones.find(c => c.id === viaje.camion_id),
          chofer: mockChoferes.find(c => c.id === viaje.chofer_id),
        };
      });
      setViajes(enrichedViajes);
      setLoading(false);
    }, 500);
  }, []);

  // Filtra los viajes que están listos para despachar en la fecha seleccionada
  const viajesDelDia = useMemo(() => {
    return viajes.filter(v => v.fecha_programada === selectedDate && ['ASIGNADO', 'LLAMADO', 'CARGANDO'].includes(v.estado));
  }, [viajes, selectedDate]);

  const handleUpdateViaje = (viajeId, actionType) => {
    const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setViajes(prevViajes => {
        const newViajes = [...prevViajes];
        const viajeIndex = newViajes.findIndex(v => v.id === viajeId);
        if (viajeIndex === -1) return prevViajes;

        if (actionType === 'llamar') {
            newViajes[viajeIndex].estado = 'LLAMADO';
        } else if (actionType === 'iniciar_carga') {
            newViajes[viajeIndex].hora_inicio_carga_real = now;
            newViajes[viajeIndex].estado = 'CARGANDO';
        } else if (actionType === 'finalizar_carga') {
            newViajes[viajeIndex].hora_fin_carga_real = now;
            newViajes[viajeIndex].estado = 'CARGADO'; // Estado intermedio antes de salir
        }
        return newViajes;
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
        Despachos de Planta
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedDate}
          onChange={(e, newValue) => setSelectedDate(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Hoy" value={new Date().toISOString().split('T')[0]} />
          {/* Se podrían agregar más fechas si fuera necesario */}
        </Tabs>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Hora Prog.</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Camión / Chofer</TableCell>
              <TableCell align="center">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
            ) : viajesDelDia.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No hay viajes listos para despachar en esta fecha.</TableCell></TableRow>
            ) : (
              viajesDelDia.map((viaje) => (
                <DespachoRow key={viaje.id} viaje={viaje} onUpdateViaje={handleUpdateViaje} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DespachosPlanta;