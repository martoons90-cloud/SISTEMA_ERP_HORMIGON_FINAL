import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';
import { useProgramacionData } from '../../hooks/useProgramacionData'; // Asegúrate que la importación de getRouteDetails esté aquí
import { getRouteDetails } from '../../services/orsService';
import { timeToMinutes, addMinutes } from '../../utils/timeUtils';

export const useProgramacionDiaria = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // 1. OBTENER DATOS CRUDOS DESDE EL HOOK ESPECIALIZADO
  const {
    viajes, choferes, camiones, bombas, plantas,
    disponibilidadChoferes: initialDisponibilidadChoferes,
    disponibilidadCamiones: initialDisponibilidadCamiones,
    disponibilidadBombas: initialDisponibilidadBombas,
    loading: dataLoading,
    fetchData,
    setViajes,
  } = useProgramacionData();

  // 2. ESTADOS DE LA INTERFAZ Y DISPONIBILIDAD
  const [programarDialogOpen, setProgramarDialogOpen] = useState(false);
  const [asignarDialogOpen, setAsignarDialogOpen] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [dateFilter, setDateFilter] = useState('hoy');
  const [ganttDate, setGanttDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [rangeProgramacionDialogOpen, setRangeProgramacionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteViajeConfirmOpen, setDeleteViajeConfirmOpen] = useState(false);
  const [viajeToDelete, setViajeToDelete] = useState(null);
  const [deletePedidoConfirmOpen, setDeletePedidoConfirmOpen] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState(null);
  const [geocodificacionDialogOpen, setGeocodificacionDialogOpen] = useState(false);
  const [obraToGeocode, setObraToGeocode] = useState(null);
  const [flotaDialogOpen, setFlotaDialogOpen] = useState(false);

  const [config, setConfig] = useState({}); // Estado para almacenar la configuración

  const [disponibilidadChoferes, setDisponibilidadChoferes] = useState(initialDisponibilidadChoferes);
  const [disponibilidadCamiones, setDisponibilidadCamiones] = useState(initialDisponibilidadCamiones);
  const [disponibilidadBombas, setDisponibilidadBombas] = useState(initialDisponibilidadBombas);

  // Sincronizar disponibilidad cuando los datos se recargan
  useMemo(() => {
    setDisponibilidadChoferes(initialDisponibilidadChoferes);
    setDisponibilidadCamiones(initialDisponibilidadCamiones);
    setDisponibilidadBombas(initialDisponibilidadBombas);
  }, [initialDisponibilidadChoferes, initialDisponibilidadCamiones, initialDisponibilidadBombas]);

  // Cargar la configuración al inicio
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('log_configuracion')
          .select('*')
          .single();
        if (error) throw error;
        setConfig(data);
      } catch (error) {
        console.error("Error al cargar la configuración:", error);
        enqueueSnackbar('Error al cargar la configuración: ' + error.message, { variant: 'error' });
      }
    };
    fetchConfig();
  }, [initialDisponibilidadChoferes, initialDisponibilidadCamiones, initialDisponibilidadBombas]);

  // 3. DATOS MEMOIZADOS (Cálculos derivados del estado)
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toISODateString = (d) => d.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'hoy': return { start: toISODateString(today), end: toISODateString(today) };
      case 'mañana': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { start: toISODateString(tomorrow), end: toISODateString(tomorrow) };
      }
      case 'esta_semana': {
        const currentDay = today.getDay();
        const first = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(new Date(today).setDate(first));
        const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
        return { start: toISODateString(monday), end: toISODateString(sunday) };
      }
      case 'este_mes': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: toISODateString(firstDay), end: toISODateString(lastDay) };
      }
      default: return { start: null, end: null };
    }
  }, [dateFilter]);

  const pedidosAgrupadosPorDia = useMemo(() => {
    if (dataLoading) return [];
    const viajesFiltrados = viajes.filter(v => dateFilter === 'todos' ? true : (v.fecha_programada >= dateRange.start && v.fecha_programada <= dateRange.end));
    const agrupadoPorFecha = viajesFiltrados.reduce((acc, viaje) => {
      const fecha = viaje.fecha_programada;
      if (!acc[fecha]) acc[fecha] = [];
      acc[fecha].push(viaje);
      return acc;
    }, {});
    return Object.keys(agrupadoPorFecha).sort().map(fecha => {
      const viajesDeLaFecha = agrupadoPorFecha[fecha];
      const pedidosDeLaFecha = viajesDeLaFecha.reduce((acc, viaje) => {
        const groupKey = `${viaje.pedido_id}-${viaje.hora_programada}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(viaje);
        return acc;
      }, {});
      const pedidosConViajes = Object.keys(pedidosDeLaFecha).map(groupKey => ({
        pedido: pedidosDeLaFecha[groupKey][0].pedido,
        // Ordenamos los viajes de cada pedido por la hora de inicio de carga
        viajes: pedidosDeLaFecha[groupKey].sort((a, b) => {
          const horaA = a.hora_inicio_carga_teorica || '00:00:00';
          const horaB = b.hora_inicio_carga_teorica || '00:00:00';
          return horaA.localeCompare(horaB);
        })
      })).filter(p => p.pedido).sort((a, b) => a.viajes[0].hora_programada.localeCompare(b.viajes[0].hora_programada));
      return { fecha, pedidos: pedidosConViajes };
    });
  }, [viajes, dateFilter, dateRange, dataLoading]);

  const viajesAsignadosDelDia = useMemo(() => {
    const viajesFiltrados = viajes.filter(v => {
      if (viewMode === 'gantt_camiones' || viewMode === 'gantt_plantas') return v.fecha_programada === ganttDate;
      return dateFilter === 'todos' ? true : (v.fecha_programada >= dateRange.start && v.fecha_programada <= dateRange.end);
    });
    return viajesFiltrados.filter(v => v.estado === 'ASIGNADO' || v.estado === 'EN_VIAJE' || v.estado === 'ENTREGADO');
  }, [viajes, viewMode, dateFilter, dateRange, ganttDate]);

  // 4. HANDLERS (Manejadores de eventos y acciones)
  const getChoferById = useCallback((id) => choferes.find(c => c.id === id) || null, [choferes]);

  const handleOpenProgramarDialog = () => {
    setIsEditMode(false);
    setSelectedViaje(null);
    setProgramarDialogOpen(true);
  };

  const handleCloseProgramarDialog = () => {
    setProgramarDialogOpen(false);
    setSelectedViaje(null);
    setIsEditMode(false);
  };

  const handleSaveProgramacion = async (viajesData, isEdit) => {
    setIsScheduling(true);
    try {
      if (isEdit) {
        // La edición de un viaje ahora simplemente actualiza los datos y dispara una re-planificación
        const viajeActualizado = {
          ...viajesData,
          cantidad: parseFloat(viajesData.cantidad),
        };
        const { error } = await supabase.from('log_viajes').update(viajeActualizado).eq('id', viajeActualizado.id);
        if (error) throw error;
        enqueueSnackbar('Viaje actualizado. Re-planificando...', { variant: 'info' });

        // --- NUEVO: Actualizar la bandera de descarga simultánea en el pedido asociado ---
        // Esto asume que viajeActualizado.pedido contiene el ID del pedido y la bandera actualizada.
        if (viajeActualizado.pedido && viajeActualizado.pedido.id && 'descarga_en_simultaneo' in viajeActualizado.pedido) {
          const { error: pedidoUpdateError } = await supabase.from('ven_pedidos_venta').update({
            descarga_en_simultaneo: viajeActualizado.pedido.descarga_en_simultaneo
          }).eq('id', viajeActualizado.pedido.id);
          if (pedidoUpdateError) throw pedidoUpdateError;
        }

        await executeSchedulingForRange(viajeActualizado.fecha_programada, viajeActualizado.fecha_programada);
      } else {
        // La creación de nuevos viajes los inserta como PENDIENTE_PLANIFICACION
        // Al crear un nuevo viaje "maestro", nos aseguramos de que no tenga ID
        // para que la base de datos le asigne uno nuevo automáticamente.
        const viajesParaInsertar = viajesData.map(v => {
          const { id, ...restoDelViaje } = v; // Desestructuramos para quitar el ID
          return {
            ...restoDelViaje,
            estado: 'PENDIENTE_PLANIFICACION'
          };
        });
        const { error } = await supabase.from('log_viajes').insert(viajesParaInsertar);
        if (error) throw error;
        enqueueSnackbar('Pedidos programados. Listos para generar la planificación.', { variant: 'success' });
        fetchData(); // Solo recargamos datos, la planificación se hará con el botón
      }
    } catch (error) {
      enqueueSnackbar(`Error al ${isEdit ? 'actualizar' : 'programar'}: ${error.message}`, { variant: 'error' });
    } finally {
      setIsScheduling(false);
      handleCloseProgramarDialog();
    }
  };

  const executeSchedulingForRange = async (startDateStr, endDateStr) => {
    setIsScheduling(true);
    try {
      // 1. Obtener la configuración más reciente
      const { data: logisticaConfig, error: configError } = await supabase
        .from('log_configuracion')
        .select('*')
        .single();

      if (configError) throw configError;

      // --- NUEVO: Obtener datos históricos para el estimador ---
      const { data: viajesHistorico, error: historicoError } = await supabase
        .from('viajes_historico')
        .select('*');
      
      if (historicoError) throw historicoError;

      // Filtramos los viajes que están dentro del rango de fechas que queremos programar.
      // Esto incluye tanto los 'ASIGNADO' (para re-planificar) como los 'PENDIENTE_PLANIFICACION' (para planificar por primera vez).
      const viajesParaOptimizar = viajes.filter(v => v.fecha_programada >= startDateStr && v.fecha_programada <= endDateStr);

      // Ya no se pre-calculan los tiempos de viaje aquí. El backend se encargará de todo.

      // --- PASO CLAVE: Aplanar la estructura de datos ---
      // Copiamos los datos de la obra al nivel superior de cada viaje para facilitar el acceso en el backend.
      const viajesAplanados = viajesParaOptimizar.map(v => {
        const obra = v.pedido?.obra;
        return {
          ...v,
          obra_lat: obra?.latitud,
          obra_lon: obra?.longitud,
        };
      });

      // 2. Preparar el cuerpo de la petición para la API de optimización
      const problemData = {
        viajes: viajesAplanados,
        camiones: camiones.filter(c => disponibilidadCamiones[c.id]),
        plantas,
        viajes_historico: viajesHistorico, // <-- Añadir los datos históricos
        config: logisticaConfig, // Se envía la configuración leída de la BD sin modificar.
      };

      // 3. Llamar a nuestra nueva API de Python en Vercel
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/optimizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el servidor de optimización.');
      }

      const planificacionOptimizada = await response.json();

      const { viajes_planificados, ids_a_eliminar } = planificacionOptimizada;

      // 4. Guardar la nueva planificación en la base de datos (LÓGICA DE BORRADO Y REEMPLAZO)

      // Paso 4.1: Eliminar los viajes maestros originales que se procesaron
      if (ids_a_eliminar && ids_a_eliminar.length > 0) {
        await supabase.from('log_viajes').delete().in('id', ids_a_eliminar);
      }

      // Paso 4.2: Eliminar los viajes 'ASIGNADO' existentes que NO tienen tiempos reales.
      // Esto previene la duplicación. Los viajes con tiempos reales se conservan.
      const { data: viajesActuales, error: fetchError } = await supabase
        .from('log_viajes')
        .select('id, hora_inicio_carga_real')
        .in('fecha_programada', [startDateStr, endDateStr])
        .eq('estado', 'ASIGNADO');

      if (fetchError) throw fetchError;

      const idsAEliminar = viajesActuales
        .filter(v => v.hora_inicio_carga_real === null) // Solo borrar si no ha comenzado
        .map(v => v.id);

      if (idsAEliminar.length > 0) {
        await supabase.from('log_viajes').delete().in('id', idsAEliminar);
      }

      // Paso 4.3: Insertar la nueva planificación.
      if (viajes_planificados && viajes_planificados.length > 0) {
        const { error: insertError } = await supabase.from('log_viajes').insert(viajes_planificados);
        if (insertError) throw insertError;
      }

      enqueueSnackbar(`Programación optimizada generada con éxito.`, { variant: 'success' });
      await fetchData(); // Recargar los datos para mostrar la nueva planificación
    } catch (error) {
      enqueueSnackbar('Error al generar la programación: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleOpenEditarDialog = (viaje) => {
    setIsEditMode(true);
    // Para editar, pasamos el viaje completo, que incluye el pedido
    const viajeCompleto = viajes.find(v => v.id === viaje.id);
    setSelectedViaje(viajeCompleto);
    setProgramarDialogOpen(true);
  };

  const handleOpenAsignarDialog = (viaje) => {
    const viajeCompleto = viajes.find(v => v.id === viaje.id);
    setSelectedViaje(viajeCompleto);
    setAsignarDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setAsignarDialogOpen(false);
    setSelectedViaje(null);
  };

  const handleDeleteViajeRequest = (viaje) => {
    setViajeToDelete(viaje);
    setDeleteViajeConfirmOpen(true);
  };

  const handleConfirmDeleteViaje = async () => {
    if (!viajeToDelete) return;
    setIsScheduling(true);
    try {
      const { error } = await supabase.from('log_viajes').delete().eq('id', viajeToDelete.id);
      if (error) throw error;
      enqueueSnackbar('Viaje eliminado con éxito.', { variant: 'info' });
      fetchData();
    } catch (error) {
      enqueueSnackbar('Error al eliminar el viaje: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
      setDeleteViajeConfirmOpen(false);
      setViajeToDelete(null);
    }
  };

  const handleDeletePedidoRequest = (pedido, viajes) => {
    setPedidoToDelete({ pedido, viajes });
    setDeletePedidoConfirmOpen(true);
  };

  const handleConfirmDeletePedido = async () => {
    if (!pedidoToDelete) return;
    setIsScheduling(true);
    try {
      const viajeIdsToDelete = pedidoToDelete.viajes.map(v => v.id);
      const { error } = await supabase.from('log_viajes').delete().in('id', viajeIdsToDelete);
      if (error) throw error;
      enqueueSnackbar(`Programación para el pedido N° ${pedidoToDelete.pedido.id} eliminada.`, { variant: 'info' });
      fetchData();
    } catch (error) {
      enqueueSnackbar('Error al eliminar la programación del pedido: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
      setDeletePedidoConfirmOpen(false);
      setPedidoToDelete(null);
    }
  };

  const handleOpenGeocodificacionDialog = (obra, plantaId, fecha) => {
    setObraToGeocode({ ...obra, preselectedPlantaId: plantaId, fecha_afectada: fecha });
    setGeocodificacionDialogOpen(true);
  };

  const handleSaveGeocodificacion = async (obra, { latitud, longitud }) => {
    setIsScheduling(true);
    try {
      const { error } = await supabase.from('ven_clientes_obras').update({ latitud, longitud }).eq('id', obra.id);
      if (error) throw error;
      enqueueSnackbar('Ubicación actualizada. Recalculando programación...', { variant: 'info' });
      if (obra.fecha_afectada) {
        await executeSchedulingForRange(obra.fecha_afectada, obra.fecha_afectada);
      } else {
        fetchData();
      }
    } catch (error) {
      enqueueSnackbar('Error al guardar la ubicación: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
      setGeocodificacionDialogOpen(false);
    }
  };

  const handleToggleDisponibilidadChofer = (choferId) => {
    const nuevaDisponibilidad = !disponibilidadChoferes[choferId];
    setDisponibilidadChoferes(prev => ({ ...prev, [choferId]: nuevaDisponibilidad }));
    if (!nuevaDisponibilidad) handleUnassignByChofer(choferId);
  };

  const handleToggleDisponibilidadCamion = (camionId) => {
    const nuevaDisponibilidad = !disponibilidadCamiones[camionId];
    setDisponibilidadCamiones(prev => ({ ...prev, [camionId]: nuevaDisponibilidad }));
    if (!nuevaDisponibilidad) handleUnassign(camionId);
  };

  const handleDragStart = (e, choferId) => e.dataTransfer.setData("choferId", choferId);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, camionId) => {
    e.preventDefault();
    const choferId = parseInt(e.dataTransfer.getData("choferId"), 10);
    setIsScheduling(true);
    try {
      await supabase.from('log_camiones').update({ chofer_asignado_id: null }).eq('chofer_asignado_id', choferId);
      await supabase.from('log_camiones').update({ chofer_asignado_id: choferId }).eq('id', camionId);
      enqueueSnackbar('Chofer asignado al camión.', { variant: 'success' });
      fetchData();
    } catch (error) {
      enqueueSnackbar('Error al asignar chofer: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnassign = async (camionId) => {
    setIsScheduling(true);
    try {
      await supabase.from('log_camiones').update({ chofer_asignado_id: null }).eq('id', camionId);
      enqueueSnackbar('Chofer desasignado.', { variant: 'info' });
      fetchData();
    } catch (error) {
      enqueueSnackbar('Error al desasignar chofer: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnassignByChofer = async (choferId) => {
    setIsScheduling(true);
    try {
      await supabase.from('log_camiones').update({ chofer_asignado_id: null }).eq('chofer_asignado_id', choferId);
      fetchData();
    } catch (error) {
      enqueueSnackbar('Error al desasignar chofer: ' + error.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleToggleDisponibilidadBomba = (bombaId) => {
    setDisponibilidadBombas(prev => ({ ...prev, [bombaId]: !prev[bombaId] }));
  };

  const handleGenerarProgramacionClick = () => {
    if (viewMode === 'table') {
      if (dateFilter === 'todos') {
        setRangeProgramacionDialogOpen(true);
      } else {
        executeSchedulingForRange(dateRange.start, dateRange.end);
      }
    } else {
      executeSchedulingForRange(ganttDate, ganttDate);
    }
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) setViewMode(newViewMode);
  };

  const handleViajeDrop = async (viajeId, nuevoCamionId, nuevoInicioEnMinutosPropuesto) => {
    const viajeAMover = viajes.find(v => v.id === viajeId);
    if (!viajeAMover) return;

    // Simplificamos: actualizamos el camión y la hora, y disparamos una re-planificación completa.
    const nuevoChoferId = camiones.find(c => c.id === nuevoCamionId)?.chofer_asignado_id;
    const nuevaHora = addMinutes('00:00', nuevoInicioEnMinutosPropuesto);

    try {
      await supabase.from('log_viajes').update({
        camion_id: nuevoCamionId,
        chofer_id: nuevoChoferId,
        hora_programada: nuevaHora, // Actualizamos la hora programada como una "pista" para el optimizador
      }).eq('id', viajeId);

      enqueueSnackbar(`Viaje ${viajeId} reasignado. Re-optimizando el día...`, { variant: 'info' });
      await executeSchedulingForRange(viajeAMover.fecha_programada, viajeAMover.fecha_programada);

    } catch (error) {
      enqueueSnackbar('Error al reprogramar el viaje: ' + error.message, { variant: 'error' });
      fetchData(); // Revertir visualmente si falla
    }
  };

  // Handler para cuando el cliente avisa ANTES del último viaje
  const handleAmpliacionAntes = async (pedidoId, faltante_m3, fechaProgramada) => {
    setIsScheduling(true);
    try {
      // 1) Encontrar el viaje maestro (PENDIENTE_PLANIFICACION) y actualizar su cantidad
      const { data: viajeMaestro, error: findError } = await supabase
        .from('log_viajes')
        .select('id, cantidad')
        .eq('pedido_id', pedidoId)
        .eq('estado', 'PENDIENTE_PLANIFICACION')
        .single();

      if (findError || !viajeMaestro) throw new Error('No se encontró un viaje maestro pendiente para este pedido.');

      const nuevaCantidad = parseFloat(viajeMaestro.cantidad) + parseFloat(faltante_m3);
      const { error: updErr } = await supabase
        .from('log_viajes')
        .update({ cantidad: nuevaCantidad })
        .eq('id', viajeMaestro.id);

      if (updErr) throw updErr;

      // 2) Re-lanzar planificación para la fecha afectada
      await executeSchedulingForRange(fechaProgramada, fechaProgramada);

      enqueueSnackbar('Ampliación aplicada y re-planificada correctamente', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Error al aplicar ampliación: ' + err.message, { variant: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  // Handler para cuando el cliente avisa DESPUÉS (corte)
  const handleCortePostDescarga = async (obraId, pedidoId, faltante_m3, fechaProgramada) => {
    setIsScheduling(true);
    try {
      // 1) Crear registro de viaje extra urgente
      const { data: [viajeExtra], error: insErr } = await supabase.from('log_viajes').insert({
        pedido_id: pedidoId,
        cantidad: faltante_m3,
        fecha_programada: fechaProgramada,
        estado: 'EXTRA_URGENTE',
        es_extra: true,
        prioridad: 999,
      }).select().single();

      if (insErr) throw insErr;

      // 2) Llamar al endpoint heurístico para inserción rápida
      const resp = await fetch('/api/urgente/insertar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje: viajeExtra, camiones, plantas, config: {} /* Pasa tu config aquí */ })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al insertar viaje urgente');

      enqueueSnackbar('Viaje extra urgente creado y programado.', { variant: 'success' });
      await fetchData();
    } catch (err) {
      enqueueSnackbar('Error al crear viaje extra: ' + err.message, { variant: 'error' });
      setIsScheduling(false);
    }
  };

  const handleUpdateRealTime = async (viajeId, field, value) => {
    const updateValue = value === '' ? null : value;
    const viajeOriginal = viajes.find(v => v.id === viajeId);
    if (!viajeOriginal) return;

    const updates = { [field]: updateValue };

    // --- ¡NUEVA LÓGICA! EFECTO DOMINÓ ---
    // Si se ingresa un tiempo real, recalcula los siguientes tiempos TEÓRICOS.
    const duracionCarga = timeToMinutes(viajeOriginal.hora_fin_carga_teorica) - timeToMinutes(viajeOriginal.hora_inicio_carga_teorica);
    const duracionManiobra = timeToMinutes(viajeOriginal.hora_salida_planta_teorica) - timeToMinutes(viajeOriginal.hora_fin_carga_teorica);
    const duracionViajeIda = timeToMinutes(viajeOriginal.hora_llegada_obra_teorica) - timeToMinutes(viajeOriginal.hora_salida_planta_teorica);
    const duracionEsperaObra = timeToMinutes(viajeOriginal.hora_inicio_descarga_teorica) - timeToMinutes(viajeOriginal.hora_llegada_obra_teorica);
    const duracionDescarga = timeToMinutes(viajeOriginal.hora_fin_descarga_teorica) - timeToMinutes(viajeOriginal.hora_inicio_descarga_teorica);
    const duracionViajeVuelta = timeToMinutes(viajeOriginal.hora_llegada_planta_teorica) - timeToMinutes(viajeOriginal.hora_fin_descarga_teorica);

    let recalcularDesde = null;

    if (field === 'hora_inicio_carga_real' && updateValue) {
      recalcularDesde = timeToMinutes(updateValue);
      updates.hora_fin_carga_teorica = addMinutes(updateValue, duracionCarga);
      updates.hora_salida_planta_teorica = addMinutes(updates.hora_fin_carga_teorica, duracionManiobra);
      updates.hora_llegada_obra_teorica = addMinutes(updates.hora_salida_planta_teorica, duracionViajeIda);
      updates.hora_inicio_descarga_teorica = addMinutes(updates.hora_llegada_obra_teorica, duracionEsperaObra);
      updates.hora_fin_descarga_teorica = addMinutes(updates.hora_inicio_descarga_teorica, duracionDescarga);
      updates.hora_llegada_planta_teorica = addMinutes(updates.hora_fin_descarga_teorica, duracionViajeVuelta);
    } else if (field === 'hora_fin_carga_real' && updateValue) {
      updates.hora_salida_planta_teorica = addMinutes(updateValue, duracionManiobra);
      updates.hora_llegada_obra_teorica = addMinutes(updates.hora_salida_planta_teorica, duracionViajeIda);
      updates.hora_inicio_descarga_teorica = addMinutes(updates.hora_llegada_obra_teorica, duracionEsperaObra);
      updates.hora_fin_descarga_teorica = addMinutes(updates.hora_inicio_descarga_teorica, duracionDescarga);
      updates.hora_llegada_planta_teorica = addMinutes(updates.hora_fin_descarga_teorica, duracionViajeVuelta);
    }
    // ... puedes añadir más 'else if' para los otros campos reales si lo necesitas.

    try {
      // Actualiza todos los campos (el real y los teóricos recalculados) en una sola llamada
      const { error } = await supabase.from('log_viajes').update(updates).eq('id', viajeId);
      if (error) throw error;
      
      // Creamos un objeto actualizado para la lógica de histórico
      const viajeActualizado = { ...viajeOriginal, ...updates };

      // --- INICIO: LÓGICA PARA GUARDAR EN HISTÓRICO ---
      // Si el campo que se actualizó es la hora final de descarga, el viaje ha terminado.
      if (field === 'hora_fin_descarga_real' && updateValue !== null && viajeActualizado) {
        enqueueSnackbar('Viaje finalizado. Guardando en histórico...', { variant: 'info' });
        
        // Construimos el objeto para la tabla de histórico
        const historico = {
          viaje_id: viajeActualizado.id,
          camion_id: viajeActualizado.camion_id,
          chofer_id: viajeActualizado.chofer_id,
          planta_id: viajeActualizado.planta_id,
          obra_id: viajeActualizado.pedido?.obra_id,
          pedido_id: viajeActualizado.pedido_id,
          cantidad_m3: viajeActualizado.cantidad,
          fecha_programada: viajeActualizado.fecha_programada,
          hora_programada: viajeActualizado.hora_programada,
          
          // Tiempos reales (el que se acaba de actualizar y los que ya estaban)
          hora_inicio_carga_real: viajeActualizado.hora_inicio_carga_real,
          hora_fin_carga_real: viajeActualizado.hora_fin_carga_real,
          hora_salida_planta_real: viajeActualizado.hora_salida_planta_real,
          hora_llegada_obra_real: viajeActualizado.hora_llegada_obra_real,
          hora_inicio_descarga_real: viajeActualizado.hora_inicio_descarga_real,
          hora_fin_descarga_real: updateValue, // Usamos el valor recién guardado
          hora_llegada_planta_real: viajeActualizado.hora_llegada_planta_real,

          // Tiempos calculados (nuestros "targets" para el modelo)
          tiempo_viaje_ida_min: timeToMinutes(viajeActualizado.hora_llegada_obra_real) - timeToMinutes(viajeActualizado.hora_salida_planta_real),
          tiempo_descarga_min: timeToMinutes(updateValue) - timeToMinutes(viajeActualizado.hora_inicio_descarga_real),
          tiempo_viaje_vuelta_min: timeToMinutes(viajeActualizado.hora_llegada_planta_real) - timeToMinutes(updateValue),
          tiempo_ciclo_total_min: timeToMinutes(viajeActualizado.hora_llegada_planta_real) - timeToMinutes(viajeActualizado.hora_inicio_carga_real),

          // Contexto geográfico
          obra_lat: viajeActualizado.pedido?.obra?.latitud,
          obra_lon: viajeActualizado.pedido?.obra?.longitud,
          planta_lat: plantas.find(p => p.id === viajeActualizado.planta_id)?.latitud,
          planta_lon: plantas.find(p => p.id === viajeActualizado.planta_id)?.longitud,
        };

        // Insertar en la nueva tabla, ignorando si ya existe un registro para ese viaje_id
        const { error: historicoError } = await supabase
          .from('viajes_historico')
          .insert(historico, { onConflict: 'viaje_id', ignoreDuplicates: true });

        if (historicoError) {
          enqueueSnackbar(`Error al guardar en histórico: ${historicoError.message}`, { variant: 'warning' });
        }
      }
      // --- FIN: LÓGICA PARA GUARDAR EN HISTÓRICO ---

      if (viajeActualizado && config && config.reoptimizar_al_actualizar_tiempos) { // Asegurarse de que config exista
        enqueueSnackbar('Tiempo real actualizado. Re-optimizando...', { variant: 'info' });
        await executeSchedulingForRange(viajeActualizado.fecha_programada, viajeActualizado.fecha_programada);
      } else {
        fetchData();
      }
    } catch (error) {
      enqueueSnackbar(`Error al actualizar tiempo real: ${error.message}`, { variant: 'error' });
    }
  };

  // 5. VALORES DEVUELTOS POR EL HOOK
  return {
    states: {
      viajes, loading: dataLoading, programarDialogOpen, asignarDialogOpen, selectedViaje, // getRouteDetails no se devuelve, se usa internamente
      viewMode, dateFilter, ganttDate, isScheduling, rangeProgramacionDialogOpen,
      isEditMode, deleteViajeConfirmOpen, viajeToDelete, deletePedidoConfirmOpen,
      pedidoToDelete, geocodificacionDialogOpen, obraToGeocode, flotaDialogOpen,
      choferes, camiones, bombas, plantas, disponibilidadChoferes,
      disponibilidadCamiones, disponibilidadBombas, pedidosAgrupadosPorDia,
      viajesAsignadosDelDia, dateRange,
    },
    handlers: {
      fetchData, getChoferById, handleOpenProgramarDialog, handleCloseProgramarDialog,
      handleSaveProgramacion, handleOpenEditarDialog, handleOpenAsignarDialog,
      handleCloseDialog, handleDeleteViajeRequest, getRouteDetails, handleConfirmDeleteViaje,
      handleDeletePedidoRequest, handleConfirmDeletePedido, handleOpenGeocodificacionDialog, handleUpdateRealTime,
      handleSaveGeocodificacion, handleToggleDisponibilidadChofer,
      handleAmpliacionAntes, handleCortePostDescarga, // <-- Exportar nuevos handlers
      handleToggleDisponibilidadCamion, handleDragStart, handleDragOver, handleDrop,
      handleUnassign, handleUnassignByChofer, handleToggleDisponibilidadBomba,
      executeSchedulingForRange, handleGenerarProgramacionClick, handleViewModeChange,
      handleViajeDrop,
      // Setters
      setProgramarDialogOpen, setAsignarDialogOpen, setSelectedViaje, setViewMode,
      setDateFilter, setGanttDate, setIsScheduling, setRangeProgramacionDialogOpen,
      setIsEditMode, setDeleteViajeConfirmOpen, setViajeToDelete, setDeletePedidoConfirmOpen,
      setPedidoToDelete, setGeocodificacionDialogOpen, setObraToGeocode, setFlotaDialogOpen,
    },
  };
};
