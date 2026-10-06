# api/heuristicas.py
import logging
import datetime
import copy
from utils import time_to_minutes, minutes_to_time, get_tiempo_carga_for_planta, get_viaje_coords, get_viaje_tipo_obra_id
from estimadores import predict_travel_time, predict_descarga_time, features_for_prediction

def planificar_con_heuristica(viajes, camiones, plantas, config):
    """
    Planifica una lista de viajes usando una heurística de "primero el más urgente".
    Este enfoque simula la toma de decisiones de un despachador humano.
    """
    logging.info("Iniciando planificación con heurística de despachador...")

    # 1. Inicializar el estado de los recursos (camiones y puestos de carga en plantas)
    # Cada camión y puesto de carga tendrá un "tiempo_libre_min" que indica cuándo estará disponible.
    inicio_jornada_min = int(config.get('inicio_jornada_min', 7 * 60))
    
    estado_camiones = {
        c['id']: {'tiempo_libre_min': time_to_minutes(c.get('hora_disponible')) or inicio_jornada_min}
        for c in camiones
    }
    
    estado_plantas = {
        p['id']: [inicio_jornada_min] * p.get('puestos_de_carga', 1)
        for p in plantas
    }

    # 2. Ordenar los viajes por urgencia (hora programada)
    viajes_ordenados = sorted(viajes, key=lambda v: time_to_minutes(v.get('hora_programada', '23:59')))
    
    planificacion_final = []

    # 3. Procesar cada viaje en orden
    for viaje in viajes_ordenados:
        logging.info(f"--- Procesando viaje {viaje['id']} (Pedido {viaje['pedido_id']}) para las {viaje['hora_programada']} ---")
        
        # Encontrar el mejor camión y puesto de carga para este viaje
        mejor_opcion = None
        
        # Iterar sobre todos los camiones que pueden llevar la carga
        camiones_candidatos = [c for c in camiones if c['capacidad_m3'] >= viaje['cantidad']]
        if not camiones_candidatos:
            logging.warning(f"Viaje {viaje['id']}: No hay camiones con capacidad suficiente. Marcando como PENDIENTE.")
            viaje_actualizado = preparar_viaje_para_salida(viaje, None, {})
            planificacion_final.append(viaje_actualizado)
            continue

        for camion in camiones_candidatos:
            # Determinar cuándo el camión está libre y cuándo el puesto de carga está libre
            camion_libre_min = estado_camiones[camion['id']]['tiempo_libre_min']
            
            # Encontrar el puesto de carga en la planta requerida que se libere antes
            puestos_planta = estado_plantas[viaje['planta_id']]
            puestos_planta.sort() # Ordenar para encontrar el que se libera primero
            puesto_libre_min = puestos_planta[0]
            idx_puesto_elegido = 0

            # El inicio de la carga no puede ser antes de que tanto el camión como el puesto estén libres.
            # Y tampoco antes de la hora de inicio de la jornada.
            inicio_carga_posible = max(camion_libre_min, puesto_libre_min, inicio_jornada_min)
            
            # Calcular horarios basados en este inicio de carga
            horarios = calcular_horarios_viaje(viaje, inicio_carga_posible, plantas, config)

            # --- LÓGICA DE DECISIÓN MEJORADA ---
            # El objetivo es minimizar el retraso respecto a la hora programada.
            hora_programada_min = time_to_minutes(viaje.get('hora_programada', '08:00'))
            retraso_actual = max(0, horarios['llegada_obra'] - hora_programada_min)

            # La primera opción siempre se guarda.
            if mejor_opcion is None:
                mejor_opcion = {
                    'camion': camion, 'horarios': horarios, 'idx_puesto': idx_puesto_elegido, 'retraso': retraso_actual
                }
            # Las siguientes opciones se comparan por quién tiene el menor retraso.
            elif retraso_actual < mejor_opcion['retraso']:
                mejor_opcion = {
                    'camion': camion, 'horarios': horarios, 'idx_puesto': idx_puesto_elegido, 'retraso': retraso_actual
                }

        # 4. Asignar el viaje a la mejor opción encontrada y actualizar el estado de los recursos
        if mejor_opcion:
            camion_elegido = mejor_opcion['camion']
            horarios_finales = mejor_opcion['horarios']
            idx_puesto_usado = mejor_opcion['idx_puesto']
            
            logging.info(f"Viaje {viaje['id']} asignado a camión {camion_elegido['id']}. "
                         f"Inicio carga: {minutes_to_time(horarios_finales['inicio_carga'])}, "
                         f"Llegada obra: {minutes_to_time(horarios_finales['llegada_obra'])}")

            # Actualizar cuándo el camión y el puesto de carga estarán libres de nuevo
            estado_camiones[camion_elegido['id']]['tiempo_libre_min'] = horarios_finales['fin_ciclo_camion']
            estado_plantas[viaje['planta_id']][idx_puesto_usado] = horarios_finales['fin_carga']

            # Preparar el objeto de viaje para la respuesta
            viaje_actualizado = preparar_viaje_para_salida(viaje, camion_elegido['id'], horarios_finales)
            planificacion_final.append(viaje_actualizado)
        else:
            # Esto no debería pasar si hay camiones candidatos, pero es una salvaguarda
            logging.error(f"Viaje {viaje['id']}: No se encontró ninguna opción de planificación. Marcando como PENDIENTE.")
            viaje_actualizado = preparar_viaje_para_salida(viaje, None, {})
            planificacion_final.append(viaje_actualizado)

    return planificacion_final, 200

