import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, IconButton, Avatar, Tooltip, Chip, TextField,
  Collapse, Grid, Table, TableBody, TableCell, TableRow, alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PencilSimple, UserSwitch, Trash, ArrowRight, Drop, MapPin } from 'phosphor-react';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

// --- Funciones de Ayuda ---

const getStatusChipColor = (status) => {
  switch (status) {
    case 'PENDIENTE': return 'warning';
    case 'ASIGNADO': return 'info';
    case 'EN_VIAJE': return 'primary';
    case 'ENTREGADO': return 'success';
    default: return 'default';
  }
};

const timeToMinutes = (time) => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const Milestone = ({ title, teorico, real, fieldName, onUpdate, isEditable = false }) => {
  // Estado local para manejar la edición sin disparar la re-planificación en cada cambio.
  const [localRealTime, setLocalRealTime] = useState(real || '');

  // Sincroniza el estado local si el valor real cambia desde fuera (ej. por una re-planificación).
  useEffect(() => {
    setLocalRealTime(real || '');
  }, [real]);

  const handleTimeChange = (e) => {
    setLocalRealTime(e.target.value);
  };

  const handleBlur = () => {
    // Solo llama a la función de actualización (que re-planifica) cuando el usuario termina de editar.
    if (onUpdate && fieldName && localRealTime !== real) {
      onUpdate(fieldName, localRealTime);
    }
  };

  return (
    <Box textAlign="center" sx={{ minWidth: 80 }}>
      <Typography variant="overline" color="text.secondary" lineHeight={1.2}>{title}</Typography>
      <Typography variant="body2" fontWeight="bold" title={`Teórico: ${teorico || ''}`}>{teorico || '--:--'}</Typography>
      {isEditable ? (
        <TextField
          type="time"
          value={localRealTime}
          onChange={handleTimeChange}
          onBlur={handleBlur} // <-- El evento clave para actualizar
          variant="standard"
          size="small"
          sx={{ '& .MuiInputBase-input': { textAlign: 'center', p: 0, fontSize: '0.875rem', color: 'primary.main', fontWeight: 'bold' }, width: '70px' }}
        />
      ) : (
        <Typography variant="body2" color="primary" title={`Real: ${real || ''}`}>{real || '--:--'}</Typography>
      )}
    </Box>
  );
};

const formatDelay = (minutes) => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let result = '';
  if (h > 0) result += `${h}h `;
  if (m > 0) result += `${m}m`;
  return result.trim();
};

const DelayChip = ({ delay }) => {
  const theme = useTheme();
  if (delay.status === 'not_started') {
    return <Chip label="No Iniciado" color="default" size="small" sx={{ width: '100%' }} />;
  }
  if (delay.status === 'on_time') {
    return <Chip label="En tiempo" color="success" size="small" sx={{ width: '100%' }} />;
  }
  const label = `${delay.eventLabel || ''} ${delay.status === 'delayed' ? '+' : ''}${delay.value} min`;
  const title = delay.status === 'delayed' ? 'Demora' : 'Adelanto';
  const color = delay.status === 'delayed' ? 'error' : 'info';

  if (delay.status === 'delayed') {
    return <Chip label={label} color={color} size="small" title={title} sx={{ width: '100%' }} />;
  }
  return <Chip label={label} color={color} size="small" title={title} sx={{ width: '100%' }} />;
};

const useCurrentTimeInMinutes = () => {
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return currentTime;
};

// --- Componentes de Fila ---

