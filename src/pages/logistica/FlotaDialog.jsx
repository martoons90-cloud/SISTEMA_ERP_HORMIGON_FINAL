import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, List, ListItem,
  ListItemText, Chip, Avatar, Tooltip, FormControlLabel, Switch, Typography, Paper, Box
} from '@mui/material';
import { User, Truck, XCircle, Car } from 'phosphor-react';

const FlotaDialog = ({
  open,
  onClose,
  choferes,
  camiones,
  bombas,
  disponibilidadChoferes,
  disponibilidadCamiones,
  disponibilidadBombas,
  handleToggleDisponibilidadChofer,
  handleToggleDisponibilidadCamion,
  handleToggleDisponibilidadBomba,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleUnassign,
  getChoferById,
}) => {

  const choferesDisponiblesParaAsignar = choferes.filter(
    c => disponibilidadChoferes[c.id] && !camiones.some(cam => cam.chofer_asignado_id === c.id)
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Gestión de Recursos Diarios</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Columna de Choferes */}
          <Grid xs={12} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Choferes Activos</Typography>
              <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                {choferes.map(chofer => {
                  const isDisponible = disponibilidadChoferes[chofer.id];
                  const isAsignado = camiones.some(cam => cam.chofer_asignado_id === chofer.id);
                  const isDraggable = isDisponible && !isAsignado;
                  return (
                    <ListItem
                      key={chofer.id}
                      draggable={isDraggable}
                      onDragStart={(e) => isDraggable && handleDragStart(e, chofer.id)}
                      sx={{
                        cursor: isDraggable ? 'grab' : 'default',
                        border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1,
                        opacity: isDisponible ? 1 : 0.5,
                        '&:hover': { backgroundColor: isDraggable ? 'action.hover' : 'inherit' }
                      }}
                    >
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}><User /></Avatar>
                      <ListItemText primary={chofer.nombre} secondary={isAsignado ? `Asignado a ${camiones.find(c => c.chofer_asignado_id === chofer.id)?.patente}` : `Legajo: ${chofer.legajo}`} />
                      <FormControlLabel control={<Switch size="small" checked={isDisponible} onChange={() => handleToggleDisponibilidadChofer(chofer.id)} />} label="Disp." labelPlacement="start" />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Columna de Camiones */}
          <Grid xs={12} lg={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Flota de Camiones Activos</Typography>
              <Grid container spacing={2}>
                {camiones.map(camion => {
                  const choferAsignado = getChoferById(camion.chofer_asignado_id);
                  const isDisponible = disponibilidadCamiones[camion.id];
                  return (
                    <Grid xs={12} md={6} key={camion.id}>
                      <Paper
                        variant="outlined"
                        onDragOver={isDisponible ? handleDragOver : undefined}
                        onDrop={(e) => isDisponible && handleDrop(e, camion.id)}
                        sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', opacity: isDisponible ? 1 : 0.5 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}><Truck /></Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">{camion.patente}</Typography>
                              <Typography variant="body2" color="text.secondary">{camion.marca} {camion.modelo}</Typography>
                            </Box>
                          </Box>
                          <FormControlLabel control={<Switch size="small" checked={isDisponible} onChange={() => handleToggleDisponibilidadCamion(camion.id)} />} label="Disp." labelPlacement="start" />
                        </Box>
                        <Box
                          sx={{
                            mt: 1, p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 1,
                            textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', minHeight: 60
                          }}
                        >
                          {choferAsignado ? (
                            <Tooltip title={`Legajo: ${choferAsignado.legajo}`}>
                              <Chip icon={<User />} label={choferAsignado.nombre} onDelete={() => handleUnassign(camion.id)} deleteIcon={<XCircle />} color="primary" disabled={!isDisponible} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">{isDisponible ? 'Asignar chofer aquí' : 'No disponible'}</Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          {/* Columna de Bombas */}
          <Grid xs={12}>
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Equipos de Bombeo</Typography>
              <List>
                {bombas.map(bomba => (
                  <ListItem
                    key={bomba.id}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: 'warning.main' }}><Car /></Avatar>
                    <ListItemText
                      primary={bomba.nombre}
                      secondary={`${bomba.marca || ''} ${bomba.modelo || ''} - Cap: ${bomba.capacidad_bombeo_m3h || 'N/A'} m³/h`}
                    />
                    <FormControlLabel
                      control={<Switch checked={disponibilidadBombas[bomba.id] || false} onChange={() => handleToggleDisponibilidadBomba(bomba.id)} />}
                      label="Disponible Hoy"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlotaDialog;