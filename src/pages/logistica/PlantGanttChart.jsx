import React from 'react';
import { Box, Typography, Paper, Tooltip } from '@mui/material';

// Helper para convertir HH:MM a minutos desde el inicio del día (00:00)
const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const PlantGanttChart = ({ viajes, plantas, camiones }) => {
  const jornadaInicio = 7 * 60; // 07:00
  const jornadaFin = 19 * 60;   // 19:00
  const duracionJornada = jornadaFin - jornadaInicio;

  const horas = [];
  for (let i = 7; i <= 19; i++) {
    horas.push(`${String(i).padStart(2, '0')}:00`);
  }

  const getCamionById = (id) => camiones.find(c => c.id === id);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Carga de Trabajo por Planta</Typography>
      <Box sx={{ display: 'flex', width: '100%', overflowX: 'auto' }}>
        {/* Columna de Recursos (Plantas) */}
        <Box sx={{ minWidth: 200, borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ height: 40, display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2">Planta</Typography>
          </Box>
          {plantas.map(planta => (
            <Box key={planta.id} sx={{ height: 60, display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight="bold">{planta.nombre}</Typography>
            </Box>
          ))}
        </Box>

        {/* Gráfico Gantt */}
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          {/* Cabecera de Horas */}
          <Box sx={{ height: 40, display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
            {horas.map(hora => (
              <Box key={hora} sx={{ flex: '1 1 0', minWidth: 80, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider', p: 1 }}>
                <Typography variant="caption">{hora}</Typography>
              </Box>
            ))}
          </Box>

          {/* Filas de Carga de Trabajo */}
          {plantas.map(planta => {
            const viajesDeLaPlanta = viajes.filter(v => v.planta_id === planta.id);
            return (
              <Box
                key={planta.id}
                sx={{ height: 60, position: 'relative', borderBottom: '1px solid', borderColor: 'divider' }}
              >
                {/* Fondo con líneas de división */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', zIndex: 0 }}>
                  {horas.map((hora) => (
                    <Box key={`grid-${planta.id}-${hora}`} sx={{ flex: '1 1 0', display: 'flex', borderRight: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                      <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                      <Box sx={{ flex: 1, borderRight: '1px dotted', borderColor: 'action.disabled' }} />
                      <Box sx={{ flex: 1 }} />
                    </Box>
                  ))}
                </Box>

                {viajesDeLaPlanta.map(viaje => {
                  const inicio = timeToMinutes(viaje.hora_inicio_carga_teorica);
                  const fin = timeToMinutes(viaje.hora_salida_planta_teorica); // La planta está ocupada hasta que sale el camión
                  if (!inicio || !fin) return null;

                  const left = ((inicio - jornadaInicio) / duracionJornada) * 100;
                  const width = ((fin - inicio) / duracionJornada) * 100;
                  const camion = getCamionById(viaje.camion_id);

                  return (
                    <Tooltip
                      key={viaje.id}
                      title={
                        <React.Fragment>
                          <Typography color="inherit">Cargando para Pedido: {viaje.pedido_id}</Typography>
                          <Typography variant="body2">{viaje.hora_inicio_carga_teorica} - {viaje.hora_salida_planta_teorica}</Typography>                          <Typography variant="caption">Camión: {camion?.patente || 'N/A'} ({viaje.cantidad} m³)</Typography>
                        </React.Fragment>
                      }
                    >
                      <Paper sx={{ position: 'absolute', top: '10%', height: '80%', left: `${left}%`, width: `${width}%`, backgroundColor: 'secondary.main', color: 'secondary.contrastText', zIndex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', p: 0.5, }}>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>P-{viaje.pedido_id}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>{camion?.patente} ({viaje.cantidad}m³)</Typography>
                      </Paper>
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};

export default PlantGanttChart;