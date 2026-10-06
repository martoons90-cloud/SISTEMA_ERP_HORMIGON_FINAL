# api/utils.py
import logging

def time_to_minutes(time_str):
    """Convierte un string 'HH:MM' a minutos totales desde la medianoche."""
    if not time_str or ':' not in time_str:
        return 0
    parts = time_str.split(':')
    h = int(parts[0])
    m = int(parts[1])
    return h * 60 + m

def minutes_to_time(mins):
    """Convierte minutos totales a un string 'HH:MM'."""
    if mins is None:
        return None
    h = (int(mins) // 60) % 24
    m = int(mins) % 60
    return f"{h:02d}:{m:02d}"

def get_tiempo_carga_for_planta(planta_id, cantidad, plantas, config):
    """Calcula la duración de la carga para una planta y cantidad dadas."""
    planta = next((p for p in plantas if p['id'] == planta_id), None)
    if not planta:
        return int(config.get('tiempo_carga_fijo', 5) + (cantidad * config.get('ratio_carga', 1)))
    return int(planta.get('tiempo_ciclo_fijo', 5) + (cantidad * planta.get('ratio_ciclo_m3', 1)))

def get_viaje_coords(viaje):
    """Función de ayuda para obtener lat/lon de un viaje aplanado."""
    return viaje.get('obra_lat'), viaje.get('obra_lon')

def get_viaje_tipo_obra_id(viaje):
    """Función de ayuda para obtener el tipo de obra de un viaje."""
    if viaje and (pedido := viaje.get('pedido')) and (obra := pedido.get('obra')):
        return obra.get('tipo_obra_id')
    return 0