def calcular_horarios_viaje(viaje, inicio_carga_min, plantas, config):
    """Calcula la secuencia completa de horarios para un viaje dado un inicio de carga."""
    planta_viaje = next((p for p in plantas if p['id'] == viaje['planta_id']), None)
    
    # Tiempos de proceso
    duracion_carga = get_tiempo_carga_for_planta(viaje['planta_id'], viaje['cantidad'], plantas, config)
    tiempo_maniobra = int(config.get('tiempo_maniobra_salida', 3))
    tiempo_espera = int(config.get('tiempo_espera_descarga', 5))
    tiempo_lavado = int(config.get('tiempo_lavado', 7))

    # Tiempos estimados (viaje y descarga)
    hora_inicio_dt = datetime.datetime.now().replace(hour=inicio_carga_min // 60, minute=inicio_carga_min % 60)
    obra_lat, obra_lon = get_viaje_coords(viaje)
    features = features_for_prediction(
        planta_lat=planta_viaje.get('latitud') if planta_viaje else None,
        planta_lon=planta_viaje.get('longitud') if planta_viaje else None,
        obra_lat=obra_lat, obra_lon=obra_lon,
        hora_inicio_dt=hora_inicio_dt, volumen=viaje['cantidad'],
        tipo_obra_id=get_viaje_tipo_obra_id(viaje)
    )
    t_viaje_ida = predict_travel_time(features, config) or int(config.get('tiempo_viaje_ida_default', 45))
    t_viaje_vuelta = t_viaje_ida # Simplificación
    duracion_descarga = predict_descarga_time(features, config)

    # Secuencia de horarios
    inicio_carga = inicio_carga_min
    fin_carga = inicio_carga + duracion_carga
    salida_planta = fin_carga + tiempo_maniobra
    llegada_obra = salida_planta + t_viaje_ida
    inicio_descarga = llegada_obra + tiempo_espera
    fin_descarga = inicio_descarga + duracion_descarga
    llegada_planta = fin_descarga + t_viaje_vuelta
    fin_ciclo_camion = llegada_planta + tiempo_lavado

    return {
        'inicio_carga': inicio_carga, 'fin_carga': fin_carga, 'salida_planta': salida_planta,
        'llegada_obra': llegada_obra, 'inicio_descarga': inicio_descarga, 'fin_descarga': fin_descarga,
        'llegada_planta': llegada_planta, 'fin_ciclo_camion': fin_ciclo_camion
    }

def preparar_viaje_para_salida(viaje_original, camion_id, horarios):
    """Limpia el objeto de viaje y añade los nuevos datos de planificación."""
    viaje_limpio = copy.deepcopy(viaje_original)
    campos_a_eliminar = ['pedido', 'articulo', 'planta', 'camion', 'chofer', 'bomba', 'tiempo_viaje_ida', 'tiempo_viaje_vuelta']
    for campo in campos_a_eliminar:
        if campo in viaje_limpio:
            del viaje_limpio[campo]

    if isinstance(viaje_limpio.get('id'), str) and viaje_limpio['id'].startswith('temp_'):
        del viaje_limpio['id']

    viaje_actualizado = viaje_limpio
    viaje_actualizado.update({
        'camion_id': camion_id,
        'estado': 'ASIGNADO' if camion_id is not None else 'PENDIENTE',
        'hora_inicio_carga_teorica': minutes_to_time(horarios.get('inicio_carga')) if horarios else None,
        'hora_fin_carga_teorica': minutes_to_time(horarios.get('fin_carga')) if horarios else None,
        'hora_salida_planta_teorica': minutes_to_time(horarios.get('salida_planta')) if horarios else None,
        'hora_llegada_obra_teorica': minutes_to_time(horarios.get('llegada_obra')) if horarios else None,
        'hora_inicio_descarga_teorica': minutes_to_time(horarios.get('inicio_descarga')) if horarios else None,
        'hora_fin_descarga_teorica': minutes_to_time(horarios.get('fin_descarga')) if horarios else None,
        'hora_llegada_planta_teorica': minutes_to_time(horarios.get('llegada_planta')) if horarios else None,
    })
    return viaje_actualizado