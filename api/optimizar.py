# api/optimizar.py
from ortools.sat.python import cp_model
import logging
from collections import defaultdict
import datetime
import requests
import os
from utils import time_to_minutes, minutes_to_time, get_tiempo_carga_for_planta, get_viaje_coords, get_viaje_tipo_obra_id
from estimadores import features_for_prediction, predict_travel_time, predict_descarga_time, load_historical_data
def calculate_travel_times(viajes, plantas, config):
    """
    Estima los tiempos de viaje para una lista de viajes usando una estrategia de mejora progresiva:
    1. Intenta usar el modelo de Machine Learning si está disponible.
    2. Si no hay modelo (o falla), usa OpenRouteService (ORS) para una estimación basada en tráfico.
    3. Si ORS falla o no está configurado, usa un valor por defecto.
    """
    logging.info("*********************************************************")
    logging.info("*** INICIO: Estimación de Tiempos de Viaje ***")
    logging.info("*********************************************************")
    api_key = os.environ.get('VITE_ORS_API_KEY')

    # 1. Agrupar viajes por pedido_id para evitar cálculos duplicados
    pedidos_agrupados = defaultdict(list)
    for v in viajes:
        pedidos_agrupados[v['pedido_id']].append(v)

    # 2. Iterar sobre los pedidos únicos y calcular el tiempo de viaje una sola vez
    for pedido_id, viajes_del_pedido in pedidos_agrupados.items():
        # Usamos el primer viaje del grupo como representante para obtener los datos
        viaje_representante = viajes_del_pedido[0]
        planta = next((p for p in plantas if p['id'] == viaje_representante['planta_id']), None)
        obra_lat = viaje_representante.get('obra_lat')
        obra_lon = viaje_representante.get('obra_lon')
        metodo_usado = "Default" # Empezamos asumiendo el peor caso
        travel_time_min = None

        hora_programada_dt = datetime.datetime.strptime(
            f"{viaje_representante.get('fecha_programada', '2023-01-01')} {viaje_representante.get('hora_programada', '08:00')}",
            '%Y-%m-%d %H:%M:%S'
        )
        features = features_for_prediction(
            planta_lat=planta.get('latitud') if planta else None,
            planta_lon=planta.get('longitud') if planta else None,
            obra_lat=obra_lat, obra_lon=obra_lon,
            hora_inicio_dt=hora_programada_dt,
            volumen=viaje_representante['cantidad'],
            tipo_obra_id=get_viaje_tipo_obra_id(viaje_representante)
        )
        
        # Intento 1: Modelo ML
        travel_time_ml = predict_travel_time(features, config)
        if travel_time_ml is not None:
            metodo_usado = "Modelo ML"
            travel_time_min = travel_time_ml
        # Intento 2: ORS
        elif api_key and not config.get('usar_tiempos_viaje_default', False) and planta and planta.get('latitud') and obra_lat:
            try:
                body = {"coordinates": [[planta['longitud'], planta['latitud']], [obra_lon, obra_lat]]}
                headers = {'Authorization': api_key, 'Content-Type': 'application/json'}
                response = requests.post('https://api.openrouteservice.org/v2/directions/driving-car', json=body, headers=headers, timeout=10)
                response.raise_for_status()
                data = response.json()
                travel_time_min = int(round(data['routes'][0]['summary']['duration'] / 60))
                metodo_usado = "ORS"
            except requests.exceptions.RequestException:
                metodo_usado = "Default (fallback ORS)"

        # Intento 3: Default
        if travel_time_min is None:
            travel_time_min = int(config.get('tiempo_viaje_ida_default', 30))
            metodo_usado = "Default"

        logging.info(f"*** TIEMPO DE VIAJE CALCULADO para Pedido {pedido_id}: {travel_time_min} min (Método: {metodo_usado}) ***")

        # 3. Asignar el tiempo calculado a todos los viajes de este pedido
        for viaje_a_actualizar in viajes_del_pedido:
            viaje_a_actualizar['tiempo_viaje_ida'] = travel_time_min
            viaje_a_actualizar['tiempo_viaje_vuelta'] = travel_time_min

    logging.info("*********************************************************")
    logging.info("*** FIN: Estimación de Tiempos de Viaje ***")
    logging.info("*********************************************************")