function ViajeRow({ viaje, onOpenAsignarDialog, onOpenEditarDialog, onDeleteRequest, onUpdateRealTime }) {
  const camion = viaje.camion;
  const chofer = viaje.chofer;
  const currentTimeInMinutes = useCurrentTimeInMinutes();

  const desvio = useMemo(() => {
    const eventos = [
      { key: 'hora_llegada_planta', label: 'Lleg. Planta' },
      { key: 'hora_fin_descarga', label: 'Fin Desc.' },
      { key: 'hora_inicio_descarga', label: 'Ini. Desc.' },
      { key: 'hora_llegada_obra', label: 'Lleg. Obra' },
      { key: 'hora_salida_planta', label: 'Sal. Planta' },
      { key: 'hora_fin_carga', label: 'Fin Carga' },
      { key: 'hora_inicio_carga', label: 'Ini. Carga' },
    ];

    for (const evento of eventos) {
      const realKey = `${evento.key}_real`;
      const teoricoKey = `${evento.key}_teorica`;
      if (viaje[realKey]) {
        const realMins = timeToMinutes(viaje[realKey]);
        const teoricoMins = timeToMinutes(viaje[teoricoKey]);
        if (realMins !== null && teoricoMins !== null) {
          const diff = realMins - teoricoMins;
          if (diff === 0) return { status: 'on_time', eventLabel: evento.label };
          return { status: diff > 0 ? 'delayed' : 'early', value: diff, eventLabel: evento.label };
        }
      }
    }
    return { status: 'not_started' };
  }, [viaje]);

  const demoraInicio = useMemo(() => {
    if (desvio.status !== 'not_started') return null;
    const todayISO = new Date().toISOString().split('T')[0];
    if (viaje.fecha_programada === todayISO && viaje.hora_inicio_carga_teorica) {
      const inicioTeoricoMins = timeToMinutes(viaje.hora_inicio_carga_teorica);
      if (currentTimeInMinutes > inicioTeoricoMins) {
        return currentTimeInMinutes - inicioTeoricoMins;
      }
    }
    return null;
  }, [viaje, desvio, currentTimeInMinutes]);

  return (
    <TableRow>
      <TableCell colSpan={8} sx={{ p: 1, border: 0 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center" wrap="nowrap">
            <Grid item xs>
              <Grid container alignItems="center" justifyContent="space-between" wrap="nowrap">
                <Milestone title="Inicio Carga" teorico={viaje.hora_inicio_carga_teorica} real={viaje.hora_inicio_carga_real} fieldName="hora_inicio_carga_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Fin Carga" teorico={viaje.hora_fin_carga_teorica} real={viaje.hora_fin_carga_real} fieldName="hora_fin_carga_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Salida Planta" teorico={viaje.hora_salida_planta_teorica} real={viaje.hora_salida_planta_real} fieldName="hora_salida_planta_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Llegada Obra" teorico={viaje.hora_llegada_obra_teorica} real={viaje.hora_llegada_obra_real} fieldName="hora_llegada_obra_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Inicio Descarga" teorico={viaje.hora_inicio_descarga_teorica} real={viaje.hora_inicio_descarga_real} fieldName="hora_inicio_descarga_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Fin Descarga" teorico={viaje.hora_fin_descarga_teorica} real={viaje.hora_fin_descarga_real} fieldName="hora_fin_descarga_teorica" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
                <ArrowRight size={20} color="grey" />
                <Milestone title="Llegada Planta" teorico={viaje.hora_llegada_planta_teorica} real={viaje.hora_llegada_planta_real} fieldName="hora_llegada_planta_real" onUpdate={(field, value) => onUpdateRealTime(viaje.id, field, value)} isEditable />
              </Grid>
            </Grid>
            <Grid item sx={{ width: 180, minWidth: 180 }}>
              <Box textAlign="center">
                <Typography variant="body2"><strong>{camion?.patente} ({viaje.cantidad} m³)</strong></Typography>
                <Typography variant="caption" display="block">{chofer?.nombre}</Typography>
                {viaje.bomba_id && (
                  <Tooltip title={`Bomba Asignada: ${viaje.bomba?.nombre || viaje.bomba_id}`}>
                    <Drop size={16} color="orange" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  </Tooltip>
                )} 
                <Chip label={viaje.estado} color={getStatusChipColor(viaje.estado)} size="small" sx={{ my: 0.5, width: '100%' }} />
                <DelayChip delay={desvio} />
                {demoraInicio > 0 && <Typography variant="caption" color="error" fontWeight="bold">Demora Inicio: {formatDelay(demoraInicio)}</Typography>}
                <Tooltip title="Editar Cantidad/Horario">
                  <IconButton color="default" size="small" onClick={() => onOpenEditarDialog(viaje)} sx={{ mt: 0.5 }}>
                    <PencilSimple />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Asignar Recursos">
                  <IconButton color="primary" size="small" onClick={() => onOpenAsignarDialog(viaje)} sx={{ mt: 0.5 }}>
                    <UserSwitch />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar Viaje">
                  <IconButton color="error" size="small" onClick={() => onDeleteRequest(viaje)} sx={{ mt: 0.5 }}>
                    <Trash />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TableCell>
    </TableRow>
  );
}

export function ProgramacionPedidoRow({ pedido, viajes, onOpenAsignarDialog, onOpenEditarDialog, onDeleteViajeRequest, onDeletePedidoRequest, onOpenGeocodificacionDialog, onUpdateRealTime }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const desvioTotalPedido = useMemo(() => {
    const ultimoViaje = viajes
      .filter(v => v.hora_llegada_planta_real)
      .sort((a, b) => b.hora_llegada_planta_real.localeCompare(a.hora_llegada_planta_real))[0];

    if (!ultimoViaje) return null;

    const realMins = timeToMinutes(ultimoViaje.hora_llegada_planta_real);
    const teoricoMins = timeToMinutes(ultimoViaje.hora_llegada_planta_teorica);

    if (realMins !== null && teoricoMins !== null) {
      const diff = realMins - teoricoMins;
      if (diff === 0) return { status: 'on_time' };
      return { status: diff > 0 ? 'delayed' : 'early', value: diff };
    }

    return null;
  }, [viajes]);

  let bombaSchedule = null;
  // Necesitamos la función aquí también para el cálculo de la bomba.
  const subtractMinutes = (time, mins) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return '00:00';
    const [h, m] = time.split(':').map(Number);
    let totalMins = Math.round(h * 60 + m - mins);
    if (totalMins < 0) totalMins = 0;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };
  if (pedido.con_bomba && viajes.length > 0) {
    const viajesAsignados = viajes
      .filter(v => v.estado === 'ASIGNADO' || v.estado === 'EN_VIAJE' || v.estado === 'ENTREGADO')
      .sort((a, b) => a.hora_llegada_obra_teorica.localeCompare(b.hora_llegada_obra_teorica));

    if (viajesAsignados.length > 0) {
      const primerViaje = viajesAsignados[0];
      const ultimoViaje = viajesAsignados[viajesAsignados.length - 1];
      const tiempoViajeBomba = 45;

      bombaSchedule = {
        salida: subtractMinutes(primerViaje.hora_llegada_obra_teorica, tiempoViajeBomba),
        llegadaObra: primerViaje.hora_llegada_obra_teorica,
        inicioDescarga: primerViaje.hora_inicio_descarga_teorica,
        finDescarga: ultimoViaje.hora_fin_descarga_teorica,
        bombaId: primerViaje.bomba_id
      };
    }
  }

  const totalCantidadDia = viajes.reduce((sum, v) => sum + v.cantidad, 0);
  const tiposHormigon = [...new Set(viajes.map(v => v.articulo?.name).filter(Boolean))];
  const displayTipoHormigon = tiposHormigon.join(', ');
  const ubicacion = pedido.obra?.direccion || pedido.cliente?.domicilio;
  const primerViaje = viajes.length > 0
    ? [...viajes].sort((a, b) => a.hora_programada.localeCompare(b.hora_programada))[0]
    : null;

  return (
    <React.Fragment>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <strong>{String(pedido.id).padStart(6, '0')}</strong>
          <Typography variant="caption" display="block">{pedido.cliente?.razon_social}</Typography>
        </TableCell>
        <TableCell>
          {pedido.obra?.nombre || 'Principal'}
          <Typography variant="caption" display="block">
            {ubicacion}
            {pedido.obra && (
              <IconButton 
                size="small" 
                sx={{ ml: 0.5, p: 0.2 }} 
                onClick={() => {
                  // Si el viaje es un "maestro", no pasamos planta_id ni fecha, ya que no existen aún.
                  onOpenGeocodificacionDialog(pedido.obra, primerViaje?.estado === 'PENDIENTE_PLANIFICACION' ? undefined : primerViaje?.planta_id, primerViaje?.fecha_programada)
                }}
              ><MapPin size={14} /></IconButton>
            )}
          </Typography>
        </TableCell>
        <TableCell align="center">{primerViaje?.hora_programada || 'N/A'}</TableCell>
        <TableCell>{displayTipoHormigon}</TableCell>
        <TableCell align="right">{totalCantidadDia.toFixed(2)} m³</TableCell>
        <TableCell align="center">{pedido.con_bomba ? 'Sí' : 'No'}</TableCell>
        <TableCell align="center">
          {desvioTotalPedido && (
            <Tooltip title={desvioTotalPedido.status === 'delayed' ? `Demora total acumulada: ${desvioTotalPedido.value} min` : `Adelanto total: ${Math.abs(desvioTotalPedido.value)} min`}>
              <Chip 
                label={`${desvioTotalPedido.status === 'delayed' ? '+' : ''}${desvioTotalPedido.value} min`}
                color={desvioTotalPedido.status === 'delayed' ? 'error' : 'info'}
                size="small"
              />
            </Tooltip>
          )}
          {viajes.length}
          {primerViaje && (
            <Tooltip title="Editar primer viaje del día">
              <IconButton size="small" onClick={() => onOpenEditarDialog(primerViaje)}><PencilSimple /></IconButton>
            </Tooltip>
          )}
          {viajes.length > 0 && (
            <Tooltip title="Eliminar todos los viajes del día para este pedido">
              <IconButton size="small" color="error" onClick={() => onDeletePedidoRequest(pedido, viajes)}><Trash /></IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Table size="small" aria-label="viajes">
                <TableBody>
                  {bombaSchedule && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 1, border: 0 }}>
                        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main', backgroundColor: alpha(theme.palette.warning.main, 0.1) }}>
                          <Grid container spacing={2} alignItems="center" disableEqualOverflow>
                            <Grid>
                              <Avatar sx={{ bgcolor: 'warning.main' }}><Drop /></Avatar>
                            </Grid>
                            <Grid xs>
                              <Typography variant="subtitle2" color="warning.dark" fontWeight="bold">
                                Bomba Asignada: {bombaSchedule.bombaId}
                              </Typography>
                              <Grid container alignItems="center" justifyContent="space-around" wrap="nowrap" sx={{ mt: 1 }}>
                                <Milestone title="Salida" teorico={bombaSchedule.salida} />
                                <ArrowRight size={20} color="grey" />
                                <Milestone title="Llegada Obra" teorico={bombaSchedule.llegadaObra} />
                                <ArrowRight size={20} color="grey" />
                                <Milestone title="Inicio Bombeo" teorico={bombaSchedule.inicioDescarga} />
                                <ArrowRight size={20} color="grey" />
                                <Milestone title="Fin Bombeo" teorico={bombaSchedule.finDescarga} />
                              </Grid>
                            </Grid>
                          </Grid>
                        </Paper>
                      </TableCell>
                    </TableRow>
                  )}
                  {viajes.map(viaje => (
                    <ViajeRow 
                      key={viaje.id} 
                      viaje={viaje} 
                      onOpenAsignarDialog={onOpenAsignarDialog} 
                      onOpenEditarDialog={onOpenEditarDialog}
                      onDeleteRequest={onDeleteViajeRequest}
                      onUpdateRealTime={onUpdateRealTime}
                    />
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}
