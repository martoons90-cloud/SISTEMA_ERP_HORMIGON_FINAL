import React from 'react';
import {
  Box, Typography, Paper, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, ToggleButtonGroup,
  ToggleButton, Button, Tooltip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Calendar, List, Truck, Buildings, Gear } from 'phosphor-react';
import { useProgramacionDiaria } from './programaciondiaria_logic';
import { ProgramacionPedidoRow } from './programaciondiaria_components';
import ProgramarViajeDialog from './ProgramarViajeDialog';
import AsignarRecursosDialog from './AsignarRecursosDialog';
import ConfirmationDialog from './ConfirmationDialog';
import { supabase } from '../../supabaseClient';
import GeocodificacionDialog from './GeocodificacionDialog';
import FlotaDialog from './FlotaDialog';
import RangeProgramacionDialog from './RangeProgramacionDialog';
import GanttChart from './GanttChart';
import PlantGanttChart from './PlantGanttChart';
import DateFilter from './DateFilter';

const ProgramacionDiaria = () => {
  const { states, handlers } = useProgramacionDiaria();
  const { enqueueSnackbar } = useSnackbar();
  const {
    loading, programarDialogOpen, asignarDialogOpen, selectedViaje, viewMode,
    dateFilter, ganttDate, isScheduling, rangeProgramacionDialogOpen, isEditMode,
    deleteViajeConfirmOpen, deletePedidoConfirmOpen, pedidoToDelete,
    geocodificacionDialogOpen, obraToGeocode, flotaDialogOpen, choferes, camiones,
    bombas, plantas, disponibilidadChoferes, disponibilidadCamiones,
    disponibilidadBombas, pedidosAgrupadosPorDia, viajesAsignadosDelDia
  } = states;

  const {
    getChoferById, handleOpenProgramarDialog, handleCloseProgramarDialog, handleSaveProgramacion,
    handleOpenEditarDialog, handleOpenAsignarDialog, handleCloseDialog, handleDeleteViajeRequest,
    handleConfirmDeleteViaje, handleDeletePedidoRequest, handleConfirmDeletePedido, handleUpdateRealTime, getRouteDetails,
    handleOpenGeocodificacionDialog,
    handleToggleDisponibilidadChofer,
    handleToggleDisponibilidadCamion, handleDragStart, handleDragOver, handleDrop, handleUnassign, 
    handleUnassignByChofer, handleToggleDisponibilidadBomba, executeSchedulingForRange,
    handleGenerarProgramacionClick, handleViewModeChange, handleViajeDrop,
    // Setters
    setRangeProgramacionDialogOpen, setDeleteViajeConfirmOpen, setDeletePedidoConfirmOpen,
    setGeocodificacionDialogOpen, setFlotaDialogOpen, fetchData
  } = handlers;

  // --- LÓGICA DE GUARDADO ASÍNCRONA DIRECTAMENTE AQUÍ ---
  const handleUpdateObraLocation = async (obraId, { latitud, longitud }) => {
    try {
      const { error } = await supabase
        .from('ven_clientes_obras') // Asegúrate que la tabla es 'ven_obras'
        .update({ latitud, longitud })
        .eq('id', obraId);
      if (error) throw error;
      enqueueSnackbar('Ubicación de la obra actualizada con éxito.', { variant: 'success' });
      await fetchData(); // Recargar todos los datos
    } catch (error) {
      enqueueSnackbar('Error al guardar la ubicación: ' + error.message, { variant: 'error' });
      throw error; // Lanzamos el error para que el diálogo sepa que falló
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Programación Diaria de Entregas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter
            dateFilter={dateFilter}
            onDateFilterChange={(e) => handlers.setDateFilter(e.target.value)}
            ganttDate={ganttDate}
            onGanttDateChange={(e) => handlers.setGanttDate(e.target.value)}
            viewMode={viewMode}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="visualización"
          >
            <Tooltip title="Vista de Tabla"><ToggleButton value="table" aria-label="tabla"><List /></ToggleButton></Tooltip>
            <Tooltip title="Gantt por Camión"><ToggleButton value="gantt_camiones" aria-label="gantt camiones"><Truck /></ToggleButton></Tooltip>
            <Tooltip title="Gantt por Planta"><ToggleButton value="gantt_plantas" aria-label="gantt plantas"><Buildings /></ToggleButton></Tooltip>
          </ToggleButtonGroup>
          <Tooltip title="Configuración de Logística">
            <IconButton component={RouterLink} to="/logistica/configuracion"><Gear /></IconButton>
          </Tooltip>
          <Button variant="outlined" onClick={() => setFlotaDialogOpen(true)}>Gestionar Flota</Button>
          <Button variant="contained" onClick={handleGenerarProgramacionClick} disabled={isScheduling}>
            {isScheduling ? <CircularProgress size={24} /> : 'Generar Programación'}
          </Button>
          <Button variant="contained" color="secondary" onClick={handleOpenProgramarDialog}>
            + Programar Pedido
          </Button>
        </Box>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      {!loading && viewMode === 'table' && (
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Pedido / Cliente</TableCell>
                <TableCell>Obra / Ubicación</TableCell>
                <TableCell align="center">Hora Prog.</TableCell>
                <TableCell>Tipo Hormigón</TableCell>
                <TableCell align="right">Cant. (Día)</TableCell>
                <TableCell align="center">C/Bomba</TableCell>
                <TableCell align="center">Viajes / Desvío</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidosAgrupadosPorDia.map(({ fecha, pedidos }) => (
                <React.Fragment key={fecha}>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ backgroundColor: 'grey.200' }}>
                      <Typography variant="subtitle1" fontWeight="bold"><Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />{new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
                    </TableCell>
                  </TableRow>
                  {pedidos.map(({ pedido, viajes: viajesDelPedido }) => (
                    <ProgramacionPedidoRow
                      key={pedido.id}
                      pedido={pedido}
                      viajes={viajesDelPedido}
                      onOpenAsignarDialog={handleOpenAsignarDialog}
                      onOpenEditarDialog={handleOpenEditarDialog}
                      onDeleteViajeRequest={handleDeleteViajeRequest}
                      onDeletePedidoRequest={handleDeletePedidoRequest}
                      onOpenGeocodificacionDialog={handleOpenGeocodificacionDialog}
                      onUpdateRealTime={handleUpdateRealTime}
                    />
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {!loading && viewMode === 'gantt_camiones' && (
          <GanttChart 
            viajes={viajesAsignadosDelDia} 
            camiones={camiones} 
            onViajeDrop={handleViajeDrop} 
            stops={['hora_inicio_carga_teorica', 'hora_fin_carga_teorica', 'hora_salida_planta_teorica', 'hora_llegada_obra_teorica', 'hora_inicio_descarga_teorica', 'hora_fin_descarga_teorica', 'hora_llegada_planta_teorica']}
          />
      )}
      {!loading && viewMode === 'gantt_plantas' && (
          <PlantGanttChart viajes={viajesAsignadosDelDia} plantas={plantas} camiones={camiones} />
      )}

      <ProgramarViajeDialog
        open={programarDialogOpen}
        onClose={handleCloseProgramarDialog}
        onSave={handleSaveProgramacion}
        isEdit={isEditMode}
        viaje={selectedViaje}
        plantas={plantas}
      />
      <AsignarRecursosDialog
        open={asignarDialogOpen}
        onClose={handleCloseDialog}
        viaje={selectedViaje}
        camiones={camiones}
        choferes={choferes}
        bombas={bombas}
        onSave={() => { executeSchedulingForRange(selectedViaje.fecha_programada, selectedViaje.fecha_programada); handleCloseDialog(); }}
      />
      <ConfirmationDialog
        open={deleteViajeConfirmOpen}
        onClose={() => setDeleteViajeConfirmOpen(false)}
        onConfirm={handleConfirmDeleteViaje}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.`}
      />
      <ConfirmationDialog
        open={deletePedidoConfirmOpen}
        onClose={() => setDeletePedidoConfirmOpen(false)}
        onConfirm={handleConfirmDeletePedido}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar todos los viajes del día para el pedido N° ${pedidoToDelete?.pedido?.id}?`}
      />
      <GeocodificacionDialog
        open={geocodificacionDialogOpen}
        onClose={() => setGeocodificacionDialogOpen(false)}
        onSave={(coords) => handleUpdateObraLocation(obraToGeocode.id, coords)}
        obra={obraToGeocode}
        plantas={plantas}
        getRouteDetails={getRouteDetails}
      />
      <FlotaDialog
        open={flotaDialogOpen}
        onClose={() => setFlotaDialogOpen(false)}
        choferes={choferes}
        camiones={camiones}
        bombas={bombas}
        disponibilidadChoferes={disponibilidadChoferes}
        disponibilidadCamiones={disponibilidadCamiones}
        disponibilidadBombas={disponibilidadBombas}
        onToggleDisponibilidadChofer={handleToggleDisponibilidadChofer}
        onToggleDisponibilidadCamion={handleToggleDisponibilidadCamion}
        onToggleDisponibilidadBomba={handleToggleDisponibilidadBomba}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onUnassign={handleUnassign}
        getChoferById={getChoferById}
        onRefresh={fetchData}
      />
      <RangeProgramacionDialog
        open={rangeProgramacionDialogOpen}
        onClose={() => setRangeProgramacionDialogOpen(false)}
        onConfirm={(start, end) => executeSchedulingForRange(start, end)}
      />
    </Paper>
  );
};

export default ProgramacionDiaria;