def run_optimization(problem_data):
    """
    Función principal que contiene toda la lógica de optimización con OR-Tools.
    """
    logging.warning("*********************************************************")
    logging.warning("*** INICIANDO NUEVO MOTOR DE OPTIMIZACIÓN v3 (PUNTUALIDAD) ***")
    logging.warning("*********************************************************")

    viajes_maestros_full = problem_data.get('viajes', [])
    camiones = problem_data.get('camiones', [])
    plantas = problem_data.get('plantas', [])
    config = problem_data.get('config', {})
    logging.info(f"DEBUG: Configuración recibida por el optimizador: {config}")
    
    # --- NUEVO: Cargar datos históricos en cada ejecución ---
    # Esto permite que el fallback de "vecinos más cercanos" funcione con datos actualizados
    # sin necesidad de reiniciar el servidor.
    viajes_historico = problem_data.get('viajes_historico', [])
    load_historical_data(viajes_historico)

    # --- DIAGNÓSTICO: Imprimir la flota disponible ---
    logging.info("---------------------------------------------------------")
    logging.info("FLOTA DISPONIBLE PARA OPTIMIZACIÓN:")
    for c in camiones:
        chofer_nombre = c.get('chofer_asignado_nombre', 'Sin chofer')
        logging.info(f"  - Camión ID {c['id']} ({c['patente']}): Capacidad {c['capacidad_m3']}m³, Chofer: {chofer_nombre}, Disponible desde: {c.get('hora_disponible', '00:00')}")
    logging.info("---------------------------------------------------------")

    # --- CORRECCIÓN: Calcular todos los tiempos de viaje ANTES de empezar ---
    # Esto asegura que los tiempos de viaje (por GPS o default) se calculen una sola vez
    # y estén disponibles para todo el proceso de optimización.
    calculate_travel_times(viajes_maestros_full, plantas, config)
    # --- NUEVA LÓGICA RADICAL: NO SE DIVIDEN LOS VIAJES ---
    # El optimizador ahora trabajará con los pedidos "maestros" y decidirá cómo dividirlos.
    pedidos = {}
    for v in viajes_maestros_full:
        pid = v['pedido_id']
        if pid not in pedidos:
            pedidos[pid] = {'info': v, 'cantidad_total': 0}
        pedidos[pid]['cantidad_total'] += v['cantidad']

    if not pedidos:
        return [], 200

    # --- Modelo OR-Tools ---
    model = cp_model.CpModel()
    horizonte_tiempo = 24 * 60 # Minutos en un día
    inicio_jornada_min = time_to_minutes(config.get('inicio_jornada', '07:00'))

    # --- 1. CREAR VARIABLES PARA CADA POSIBLE VIAJE ---
    # Para cada pedido, creamos un número máximo de "slots" de viaje posibles.
    # Por ejemplo, un pedido de 18m3 con camiones de 9m3 podría necesitar 2 viajes, pero creamos 3 o 4 por si se usan camiones más chicos.
    max_viajes_por_pedido = int(config.get('max_viajes_por_pedido', 5))
    asignaciones = {} # { (pedido_id, viaje_idx): {vars...} }

    for pid, data_pedido in pedidos.items():
        viaje_base = data_pedido['info']

        for i in range(max_viajes_por_pedido):
            viaje_id = f"{pid}_{i}"
            
            # Variables de decisión principales para cada "slot" de viaje
            viaje_se_usa = model.NewBoolVar(f"viaje_se_usa_{viaje_id}")
            camion_asignado = model.NewIntVar(0, len(camiones) - 1, f"camion_asignado_{viaje_id}")
            cantidad_transportada = model.NewIntVar(0, 100, f"cantidad_{viaje_id}") # Cantidad en m3 * 10 para manejar decimales

            # Variables de tiempo
            inicio_carga = model.NewIntVar(0, horizonte_tiempo, f"inicio_carga_{viaje_id}")
            # >>> CORRECCIÓN: Añadir restricción de inicio de jornada
            model.Add(inicio_carga >= inicio_jornada_min).OnlyEnforceIf(viaje_se_usa)

            fin_carga = model.NewIntVar(0, horizonte_tiempo, f"fin_carga_{viaje_id}")
            salida_planta = model.NewIntVar(0, horizonte_tiempo, f"salida_planta_{viaje_id}")
            llegada_obra = model.NewIntVar(0, horizonte_tiempo, f"llegada_obra_{viaje_id}")
            inicio_descarga = model.NewIntVar(0, horizonte_tiempo, f"inicio_descarga_{viaje_id}")
            fin_descarga = model.NewIntVar(0, horizonte_tiempo, f"fin_descarga_{viaje_id}")
            llegada_planta = model.NewIntVar(0, horizonte_tiempo, f"llegada_planta_{viaje_id}")

            # --- ¡NUEVA LÓGICA CLAVE! FIJAR TIEMPOS REALES ---
            # Si el viaje base ya tiene tiempos reales, los usamos como restricciones fijas.
            tiempos_reales = {
                'hora_inicio_carga_real': inicio_carga, 'hora_fin_carga_real': fin_carga,
                'hora_salida_planta_real': salida_planta, 'hora_llegada_obra_real': llegada_obra,
                'hora_inicio_descarga_real': inicio_descarga, 'hora_fin_descarga_real': fin_descarga,
                'hora_llegada_planta_real': llegada_planta
            }
            for campo_real, var_tiempo in tiempos_reales.items():
                if viaje_base.get(campo_real):
                    tiempo_min = time_to_minutes(viaje_base[campo_real])
                    model.Add(var_tiempo == tiempo_min)
                    logging.info(f"DEBUG: Viaje {viaje_id} - TIEMPO REAL FIJADO: {campo_real} a {viaje_base[campo_real]} ({tiempo_min} min)")

            # Guardamos las variables
            asignaciones[(pid, i)] = {
                "viaje_se_usa": viaje_se_usa, "camion_asignado": camion_asignado,
                "cantidad_transportada": cantidad_transportada, "inicio_carga": inicio_carga,
                "fin_carga": fin_carga, "salida_planta": salida_planta, "llegada_obra": llegada_obra, "inicio_descarga": inicio_descarga, "fin_descarga": fin_descarga,
                "llegada_planta": llegada_planta, "viaje_base": viaje_base
            }

            # --- PATCH: Guardar las variables de duración en el diccionario de asignaciones ---
            asignaciones[(pid, i)]['duracion_carga'] = model.NewIntVar(0, horizonte_tiempo, f"dur_carga_{viaje_id}")
            asignaciones[(pid, i)]['duracion_descarga'] = model.NewIntVar(0, horizonte_tiempo, f"dur_descarga_{viaje_id}")

            # --- RESTRICCIONES POR VIAJE ---
            # Si el viaje no se usa, su cantidad es 0.
            model.Add(cantidad_transportada == 0).OnlyEnforceIf(viaje_se_usa.Not())
            model.Add(cantidad_transportada > 0).OnlyEnforceIf(viaje_se_usa)

            # --- NUEVA RESTRICCIÓN: Forzar cantidades a ser múltiplos de 0.5 m³ ---
            # Esto evita decimales extraños como 6.1 m³. La cantidad está en décimas, así que 5 = 0.5 m³.
            # --- CORRECCIÓN FINAL: Reificar la restricción de módulo ---
            # La función AddModuloEquality no soporta .OnlyEnforceIf directamente.
            # Creamos una variable para el resto de la división y luego condicionamos
            # que ese resto sea 0 si el viaje se usa.
            remainder_var = model.NewIntVar(0, 4, f"remainder_cantidad_{viaje_id}") # El resto de dividir por 5 estará entre 0 y 4
            # Esta restricción es incondicional: remainder_var siempre será el resto de cantidad_transportada / 5
            model.AddModuloEquality(remainder_var, cantidad_transportada, 5)
            # Esta restricción es condicional: si el viaje se usa, el resto debe ser 0 (es decir, es múltiplo de 5)
            model.Add(remainder_var == 0).OnlyEnforceIf(viaje_se_usa)

            logging.debug(f"DEBUG: Creando restricciones de capacidad para viaje {viaje_id}")
            # La cantidad transportada no puede superar la capacidad del camión asignado.
            for j, c in enumerate(camiones):
                # --- PATCH: Reificar la condición 'camion_asignado == j' en un BoolVar ---
                # La expresión 'camion_asignado == j' no es un BoolVar directamente.
                # Creamos un BoolVar auxiliar y lo vinculamos a la condición.
                camion_is_assigned_to_j = model.NewBoolVar(f"camion_assigned_to_{j}_for_{viaje_id}")
                model.Add(camion_asignado == j).OnlyEnforceIf(camion_is_assigned_to_j)
                model.Add(camion_asignado != j).OnlyEnforceIf(camion_is_assigned_to_j.Not()) # La negación también es importante
                
                model.Add(cantidad_transportada <= int(c['capacidad_m3'] * 10)).OnlyEnforceIf(camion_is_assigned_to_j)
                
                # >>> CORRECCIÓN: Añadir restricción de hora disponible del camión
                hora_disponible_min = time_to_minutes(c.get('hora_disponible', '00:00'))
                if hora_disponible_min > 0:
                    model.Add(inicio_carga >= hora_disponible_min).OnlyEnforceIf(camion_is_assigned_to_j)

            # --- CORRECCIÓN DEFINITIVA: La duración DEBE depender de la cantidad transportada ---
            # Usamos variables escaladas para modelar la relación lineal: duracion = fijo + ratio * cantidad
            ratio_carga_min_m3 = float(config.get('ratio_carga', 1.0))
            ratio_descarga_min_m3 = float(config.get('ratio_descarga', 2.0))

            # Duración de carga = fijo + (cantidad * 100 * ratio) / 1000
            # Multiplicamos por 100 y dividimos por 1000 para mantener la precisión con enteros
            duracion_carga_variable = model.NewIntVar(0, horizonte_tiempo, f"dur_carga_var_{viaje_id}")
            cantidad_x_ratio_carga = model.NewIntVar(0, 100 * int(ratio_carga_min_m3 * 100), f"cant_x_ratio_carga_{viaje_id}")
            model.AddMultiplicationEquality(cantidad_x_ratio_carga, [cantidad_transportada, int(ratio_carga_min_m3 * 100)])
            model.AddDivisionEquality(duracion_carga_variable, cantidad_x_ratio_carga, 1000)
            model.Add(asignaciones[(pid, i)]['duracion_carga'] == duracion_carga_variable + int(config.get('tiempo_carga_fijo', 7)))

            duracion_descarga_variable = model.NewIntVar(0, horizonte_tiempo, f"dur_descarga_var_{viaje_id}")
            cantidad_x_ratio_descarga = model.NewIntVar(0, 100 * int(ratio_descarga_min_m3 * 100), f"cant_x_ratio_descarga_{viaje_id}")
            model.AddMultiplicationEquality(cantidad_x_ratio_descarga, [cantidad_transportada, int(ratio_descarga_min_m3 * 100)])
            model.AddDivisionEquality(duracion_descarga_variable, cantidad_x_ratio_descarga, 1000)
            model.Add(asignaciones[(pid, i)]['duracion_descarga'] == duracion_descarga_variable + int(config.get('tiempo_descarga_fijo', 15)))
            
            # Secuencia de tiempos
            model.Add(fin_carga == inicio_carga + asignaciones[(pid, i)]['duracion_carga']).OnlyEnforceIf(viaje_se_usa)
            model.Add(salida_planta == fin_carga + int(config.get('tiempo_maniobra_salida', 3))).OnlyEnforceIf(viaje_se_usa)
            model.Add(llegada_obra == salida_planta + int(viaje_base['tiempo_viaje_ida'])).OnlyEnforceIf(viaje_se_usa)
            model.Add(inicio_descarga == llegada_obra + int(config.get('tiempo_espera_descarga', 5))).OnlyEnforceIf(viaje_se_usa)
            model.Add(fin_descarga == inicio_descarga + asignaciones[(pid, i)]['duracion_descarga']).OnlyEnforceIf(viaje_se_usa)
            model.Add(llegada_planta == fin_descarga + int(viaje_base['tiempo_viaje_vuelta'])).OnlyEnforceIf(viaje_se_usa)

    # --- 2. RESTRICCIONES GLOBALES ---
    logging.info("DEBUG: Variables y restricciones por viaje creadas.")
    
    # --- RESTRICCIÓN DE HORA PROGRAMADA (ANTICIPACIÓN Y RETRASO) ---
    # Esta es una restricción CLAVE para la puntualidad.
    margen_anticipacion_minutos = int(config.get('margen_anticipacion_minutos', 15))
    margen_retraso_permitido_min = int(config.get('margen_retraso_permitido_min', 5)) # Nuevo!
    anticipar_primer_viaje = config.get('anticipar_primer_viaje', False)

    # --- RESTRICCIÓN DE CANTIDAD TOTAL Y CONTINUIDAD ---
    max_continuity_gap = int(config.get('tiempo_max_continuidad_obra', 45))

    # --- INICIALIZACIÓN DE LA LISTA DE PENALIZACIONES ---
    penalizaciones = []

    # Itera sobre cada pedido para aplicar las restricciones correspondientes
    for pid, data_pedido in pedidos.items():
        viajes_del_pedido = [asignaciones[(pid, i)] for i in range(max_viajes_por_pedido)]
        # --- LÓGICA PARA EL ÚLTIMO VIAJE INCOMPLETO ---
        # Identificamos el último viaje y el viaje con la menor cantidad
        tiempos_inicio_carga = [v['inicio_carga'] for v in viajes_del_pedido]
        cantidades_viajes = [v['cantidad_transportada'] for v in viajes_del_pedido]

        model.Add(sum(v['cantidad_transportada'] for v in viajes_del_pedido) == int(data_pedido['cantidad_total'] * 10))

        # --- NUEVA RESTRICCIÓN: Evitar descargas simultáneas en la misma obra si no está permitido ---
        # Leemos la configuración del pedido. Si no existe, asumimos que NO se permite por seguridad.
        permite_descarga_simultanea = data_pedido['info'].get('pedido', {}).get('descarga_en_simultaneo', False) or data_pedido['info'].get('descarga_en_simultaneo', False)
        logging.info(f"DEBUG: Pedido {pid} - Permite descarga simultánea: {permite_descarga_simultanea}")

        if not permite_descarga_simultanea:
            intervalos_descarga_pedido = []
            for v in viajes_del_pedido:
                intervalo_descarga = model.NewOptionalIntervalVar(
                    start=v['inicio_descarga'],
                    size=v['duracion_descarga'],
                    end=v['fin_descarga'],
                    is_present=v['viaje_se_usa'],
                    name=f"intervalo_descarga_pedido_{pid}_viaje_{v['viaje_base']['id']}"
                )
                intervalos_descarga_pedido.append(intervalo_descarga)
            
            # Si hay más de un posible intervalo, aplicamos la restricción de no superposición.
            if len(intervalos_descarga_pedido) > 1:
                model.AddNoOverlap(intervalos_descarga_pedido)
                logging.info(f"DEBUG: Restricción de NO DESCARGA SIMULTÁNEA activada para pedido {pid}.")

        # --- NUEVA RESTRICCIÓN: Continuidad del servicio en obra ---
        # --- CORRECCIÓN CRÍTICA: Forzar un orden secuencial en los slots de viaje ---
        # En lugar de ordenar por una variable (lo que causa dependencias circulares),
        # forzamos que el inicio de carga del slot i+1 sea siempre >= al del slot i.
        # Esto establece una secuencia clara para aplicar la continuidad.
        viajes_ordenados = viajes_del_pedido # Ya están ordenados por su índice (0, 1, 2...)

        # --- CORRECCIÓN CRÍTICA: Forzar el uso consecutivo de los slots de viaje ---
        # Si el slot 'i' no se usa, entonces el slot 'i+1' tampoco puede usarse.
        for i in range(len(viajes_ordenados) - 1):
            model.AddImplication(viajes_ordenados[i]['viaje_se_usa'].Not(), viajes_ordenados[i+1]['viaje_se_usa'].Not())

        # Aplicamos la restricción de continuidad entre viajes consecutivos.
        for i in range(len(viajes_ordenados) - 1):
            viaje_actual = viajes_ordenados[i]
            viaje_siguiente = viajes_ordenados[i+1]

            # La restricción solo se aplica si ambos viajes se usan.
            ambos_viajes_se_usan = model.NewBoolVar(f"ambos_usados_{pid}_{i}")
            model.AddBoolAnd([viaje_actual['viaje_se_usa'], viaje_siguiente['viaje_se_usa']]).OnlyEnforceIf(ambos_viajes_se_usan)
            model.AddBoolOr([viaje_actual['viaje_se_usa'].Not(), viaje_siguiente['viaje_se_usa'].Not()]).OnlyEnforceIf(ambos_viajes_se_usan.Not())

            # --- CORRECCIÓN DEFINITIVA PARA CONTINUIDAD ---
            # 1. Forzar un orden secuencial estricto para los slots de viaje.
            # El siguiente viaje no puede empezar a cargar hasta que el actual haya terminado.
            model.Add(viaje_siguiente['inicio_carga'] >= viaje_actual['fin_carga']).OnlyEnforceIf(ambos_viajes_se_usan)

            # 2. Calcular el gap entre descargas usando el valor absoluto para evitar problemas de orden.
            gap_entre_descargas_signed = model.NewIntVar(-horizonte_tiempo, horizonte_tiempo, f"gap_signed_{pid}_{i}")
            model.Add(gap_entre_descargas_signed == viaje_siguiente['inicio_descarga'] - viaje_actual['fin_descarga']).OnlyEnforceIf(ambos_viajes_se_usan)
            
            tiempo_espera_obra = model.NewIntVar(0, horizonte_tiempo, f"gap_abs_{pid}_{i}")
            model.AddAbsEquality(tiempo_espera_obra, gap_entre_descargas_signed)
            model.Add(tiempo_espera_obra == 0).OnlyEnforceIf(ambos_viajes_se_usan.Not()) # Si no se usan ambos, el gap es 0.

            # Calculamos el exceso sobre el gap permitido.
            exceso_continuidad = model.NewIntVar(0, horizonte_tiempo, f"exceso_continuidad_{pid}_{i}")
            # exceso = max(0, tiempo_espera - gap_permitido)
            model.Add(exceso_continuidad >= tiempo_espera_obra - max_continuity_gap)
            model.Add(exceso_continuidad >= 0)

            # Penalización ASTRONÓMICA por superar el máximo.
            peso_continuidad = int(config.get('peso_continuidad_obra', 10000)) # Peso ASTRONÓMICO para que sea la máxima prioridad
            penalizacion_continuidad = model.NewIntVar(0, horizonte_tiempo * peso_continuidad, f"penal_continuidad_{pid}_{i}")
            model.AddMultiplicationEquality(penalizacion_continuidad, [exceso_continuidad, peso_continuidad])
            penalizaciones.append(penalizacion_continuidad)

            # --- NUEVA PENALIZACIÓN: Incentivar el gap ideal ---
            # Penalizamos cada minuto de espera con un peso menor para que el optimizador
            # intente juntar los viajes lo más posible.
            peso_gap_ideal = int(config.get('peso_gap_ideal', 20))
            penalizacion_gap_ideal = model.NewIntVar(0, horizonte_tiempo * peso_gap_ideal, f"penal_gap_ideal_{pid}_{i}")
            model.AddMultiplicationEquality(penalizacion_gap_ideal, [tiempo_espera_obra, peso_gap_ideal])
            penalizaciones.append(penalizacion_gap_ideal)

        logging.info(f"DEBUG: Restricción de CONTINUIDAD (gap max {max_continuity_gap} min) activada para pedido {pid}.")
        # --- NUEVO LOG ---
        logging.info(f"DEBUG: Penalización por TIEMPO DE ESPERA EN OBRA activada para pedido {pid}.")


    logging.info("DEBUG: Restricción de cantidad total por pedido creada.")

    # Un camión no puede hacer dos viajes al mismo tiempo (No Overlap)
    for j, _ in enumerate(camiones):
        intervalos_camion = []
        for (pid, i), data_viaje in asignaciones.items():
            viaje_se_usa = data_viaje['viaje_se_usa']
            es_de_este_camion = model.NewBoolVar(f"es_de_camion_{j}_viaje_{pid}_{i}") # No se usa guion bajo al final
            model.Add(data_viaje['camion_asignado'] == j).OnlyEnforceIf(es_de_este_camion)
            model.Add(data_viaje['camion_asignado'] != j).OnlyEnforceIf(es_de_este_camion.Not())
            
            presente = model.NewBoolVar(f"presente_camion_{j}_viaje_{pid}_{i}")
            model.AddBoolAnd([viaje_se_usa, es_de_este_camion]).OnlyEnforceIf(presente)
            model.AddBoolOr([viaje_se_usa.Not(), es_de_este_camion.Not()]).OnlyEnforceIf(presente.Not())

            # La duración del ciclo es desde el inicio de carga hasta que el camión vuelve a la planta y está listo (lavado).
            # --- CORRECCIÓN: La duración (size) debe ser una IntVar explícita ---
            duracion_ciclo_viaje_var = model.NewIntVar(0, horizonte_tiempo, f"dur_ciclo_camion_{j}_viaje_{pid}_{i}")
            fin_ciclo_real = data_viaje['llegada_planta'] + int(config.get('tiempo_lavado', 7))
            model.Add(duracion_ciclo_viaje_var == fin_ciclo_real - data_viaje['inicio_carga'])
            
            intervalo_op = model.NewOptionalIntervalVar(
                start=data_viaje['inicio_carga'],
                size=duracion_ciclo_viaje_var, # Usamos la nueva IntVar
                end=data_viaje['llegada_planta'] + int(config.get('tiempo_lavado', 7)),
                is_present=presente,
                name=f"intervalo_camion_{j}_viaje_{pid}_{i}"
            )
            intervalos_camion.append(intervalo_op)
        model.AddNoOverlap(intervalos_camion)

    logging.info("DEBUG: Restricciones de No Overlap para camiones creadas.")

    # Restricción de capacidad de las plantas (Cumulative)
    for p in plantas:
        capacidad_planta = p.get('puestos_de_carga', 1)
        intervalos_planta = []
        for (pid, i), data_viaje in asignaciones.items():
            if data_viaje['viaje_base']['planta_id'] == p['id']:
                # --- CORRECCIÓN DEFINITIVA: Usar NewOptionalIntervalVar ---
                # El intervalo de carga en la planta solo debe existir si el viaje se usa.
                # Usar NewIntervalVar creaba intervalos fantasmas que saturaban la capacidad de la planta.
                intervalo_opcional_planta = model.NewOptionalIntervalVar(
                    start=data_viaje['inicio_carga'],
                    size=data_viaje['duracion_carga'],
                    end=data_viaje['fin_carga'],
                    is_present=data_viaje['viaje_se_usa'],
                    name=f"intervalo_op_planta_{p['id']}_viaje_{pid}_{i}"
                )
                intervalos_planta.append(intervalo_opcional_planta)
        if intervalos_planta:
            # La demanda de cada intervalo es 1 (si se usa) o 0 (si no se usa).
            demandas = [v['viaje_se_usa'] for (pid, i), v in asignaciones.items() if v['viaje_base']['planta_id'] == p['id']]
            model.AddCumulative(intervalos_planta, demandas, capacidad_planta)

    logging.info("DEBUG: Restricciones de capacidad de plantas creadas.")
    # --- 3. OBJETIVO: MINIMIZAR PENALIZACIONES ---
    # La lista de penalizaciones ya fue inicializada antes del bucle de pedidos.

    # Penalización por retraso (la más importante)
    # >>> CORRECCIÓN: Usar la variable de tiempo objetivo del primer viaje para la penalización
    for pid, data_pedido in pedidos.items():
        hora_programada_min = time_to_minutes(data_pedido['info'].get('hora_programada', '08:00'))
        programar_en_base_a = config.get('programar_en_base_a', 'llegada_obra')

        # Reutilizar la variable min_first_trip_time ya creada para la restricción
        min_first_trip_time = model.NewIntVar(0, horizonte_tiempo, f"min_first_trip_time_{pid}")
        
        # --- CORRECCIÓN CRÍTICA: Vincular min_first_trip_time con los viajes reales ---
        # Esta variable debe ser el mínimo de los tiempos de llegada/inicio de los viajes que se usan.
        conditional_first_trip_times = []
        viajes_del_pedido = [asignaciones[(pid, i)] for i in range(max_viajes_por_pedido)]
        for v in viajes_del_pedido:
            conditional_time_for_min = model.NewIntVar(0, horizonte_tiempo * 2, f"conditional_min_time_penalty_{pid}_{v['viaje_base']['id']}")
            # El tiempo a considerar depende de la configuración 'programar_en_base_a'
            tiempo_relevante = v['llegada_obra'] if programar_en_base_a == 'llegada_obra' else v['inicio_carga']
            
            # Si el viaje se usa, el tiempo condicional es el tiempo relevante. Si no, es un valor muy alto para que no sea elegido como mínimo.
            model.Add(conditional_time_for_min == tiempo_relevante).OnlyEnforceIf(v['viaje_se_usa'])
            model.Add(conditional_time_for_min == horizonte_tiempo * 2).OnlyEnforceIf(v['viaje_se_usa'].Not())
            conditional_first_trip_times.append(conditional_time_for_min)
        model.AddMinEquality(min_first_trip_time, conditional_first_trip_times)

        # --- NUEVA LÓGICA DE PENALIZACIÓN: Castigar la desviación (adelanto y retraso) ---
        # En lugar de solo penalizar el retraso (>= 0), ahora penalizamos el valor absoluto
        # de la diferencia entre la hora objetivo y la hora real.
        
        # 1. Calcular la desviación (puede ser negativa si es un adelanto)
        desviacion = model.NewIntVar(-horizonte_tiempo, horizonte_tiempo, f"desviacion_{pid}")
        model.Add(desviacion == min_first_trip_time - hora_programada_min)

        # --- REVERSIÓN A REGLA DURA: La puntualidad es una restricción inquebrantable ---
        margen_anticipacion_minutos = int(config.get('margen_anticipacion_minutos', 15))
        margen_retraso_permitido_min = int(config.get('margen_retraso_permitido_min', 5))
        
        # El primer viaje no puede llegar antes del margen de anticipación.
        model.Add(min_first_trip_time >= hora_programada_min - margen_anticipacion_minutos)
        # El primer viaje no puede llegar después del margen de retraso.
        model.Add(min_first_trip_time <= hora_programada_min + margen_retraso_permitido_min)

        # Aunque es una regla dura, mantenemos una pequeña penalización por cualquier desviación
        # dentro del margen permitido, para que el optimizador intente ser lo más exacto posible.
        desviacion_abs = model.NewIntVar(0, margen_anticipacion_minutos + margen_retraso_permitido_min, f"desviacion_abs_{pid}")
        model.AddAbsEquality(desviacion_abs, desviacion)
        penalizaciones.append(desviacion_abs * int(config.get('peso_reprogramacion', 100)))

    logging.info("DEBUG: Penalizaciones por retraso creadas.")

    # Penalización por makespan (terminar lo más pronto posible)
    makespan = model.NewIntVar(0, horizonte_tiempo, 'makespan')
    llegadas_finales = []
    for v in asignaciones.values():
        llegada_condicional = model.NewIntVar(0, horizonte_tiempo, f"llegada_final_cond_{v['viaje_base']['id']}")
        model.Add(llegada_condicional == v['llegada_planta']).OnlyEnforceIf(v['viaje_se_usa'])
        model.Add(llegada_condicional == 0).OnlyEnforceIf(v['viaje_se_usa'].Not()) # Si no se usa, no contribuye al makespan
        llegadas_finales.append(llegada_condicional)

    if llegadas_finales:
        model.AddMaxEquality(makespan, llegadas_finales)
        # --- PATCH: crear var auxiliar para penalización por makespan ---
        peso_makespan = int(config.get('peso_makespan', 1)) # Peso MUY bajo, es solo para desempate
        penal_makespan = model.NewIntVar(0, horizonte_tiempo * peso_makespan, 'penal_makespan')
        # Relacionar makespan con su penalización (lineal por constante)
        model.Add(penal_makespan == makespan * peso_makespan)
        penalizaciones.append(penal_makespan)

    logging.info("DEBUG: Penalización por makespan creada.")

    # --- OBJETIVO RE-ACTIVADO: Penalizar el número de viajes ---
    # Para combatir la fragmentación en viajes pequeños, volvemos a penalizar cada viaje que se usa.
    total_viajes_usados = model.NewIntVar(0, len(asignaciones), 'total_viajes')
    model.Add(total_viajes_usados == sum(v['viaje_se_usa'] for v in asignaciones.values()))
    peso_costo_viaje = int(config.get('peso_costo_viaje', 500)) # Un peso significativo para desincentivar viajes extra.
    penal_viajes = model.NewIntVar(0, len(asignaciones) * peso_costo_viaje, 'penal_viajes')
    model.AddMultiplicationEquality(penal_viajes, [total_viajes_usados, peso_costo_viaje])
    penalizaciones.append(penal_viajes)
    logging.info(f"DEBUG: Penalización por número de viajes ACTIVADA con peso {peso_costo_viaje}.")
    
    # --- NUEVA LÓGICA DE EFICIENCIA: Penalizar la capacidad ociosa en todos los viajes EXCEPTO el último de cada pedido ---
    capacidad_ociosa_total = []
    for pid, data_pedido in pedidos.items():
        viajes_del_pedido = [asignaciones[(pid, i)] for i in range(max_viajes_por_pedido)]

        # 1. Encontrar la hora de inicio del último viaje de este pedido
        max_inicio_carga = model.NewIntVar(0, horizonte_tiempo, f"max_inicio_carga_eficiencia_{pid}")
        inicios_usados = []
        for v in viajes_del_pedido:
            inicio_cond = model.NewIntVar(0, horizonte_tiempo, f"inicio_cond_eficiencia_{pid}_{v['viaje_base']['id']}")
            model.Add(inicio_cond == v['inicio_carga']).OnlyEnforceIf(v['viaje_se_usa'])
            model.Add(inicio_cond == 0).OnlyEnforceIf(v['viaje_se_usa'].Not()) # Si no se usa, su inicio es 0
            inicios_usados.append(inicio_cond)
        model.AddMaxEquality(max_inicio_carga, inicios_usados)

        # 2. Calcular y penalizar la capacidad ociosa para cada viaje que NO sea el último
        for v in viajes_del_pedido:
            # Capacidad del camión asignado
            capacidad_camion = model.NewIntVar(0, 100, f"cap_camion_eficiencia_{pid}_{v['viaje_base']['id']}")
            model.AddElement(v['camion_asignado'], [int(c['capacidad_m3'] * 10) for c in camiones], capacidad_camion)

            # Capacidad ociosa del viaje
            cap_ociosa_viaje = model.NewIntVar(0, 100, f"cap_ociosa_eficiencia_{pid}_{v['viaje_base']['id']}")
            model.Add(cap_ociosa_viaje == capacidad_camion - v['cantidad_transportada'])

            # Variable booleana: ¿es este el último viaje?
            es_ultimo_viaje = model.NewBoolVar(f"es_ultimo_viaje_{pid}_{v['viaje_base']['id']}")
            model.Add(v['inicio_carga'] == max_inicio_carga).OnlyEnforceIf(es_ultimo_viaje)
            model.Add(v['inicio_carga'] != max_inicio_carga).OnlyEnforceIf(es_ultimo_viaje.Not())

            # Penalización condicional
            penalizacion_ociosa_viaje = model.NewIntVar(0, 100, f"penal_ociosa_viaje_{pid}_{v['viaje_base']['id']}")
            # Si el viaje se usa Y NO es el último, la penalización es su capacidad ociosa.
            model.Add(penalizacion_ociosa_viaje == cap_ociosa_viaje).OnlyEnforceIf(v['viaje_se_usa'], es_ultimo_viaje.Not())
            # En cualquier otro caso (no se usa, o es el último), la penalización es 0.
            model.Add(penalizacion_ociosa_viaje == 0).OnlyEnforceIf(v['viaje_se_usa'].Not())
            model.Add(penalizacion_ociosa_viaje == 0).OnlyEnforceIf(es_ultimo_viaje)
            capacidad_ociosa_total.append(penalizacion_ociosa_viaje)

    peso_eficiencia = int(config.get('peso_eficiencia_carga', 10))
    suma_capacidad_ociosa = model.NewIntVar(0, 100 * len(asignaciones), "suma_cap_ociosa")
    model.Add(suma_capacidad_ociosa == sum(capacidad_ociosa_total))
    penalizacion_eficiencia_final = model.NewIntVar(0, 100 * len(asignaciones) * peso_eficiencia, "penal_eficiencia_final")
    model.AddMultiplicationEquality(penalizacion_eficiencia_final, [suma_capacidad_ociosa, peso_eficiencia])
    penalizaciones.append(penalizacion_eficiencia_final)
    logging.info("DEBUG: Penalización por eficiencia de carga (excepto último viaje) ACTIVADA.")

    # --- NUEVO OBJETIVO (CORREGIDO): Penalizar el tiempo ocioso de los camiones ---
    # Esto incentiva el uso de toda la flota disponible en lugar de sobrecargar un solo camión.
    peso_tiempo_ocioso = int(config.get('peso_tiempo_ocioso', 10)) # Un peso moderado para que actúe como desempate

    for j, camion in enumerate(camiones):
        inicios_condicionales = []
        fines_condicionales = []
        duraciones_trabajadas = []

        for (pid, i), data_viaje in asignaciones.items():
            es_de_este_camion = model.NewBoolVar(f"es_de_camion_{j}_para_ocio_{pid}_{i}")
            model.Add(data_viaje['camion_asignado'] == j).OnlyEnforceIf(es_de_este_camion)
            model.Add(data_viaje['camion_asignado'] != j).OnlyEnforceIf(es_de_este_camion.Not())

            viaje_usado_por_camion = model.NewBoolVar(f"viaje_usado_por_camion_ocio_{j}_{pid}_{i}")
            model.AddBoolAnd([data_viaje['viaje_se_usa'], es_de_este_camion]).OnlyEnforceIf(viaje_usado_por_camion)
            model.AddBoolOr([data_viaje['viaje_se_usa'].Not(), es_de_este_camion.Not()]).OnlyEnforceIf(viaje_usado_por_camion.Not())

            # Para Min/Max: si el viaje no es de este camión, usamos un valor extremo para que no sea elegido.
            inicio_cond = model.NewIntVar(0, horizonte_tiempo, f"inicio_cond_ocio_{j}_{pid}_{i}")
            model.Add(inicio_cond == data_viaje['inicio_carga']).OnlyEnforceIf(viaje_usado_por_camion)
            model.Add(inicio_cond == horizonte_tiempo).OnlyEnforceIf(viaje_usado_por_camion.Not())
            inicios_condicionales.append(inicio_cond)

            fin_ciclo = data_viaje['llegada_planta'] + int(config.get('tiempo_lavado', 7))
            fin_cond = model.NewIntVar(0, horizonte_tiempo, f"fin_cond_ocio_{j}_{pid}_{i}")
            model.Add(fin_cond == fin_ciclo).OnlyEnforceIf(viaje_usado_por_camion)
            model.Add(fin_cond == 0).OnlyEnforceIf(viaje_usado_por_camion.Not())
            fines_condicionales.append(fin_cond)

            duracion_trabajada = model.NewIntVar(0, horizonte_tiempo, f"dur_trabajada_ocio_{j}_{pid}_{i}")
            model.Add(duracion_trabajada == fin_ciclo - data_viaje['inicio_carga']).OnlyEnforceIf(viaje_usado_por_camion)
            model.Add(duracion_trabajada == 0).OnlyEnforceIf(viaje_usado_por_camion.Not())
            duraciones_trabajadas.append(duracion_trabajada)

        primer_inicio = model.NewIntVar(0, horizonte_tiempo, f"primer_inicio_camion_{j}")
        model.AddMinEquality(primer_inicio, inicios_condicionales)
        ultimo_fin = model.NewIntVar(0, horizonte_tiempo, f"ultimo_fin_camion_{j}")
        model.AddMaxEquality(ultimo_fin, fines_condicionales)
        tiempo_trabajado = model.NewIntVar(0, horizonte_tiempo, f"tiempo_trabajado_camion_{j}")
        model.Add(tiempo_trabajado == sum(duraciones_trabajadas))
        tiempo_ocioso = model.NewIntVar(0, horizonte_tiempo, f"tiempo_ocioso_camion_{j}")
        model.Add(tiempo_ocioso == ultimo_fin - primer_inicio - tiempo_trabajado)
        
        penalizaciones.append(tiempo_ocioso * peso_tiempo_ocioso)

    model.Minimize(sum(penalizaciones))

    # --- 4. RESOLVER EL MODELO ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(config.get('solver_max_time_seconds', 30.0))
    solver.parameters.num_search_workers = int(config.get('solver_workers', 8))
    solver.parameters.log_search_progress = True # Activar para depuración

    status = solver.Solve(model)

    # --- 5. CONSTRUIR LA RESPUESTA ---
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        logging.info(f"Solución encontrada: {solver.StatusName(status)}, Objetivo: {solver.ObjectiveValue():.2f}")
        planificacion_optimizada = []
        
        # Primero, eliminar los viajes maestros originales que se procesaron
        ids_maestros_procesados = [p['info']['id'] for p in pedidos.values() if p['info'].get('estado') == 'PENDIENTE_PLANIFICACION']
        if ids_maestros_procesados:
            # Esto es conceptual. La eliminación real se hace en el frontend.
            # Aquí podríamos devolver una lista de IDs a eliminar.
            pass

        for (pid, i), data_viaje in asignaciones.items():
            if solver.Value(data_viaje['viaje_se_usa']):
                viaje_base = data_viaje['viaje_base']
                camion_idx = solver.Value(data_viaje['camion_asignado'])
                camion_asignado = camiones[camion_idx]

                # Reconstruir el objeto de viaje para la respuesta
                viaje_actualizado = {
                    # Datos del pedido original
                    "pedido_id": viaje_base.get('pedido_id'),
                    "articulo_id": viaje_base.get('articulo_id'),
                    "planta_id": viaje_base.get('planta_id'),
                    "fecha_programada": viaje_base.get('fecha_programada'),
                    "hora_programada": viaje_base.get('hora_programada'),
                    
                    # Datos calculados por el optimizador
                    "cantidad": solver.Value(data_viaje['cantidad_transportada']) / 10.0,
                    "camion_id": camion_asignado['id'],
                    "estado": 'ASIGNADO',
                    'hora_inicio_carga_teorica': minutes_to_time(solver.Value(data_viaje['inicio_carga'])),
                    'hora_fin_carga_teorica': minutes_to_time(solver.Value(data_viaje['fin_carga'])),
                    'hora_salida_planta_teorica': minutes_to_time(solver.Value(data_viaje['salida_planta'])),
                    'hora_llegada_obra_teorica': minutes_to_time(solver.Value(data_viaje['llegada_obra'])),
                    'hora_inicio_descarga_teorica': minutes_to_time(solver.Value(data_viaje['inicio_descarga'])),
                    'hora_fin_descarga_teorica': minutes_to_time(solver.Value(data_viaje['fin_descarga'])),
                    'hora_llegada_planta_teorica': minutes_to_time(solver.Value(data_viaje['llegada_planta'])),
                }
                planificacion_optimizada.append(viaje_actualizado)

        # Devolvemos un objeto que contiene los viajes a crear/actualizar y los que hay que borrar
        return {"viajes_planificados": planificacion_optimizada, "ids_a_eliminar": ids_maestros_procesados}, 200

    else:
        logging.error(f"No se encontró una solución. Estado: {solver.StatusName(status)}")
        model_proto = model.Proto()
        logging.debug(f"Modelo problemático:\n{model_proto}")
        error_message = f"No se pudo encontrar una solución. Estado: {solver.StatusName(status)}. Revisa los logs para ver el detalle del modelo."
        return {"error": error_message}, 500