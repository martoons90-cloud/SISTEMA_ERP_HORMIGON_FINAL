import React, { useRef, useState } from 'react';
import { Box, Typography, Paper, Tooltip, Divider, alpha, useTheme } from '@mui/material';
import { Truck, Drop } from 'phosphor-react';

// Helper para convertir HH:MM a minutos desde el inicio del día (00:00)
const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const GanttChart = ({ viajes = [], camiones = [], onViajeDrop }) => {
  const theme = useTheme();
  const [dropIndicator, setDropIndicator] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const chartRef = useRef(null);
  const jornadaInicio = 7 * 60; // 07:00
  const jornadaFin = 19 * 60;   // 19:00
  const duracionJornada = jornadaFin - jornadaInicio;

  const horas = [];
  for (let i = 7; i < 19; i++) {
    horas.push(`${String(i).padStart(2, '0')}:00`);
  }

  const camionesActivos = camiones.filter(c => c.activo);

  const handleDragStart = (e, viaje) => {
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    setDragOffset(offsetX);

    e.dataTransfer.setData('viajeId', viaje.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (chartRef.current) {
      const chartRect = chartRef.current.getBoundingClientRect();
      const cursorX = e.clientX - chartRect.left;
      const barStartX = cursorX - dragOffset;
      const barStartPercentage = (barStartX / chartRect.width);
      const barStartMinutes = (barStartPercentage * duracionJornada) + jornadaInicio;
      const snappedMinutes = Math.round(barStartMinutes / 15) * 15;
      const snappedPercentage = ((snappedMinutes - jornadaInicio) / duracionJornada) * 100;

      if (snappedPercentage >= 0 && snappedPercentage <= 100) {
        setDropIndicator(snappedPercentage);
      }
    }
  };

  const handleDrop = (e, camionId) => {
    e.preventDefault();
    const viajeId = e.dataTransfer.getData('viajeId');
    if (!viajeId || !chartRef.current) return;

    const chartRect = chartRef.current.getBoundingClientRect();
    const cursorX = e.clientX - chartRect.left;
    const barStartX = cursorX - dragOffset;
    const barStartPercentage = (barStartX / chartRect.width);
    const barStartMinutes = (barStartPercentage * duracionJornada) + jornadaInicio;
    const snappedMinutes = Math.round(barStartMinutes / 15) * 15;

    setDropIndicator(null);
    setDragOffset(0);
    onViajeDrop(parseInt(viajeId, 10), camionId, snappedMinutes);
  };

  const handleDragEnd = () => {
    setDropIndicator(null);
    setDragOffset(0);
  };

  const hourBlockWidth = 80;
  const ganttChartWidth = horas.length * hourBlockWidth;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Gantt de Camiones</Typography>
      </Box>
      <Box sx={{ display: 'flex', width: '100%' }}>
        {/* Columna de Recursos (Fija) */}
        <Box sx={{ minWidth: 180, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ height: 40, display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2">Equipo</Typography>
          </Box>
          {camionesActivos.map(camion => (
            <Box key={`camion-label-${camion.id}`} sx={{ height: 60, display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Truck size={20} style={{ marginRight: 8 }} />
              <Typography variant="body2" fontWeight="bold">{camion.patente}</Typography>
            </Box>
          ))}
        </Box>

        {/* Contenedor del Gráfico Gantt (Scrollable) */}
        <Box sx={{ flexGrow: 1, overflowX: 'auto', minWidth: 0 }} onDragLeave={handleDragEnd}>
          <Box sx={{ position: 'relative', width: ganttChartWidth, minWidth: '100%' }} ref={chartRef}>
            {/* Cabecera de Horas */}
            <Box sx={{ height: 40, display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
              {horas.map(hora => (
                <Box key={hora} sx={{ width: hourBlockWidth, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider', p: 1, flexShrink: 0 }}>
                  <Typography variant="caption">{hora}</Typography>
                </Box>
              ))}
            </Box>

            {/* Filas de Viajes de Camiones */}
            {camionesActivos.map(camion => {
              const viajesDelCamion = viajes.filter(v => v.camion_id === camion.id);
              return (
                <Box
                  key={`camion-row-${camion.id}`}
                  sx={{ height: 60, position: 'relative', borderBottom: '1px solid', borderColor: 'divider' }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, camion.id)}
                >
                  {/* Fondo con líneas de división */}
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', zIndex: 0 }}>
                    {horas.map((hora) => (
                      <Box key={`grid-camion-${camion.id}-${hora}`} sx={{ width: hourBlockWidth, display: 'flex', borderRight: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                        <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                        <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                        <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                        <Box sx={{ flex: 1 }} />
                      </Box>
                    ))}
                  </Box>

                  {viajesDelCamion.map(viaje => {
                    const inicio = timeToMinutes(viaje.hora_inicio_carga_teorica);
                    const fin = timeToMinutes(viaje.hora_llegada_planta_teorica);
                    if (inicio === null || fin === null) return null;

                    const inicioDescarga = timeToMinutes(viaje.hora_inicio_descarga_teorica);
                    const finDescarga = timeToMinutes(viaje.hora_fin_descarga_teorica);
                    const duracionTotalViaje = fin - inicio;
                    const duracionDescarga = finDescarga - inicioDescarga;
                    const inicioDescargaRelativo = inicioDescarga - inicio;

                    const left = ((inicio - jornadaInicio) / duracionJornada) * 100;
                    const width = (duracionTotalViaje / duracionJornada) * 100;
                    const isDraggable = viaje.estado === 'ASIGNADO';

                    return (
                      <Tooltip
                        key={viaje.id}
                        title={
                          <React.Fragment>
                            <Typography color="inherit">Pedido: {viaje.pedido_id}</Typography>
                            <Typography variant="body2">
                              Total: {viaje.hora_inicio_carga_teorica} - {viaje.hora_llegada_planta_teorica}
                            </Typography>
                            <Typography variant="caption">Descarga: {viaje.hora_inicio_descarga_teorica} - {viaje.hora_fin_descarga_teorica}</Typography>
                          </React.Fragment>
                        }
                      >
                        <Paper
                          draggable={isDraggable}
                          onDragStart={isDraggable ? (e) => handleDragStart(e, viaje) : undefined}
                          onDragEnd={isDraggable ? handleDragEnd : undefined}
                          sx={{
                            position: 'absolute', top: '10%', height: '80%', left: `${left}%`, width: `${width}%`,
                            backgroundColor: isDraggable ? 'primary.main' : 'grey.700',
                            color: 'primary.contrastText', zIndex: 1, overflow: 'hidden',
                            p: 0.5, cursor: isDraggable ? 'grab' : 'default',
                            '&:hover': { backgroundColor: 'primary.dark' }
                          }}
                        >
                          {/* Sombreado sutil para el tiempo de descarga */}
                          <Box
                            sx={{
                              position: 'absolute', top: 0, bottom: 0,
                              left: `${(inicioDescargaRelativo / duracionTotalViaje) * 100}%`,
                              width: `${(duracionDescarga / duracionTotalViaje) * 100}%`,
                              backgroundColor: alpha('#000', 0.15),
                              borderRadius: 'inherit',
                              pointerEvents: 'none'
                            }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, position: 'relative' }}>
                            P-{viaje.pedido_id}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, position: 'relative' }}>
                            {viaje.articulo.nombre} ({viaje.cantidad}m³)
                          </Typography>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              );
            })}
            {/* Drop Indicator Line */}
            {dropIndicator !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '40px', // Start below the header
                  bottom: 0,
                  left: `${dropIndicator}%`,
                  width: '2px',
                  backgroundColor: theme.palette.secondary.main,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default GanttChart;
