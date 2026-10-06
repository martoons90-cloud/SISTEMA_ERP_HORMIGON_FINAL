// src/pages/logistica/engine/schedulingCalculator.js
import { supabase } from '../supabaseClient.js';
import { getRouteDetails } from '../services/orsService.js';
import { timeToMinutes, addMinutes, subtractMinutes } from '../utils/timeUtils.js';

export const calculateSchedulingForRange = async (
  startDateStr,
  endDateStr,
  { camiones, bombas, plantas, disponibilidadCamiones, disponibilidadBombas }
) => {
  console.log(`%c--- INICIO DE PLANIFICACIÓN ---`, 'color: #881391; font-size: 16px; font-weight: bold;');
  console.log(`Rango de fechas: ${startDateStr} a ${endDateStr}`);

  const { data: logisticaConfig, error: configError } = await supabase
    .from('log_configuracion')
    .select('*')
    .limit(1)
    .single();

  if (configError) throw configError;
  console.log("%c1. Configuración de Logística Cargada:", "color: blue; font-weight: bold;", logisticaConfig);

  const datesToSchedule = [];
  let currentDate = new Date(startDateStr + 'T00:00:00Z');
  const endDate = new Date(endDateStr + 'T00:00:00Z');
  while (currentDate <= endDate) {
    datesToSchedule.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  console.log("%c2. Días a Planificar:", "color: blue; font-weight: bold;", datesToSchedule);

  const { data: allViajes, error: fetchAllError } = await supabase
    .from('log_viajes')
    .select('*, pedido:ven_pedidos_venta(*, obra:ven_clientes_obras(*)), articulo:stk_articulos(*)')
    .in('fecha_programada', datesToSchedule);

  if (fetchAllError) throw fetchAllError;
  console.log("%c3. Viajes Cargados para el Rango:", "color: blue; font-weight: bold;", allViajes);

  const finalUpdatedViajes = [];
  const idsMaestrosAEliminar = [];

  for (const fecha of datesToSchedule) {
    console.log(`%c--- RECALCULANDO DISPONIBILIDAD PARA: ${fecha} ---`, 'color: green; font-size: 14px; font-weight: bold;');
    let equiposDisponibles = camiones.filter(c => disponibilidadCamiones[c.id] && c.chofer_asignado_id).map(c => ({ ...c, proximoHorarioDisponible: '00:00' }));
    let bombasDisponibles = bombas.filter(b => disponibilidadBombas[b.id]).map(b => ({ ...b, proximoHorarioDisponible: '00:00' }));
    
    let disponibilidadPlantas = plantas.reduce((acc, p) => {
      const puestos = p.puestos_de_carga ?? logisticaConfig.puestos_de_carga_default ?? 1;
      acc[p.id] = Array(puestos).fill('00:00');
      return acc;
    }, {});
    console.log(" -> Disponibilidad inicial de equipos:", { equipos: equiposDisponibles.length, bombas: bombasDisponibles.length, plantas: plantas.length });

    const viajesDelDia = allViajes.filter(v => v.fecha_programada === fecha);
    const viajesEnProgreso = viajesDelDia.filter(v => v.hora_inicio_carga_real);

    for (const viaje of viajesEnProgreso) {
      let proximoHorarioCamion;
      let proximoHorarioPlanta;
      proximoHorarioPlanta = viaje.hora_fin_carga_real || viaje.hora_fin_carga_teorica;

      if (viaje.hora_llegada_planta_real) {
        proximoHorarioCamion = addMinutes(viaje.hora_llegada_planta_real, logisticaConfig.tiempo_lavado ?? 0);
      } else {
        const tiempoViajeIda = timeToMinutes(viaje.hora_llegada_obra_teorica) - timeToMinutes(viaje.hora_salida_planta_teorica);
        const duracionDescarga = timeToMinutes(viaje.hora_fin_descarga_teorica) - timeToMinutes(viaje.hora_inicio_descarga_teorica);
        const tiempoViajeVuelta = timeToMinutes(viaje.hora_llegada_planta_teorica) - timeToMinutes(viaje.hora_fin_descarga_teorica);
        const tiempoTotalPostDescarga = tiempoViajeVuelta + (logisticaConfig.tiempo_lavado ?? 0);

        if (viaje.hora_fin_descarga_real) {
          proximoHorarioCamion = addMinutes(viaje.hora_fin_descarga_real, tiempoTotalPostDescarga);
        } else if (viaje.hora_inicio_descarga_real) {
          proximoHorarioCamion = addMinutes(viaje.hora_inicio_descarga_real, duracionDescarga + tiempoTotalPostDescarga);
        } else if (viaje.hora_llegada_obra_real) {
          proximoHorarioCamion = addMinutes(viaje.hora_llegada_obra_real, duracionDescarga + tiempoTotalPostDescarga);
        } else if (viaje.hora_salida_planta_real) {
          proximoHorarioCamion = addMinutes(viaje.hora_salida_planta_real, tiempoViajeIda + duracionDescarga + tiempoTotalPostDescarga);
        } else {
          proximoHorarioCamion = viaje.hora_llegada_planta_teorica;
        }
      }

      if (viaje.camion_id && proximoHorarioCamion) {
        const equipo = equiposDisponibles.find(e => e.id === viaje.camion_id);
        if (equipo && proximoHorarioCamion > equipo.proximoHorarioDisponible) equipo.proximoHorarioDisponible = proximoHorarioCamion;
      }
      if (viaje.planta_id && proximoHorarioPlanta && disponibilidadPlantas[viaje.planta_id]) {
        if (proximoHorarioPlanta > disponibilidadPlantas[viaje.planta_id][0])
          disponibilidadPlantas[viaje.planta_id][0] = proximoHorarioPlanta;
      }
    }

    let viajesAPlanificar = viajesDelDia.filter(v =>
      (v.estado === 'PENDIENTE' || v.estado === 'ASIGNADO' || v.estado === 'PENDIENTE_PLANIFICACION') &&
      !v.hora_inicio_carga_real
    );

    const viajesMaestros = viajesAPlanificar.filter(v => v.estado === 'PENDIENTE_PLANIFICACION');
    if (viajesMaestros.length > 0) {
      console.log(`%c4. Expandiendo ${viajesMaestros.length} pedidos maestros...`, "color: blue; font-weight: bold;");
      const nuevosViajesIndividuales = [];
      const camionesOrdenados = [...equiposDisponibles].sort((a, b) => (b.capacidad_m3 || 0) - (a.capacidad_m3 || 0));

      for (const viajeMaestro of viajesMaestros) {
        idsMaestrosAEliminar.push(viajeMaestro.id);
        let cantidadRestante = viajeMaestro.cantidad;
        let camionIndex = 0;
        while (cantidadRestante > 0) {
          const camionParaElViaje = camionesOrdenados[camionIndex % camionesOrdenados.length];
          const capacidadDelViaje = Math.min(cantidadRestante, camionParaElViaje.capacidad_m3 || 8);
          const { id, created_at, ...restoDelViaje } = viajeMaestro;
          nuevosViajesIndividuales.push({ ...restoDelViaje, cantidad: capacidadDelViaje, estado: 'PENDIENTE' });
          cantidadRestante -= capacidadDelViaje;
          camionIndex++;
        }
      }
      viajesAPlanificar = viajesAPlanificar.filter(v => v.estado !== 'PENDIENTE_PLANIFICACION').concat(nuevosViajesIndividuales);
    }

    if (viajesAPlanificar.length === 0) {
      console.log(" -> No hay viajes pendientes para planificar en esta fecha.");
      continue;
    }

    const viajesAgrupadosPorHora = viajesAPlanificar.reduce((acc, viaje) => {
      const hora = viaje.hora_programada;
      if (!acc[hora]) {
        acc[hora] = [];
      }
      acc[hora].push(viaje);
      return acc;
    }, {});

    const horasOrdenadas = Object.keys(viajesAgrupadosPorHora).sort((a, b) => a.localeCompare(b));
    console.log(`%c5. Planificando ${viajesAPlanificar.length} viajes en ${horasOrdenadas.length} franjas horarias...`, "color: blue; font-weight: bold;");

    const ultimoViajePorPedido = {};
    const disponibilidadObras = {}; // Nuevo: para controlar la cola de descarga en obra

    for (const hora of horasOrdenadas) {
      let viajesDeLaFranja = [...viajesAgrupadosPorHora[hora]].sort((a, b) => (a.id || 0) - (b.id || 0));
      console.log(`%c  -> Procesando Franja Horaria: ${hora} (${viajesDeLaFranja.length} viajes)`, 'color: #333; font-weight: bold;');
      
      let ultimoPedidoIdAsignado = null;
      const pedidosAdelantadosEnFranja = new Set();

      while (viajesDeLaFranja.length > 0) {
        let proximoViajeIndex = viajesDeLaFranja.findIndex(v => v.pedido_id !== ultimoPedidoIdAsignado);
        
        if (proximoViajeIndex === -1) {
          proximoViajeIndex = 0;
        }

        const viaje = viajesDeLaFranja.splice(proximoViajeIndex, 1)[0];
        ultimoPedidoIdAsignado = viaje.pedido_id;

        console.log(`%c    - Seleccionado Viaje ID: ${viaje.id || 'Nuevo'} (Pedido: ${viaje.pedido_id})`, 'color: #555;');

        let bombaAsignada = null;
        if (viaje.pedido.con_bomba) {
          bombasDisponibles.sort((a, b) => a.proximoHorarioDisponible.localeCompare(b.proximoHorarioDisponible));
          if (bombasDisponibles.length > 0) bombaAsignada = bombasDisponibles[0];
          else {
            console.error(`      - ¡No hay bombas disponibles para el pedido ${viaje.pedido.id}! Saltando.`);
            continue;
          }
        }

        const plantaOrigen = plantas.find(p => p.id === viaje.planta_id);
        if (!plantaOrigen) {
          console.warn(`      - No se encontró la planta con ID ${viaje.planta_id}. Saltando.`);
          continue;
        }
        
        const tiempoCargaFijo = plantaOrigen.tiempo_ciclo_fijo ?? logisticaConfig.tiempo_carga_fijo ?? 5;
        const ratioCargaM3 = plantaOrigen.ratio_ciclo_m3 ?? logisticaConfig.ratio_carga ?? 0;
        const duracionCargaTotal = tiempoCargaFijo + (viaje.cantidad * ratioCargaM3);

        console.groupCollapsed(`      Valores de Configuración para Viaje ID: ${viaje.id || 'Nuevo'}`);
        console.log(`        - Tiempo Carga Fijo: ${tiempoCargaFijo} min (Planta: ${plantaOrigen.tiempo_ciclo_fijo}, Default: ${logisticaConfig.tiempo_carga_fijo})`);
        console.log(`        - Ratio Carga m³: ${ratioCargaM3} min/m³ (Planta: ${plantaOrigen.ratio_ciclo_m3}, Default: ${logisticaConfig.ratio_carga})`);
        console.log(`        - Cantidad: ${viaje.cantidad} m³`);
        console.log(`        - Duración Carga Total Calculada: ${duracionCargaTotal} min`);
        console.groupEnd();

        const tiempoManiobraSalida = logisticaConfig.tiempo_maniobra_salida ?? 1;

        const obraDestino = viaje.pedido?.obra;
        const startCoords = { lat: plantaOrigen?.latitud, lon: plantaOrigen?.longitud };
        const endCoords = { lat: obraDestino?.latitud, lon: obraDestino?.longitud };

        const detallesIda = (startCoords.lat && endCoords.lat && !logisticaConfig.usar_tiempos_viaje_default) ? await getRouteDetails(startCoords, endCoords) : null;
        const detallesVuelta = (startCoords.lat && endCoords.lat && !logisticaConfig.usar_tiempos_viaje_default) ? await getRouteDetails(endCoords, startCoords) : null;

        const tiempoViajeIda = detallesIda?.duration ? Math.round(detallesIda.duration / 60) : logisticaConfig.tiempo_viaje_ida_default;
        const tiempoViajeVuelta = detallesVuelta?.duration ? Math.round(detallesVuelta.duration / 60) : logisticaConfig.tiempo_viaje_vuelta_default;

        let horaInicioCargaReal;
        let horaLlegadaObra;
        
        const viajeAnteriorDelPedido = ultimoViajePorPedido[viaje.pedido_id];

        if (viajeAnteriorDelPedido) {
          // Lógica para viajes subsecuentes: se encadenan por el intervalo en obra.
          console.log(`      - Viaje subsecuente. Basado en fin de descarga anterior: ${viajeAnteriorDelPedido.hora_fin_descarga_teorica}`);
          const intervalo = logisticaConfig.intervalo_entre_camiones ?? 0;
          horaLlegadaObra = addMinutes(viajeAnteriorDelPedido.hora_fin_descarga_teorica, intervalo);
          horaInicioCargaReal = subtractMinutes(horaLlegadaObra, tiempoViajeIda + tiempoManiobraSalida + duracionCargaTotal);
        } else {
          // Lógica para el primer viaje de un pedido
          const margenAnticipacion = logisticaConfig.margen_anticipacion_minutos ?? 15;
          const esPrimerViajeDelPedidoEnFranja = !pedidosAdelantadosEnFranja.has(viaje.pedido_id);

          if (logisticaConfig.programar_en_base_a === 'inicio_carga') {
            horaInicioCargaReal = viaje.hora_programada; // La anticipación no aplica bien a este modo
            horaLlegadaObra = addMinutes(horaInicioCargaReal, duracionCargaTotal + tiempoManiobraSalida + tiempoViajeIda); // Este será el objetivo
          } else { // 'llegada_obra'
            if (esPrimerViajeDelPedidoEnFranja && logisticaConfig.anticipar_primer_viaje) {
              horaLlegadaObra = subtractMinutes(viaje.hora_programada, margenAnticipacion);
              pedidosAdelantadosEnFranja.add(viaje.pedido_id);
              console.log(`      - Intentando anticipar primer viaje del pedido ${viaje.pedido_id} a las ${horaLlegadaObra}`);
            } else {
              horaLlegadaObra = viaje.hora_programada;
            }
            horaInicioCargaReal = subtractMinutes(horaLlegadaObra, tiempoViajeIda + tiempoManiobraSalida + duracionCargaTotal);
          }
        }
        console.log(`      - Tiempos iniciales propuestos: Inicio Carga ${horaInicioCargaReal}, Llegada Obra ${horaLlegadaObra}`);

        // *** LÓGICA DE ASIGNACIÓN INTELIGENTE REVISADA ***
        let mejorOpcion = null;
        // Iterar sobre todos los puestos de carga y todos los camiones para encontrar la mejor combinación
        // Primero, ordenar los equipos por disponibilidad para probar con los mejores primero.
        const equiposOrdenados = [...equiposDisponibles].sort((a, b) => a.proximoHorarioDisponible.localeCompare(b.proximoHorarioDisponible));

        for (const equipo of equiposOrdenados) {
          // Ordenar los puestos por disponibilidad para este equipo específico
          const puestosOrdenados = disponibilidadPlantas[plantaOrigen.id]
            .map((horario, index) => ({ horario, index }))
            .sort((a, b) => a.horario.localeCompare(b.horario));

          for (const puesto of puestosOrdenados) {
              // Calcular el inicio de carga más temprano posible considerando la planta y el camión
              let inicioCargaTentativo = horaInicioCargaReal;
              if (inicioCargaTentativo < puesto.horario) inicioCargaTentativo = puesto.horario;
              if (inicioCargaTentativo < equipo.proximoHorarioDisponible) inicioCargaTentativo = equipo.proximoHorarioDisponible;
  
              const llegadaObraTentativa = addMinutes(inicioCargaTentativo, duracionCargaTotal + tiempoManiobraSalida + tiempoViajeIda);
              
              // Evaluar qué tan buena es esta opción (menor retraso respecto al objetivo)
              const retraso = Math.max(0, timeToMinutes(llegadaObraTentativa) - timeToMinutes(horaLlegadaObra));
  
              if (!mejorOpcion || retraso < mejorOpcion.retraso) {
                mejorOpcion = {
                  retraso,
                  horaInicioCargaReal: inicioCargaTentativo,
                  horaLlegadaObra: llegadaObraTentativa,
                  equipoAsignado: equipo,
                  indicePuesto: puesto.index,
                };
              }
              // Si encontramos una opción sin retraso, es la óptima, no necesitamos seguir buscando.
              if (mejorOpcion && mejorOpcion.retraso === 0) break;
            }
            if (mejorOpcion && mejorOpcion.retraso === 0) break;
        }

        if (!mejorOpcion) {
            console.error(`      - ¡No se encontró ninguna combinación de recursos para este viaje! Saltando.`);
            continue;
        }

        // Aplicar la mejor opción encontrada
        horaInicioCargaReal = mejorOpcion.horaInicioCargaReal;
        horaLlegadaObra = mejorOpcion.horaLlegadaObra;
        const equipoAsignado = mejorOpcion.equipoAsignado;
        const indicePuesto = mejorOpcion.indicePuesto;

        const duracionDescarga = logisticaConfig.tiempo_descarga_fijo + (viaje.cantidad * logisticaConfig.ratio_descarga);
        const horaFinCarga = addMinutes(horaInicioCargaReal, duracionCargaTotal);
        const horaSalidaPlanta = addMinutes(horaFinCarga, tiempoManiobraSalida);
        
        // Lógica de cola en obra
        const proximaDescargaDisponibleObra = disponibilidadObras[obraDestino.id] || '00:00';
        const tiempoEsperaDescarga = logisticaConfig.tiempo_espera_descarga ?? 5;
        let horaInicioDescarga = addMinutes(horaLlegadaObra, tiempoEsperaDescarga);

        if (horaInicioDescarga < proximaDescargaDisponibleObra) {
            console.log(`      - Conflicto en Obra ${obraDestino.id}. Descarga disponible a las ${proximaDescargaDisponibleObra}.`);
            horaInicioDescarga = proximaDescargaDisponibleObra;
        }

        const horaFinDescarga = addMinutes(horaInicioDescarga, duracionDescarga);
        disponibilidadObras[obraDestino.id] = horaFinDescarga; // Actualizar disponibilidad de la obra

        console.log(`      - Tiempos finales calculados: Inicio Carga ${horaInicioCargaReal}, Llegada Obra ${horaLlegadaObra}`);

        disponibilidadPlantas[plantaOrigen.id][indicePuesto] = horaFinCarga;

        const horaLlegadaPlantaTeorica = addMinutes(horaFinDescarga, tiempoViajeVuelta);
        const proximoHorarioDisponibleCamion = addMinutes(horaLlegadaPlantaTeorica, logisticaConfig.tiempo_lavado ?? 0);
        console.log(`      - Camión ${equipoAsignado.patente} disponible a las ${proximoHorarioDisponibleCamion}. Puesto ${indicePuesto + 1} libre a las ${horaFinCarga}. Obra libre a las ${horaFinDescarga}.`);

        const viajeActualizado = {
          ...(viaje.id && { id: viaje.id }),
          pedido_id: viaje.pedido_id,
          articulo_id: viaje.articulo_id,
          cantidad: viaje.cantidad,
          fecha_programada: viaje.fecha_programada,
          hora_programada: viaje.hora_programada,
          estado: 'ASIGNADO', camion_id: equipoAsignado.id, chofer_id: equipoAsignado.chofer_asignado_id, bomba_id: bombaAsignada?.id || null,
          planta_id: plantaOrigen.id, hora_inicio_carga_teorica: horaInicioCargaReal,
          hora_fin_carga_teorica: horaFinCarga, hora_salida_planta_teorica: horaSalidaPlanta,
          hora_llegada_obra_teorica: horaLlegadaObra, hora_inicio_descarga_teorica: horaInicioDescarga,
          hora_fin_descarga_teorica: horaFinDescarga, hora_llegada_planta_teorica: horaLlegadaPlantaTeorica
        };
        finalUpdatedViajes.push(viajeActualizado);
        
        ultimoViajePorPedido[viaje.pedido_id] = viajeActualizado;
        equipoAsignado.proximoHorarioDisponible = proximoHorarioDisponibleCamion;

        if (bombaAsignada) {
          bombaAsignada.proximoHorarioDisponible = horaFinDescarga;
        }
      }
    }
  }

  console.log("%c6. Viajes con Tiempos Teóricos Actualizados:", "color: blue; font-weight: bold;", finalUpdatedViajes);
  if (idsMaestrosAEliminar.length > 0) {
    await supabase.from('log_viajes').delete().in('id', idsMaestrosAEliminar);
    console.log(" -> Viajes maestros eliminados de la BD.");
  }

  if (finalUpdatedViajes.length > 0) {
    const { error } = await supabase.from('log_viajes').upsert(finalUpdatedViajes, { onConflict: 'id' });
    if (error) throw error;
    console.log(" -> ¡Actualización en BD exitosa!");
  } else {
    console.log(" -> No se encontraron viajes para actualizar.");
  }

  return finalUpdatedViajes;
};
