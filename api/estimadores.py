# api/estimadores.py
import numpy as np
import pandas as pd
from haversine import haversine
import lightgbm as lgb
from sklearn.neighbors import BallTree
import math
import os

# Variables globales para mantener los modelos y datos en memoria
MODEL_TRAVEL = None
MODEL_DESCARGA = None
NEIGHBORS_DF = None
TREE = None

def load_models(travel_path="model_travel.txt", descarga_path="model_descarga.txt"):
    """Carga los modelos de predicción y los datos para el fallback de vecinos."""
    global MODEL_TRAVEL, MODEL_DESCARGA, NEIGHBORS_DF, TREE
    
    try:
        if os.path.exists(travel_path):
            MODEL_TRAVEL = lgb.Booster(model_file=travel_path)
            print("Modelo de tiempo de viaje cargado exitosamente.")
        else:
            print(f"Advertencia: Archivo de modelo de viaje no encontrado en '{travel_path}'. Se usará fallback.")
    except Exception as e:
        print(f"Error al cargar el modelo de viaje: {e}")

    try:
        if os.path.exists(descarga_path):
            MODEL_DESCARGA = lgb.Booster(model_file=descarga_path)
            print("Modelo de tiempo de descarga cargado exitosamente.")
        else:
            print(f"Advertencia: Archivo de modelo de descarga no encontrado en '{descarga_path}'. Se usará fallback.")
    except Exception as e:
        print(f"Error al cargar el modelo de descarga: {e}")

def load_historical_data(historical_records):
    """Carga los datos históricos y prepara el BallTree para el fallback de vecinos."""
    global NEIGHBORS_DF, TREE
    NEIGHBORS_DF = None
    TREE = None

    try:
        if historical_records and len(historical_records) > 0:
            NEIGHBORS_DF = pd.DataFrame(historical_records)
            NEIGHBORS_DF.dropna(subset=['obra_lat', 'obra_lon', 'tiempo_viaje_ida_min'], inplace=True)
            coords = np.radians(NEIGHBORS_DF[['obra_lat','obra_lon']].values)
            TREE = BallTree(coords, metric='haversine')
            logging.info(f"Datos históricos cargados para fallback de vecinos: {len(NEIGHBORS_DF)} registros.")
    except Exception as e:
        logging.error(f"Error al procesar datos históricos para fallback: {e}")

def features_for_prediction(planta_lat, planta_lon, obra_lat, obra_lon, hora_inicio_dt, volumen, tipo_obra_id=0):
    """Construye el vector de características para un viaje específico."""
    dist_km = 0.0
    if planta_lat is not None and obra_lat is not None:
        dist_km = haversine((planta_lat, planta_lon), (obra_lat, obra_lon))
    
    return {
        'dist_km': dist_km,
        'hour': hora_inicio_dt.hour,
        'minute': hora_inicio_dt.minute,
        'dow': hora_inicio_dt.weekday(), # Lunes=0, Domingo=6
        'volumen_m3': volumen,
        'tipo_obra_cat': int(tipo_obra_id) if tipo_obra_id is not None else 0
    }

def predict_travel_time(features, config):
    """Predice el tiempo de viaje. Usa el modelo, luego fallback de vecinos, luego default."""
    # 1. Usar el modelo si está cargado
    if MODEL_TRAVEL:
        # El orden de las features debe coincidir con el entrenamiento
        X = [features[k] for k in ['dist_km','hour','minute','dow','volumen_m3','tipo_obra_cat']]
        try:
            pred = MODEL_TRAVEL.predict([X])[0]
            return max(5, int(round(pred))) # Mínimo 5 minutos
        except Exception as e:
            logging.warning(f"Fallo en predicción con modelo ML: {e}. Usando fallback.")
            pass # Si el modelo falla, continuamos con los fallbacks
    
    # 2. Fallback a "Vecinos más Cercanos" (KNN) si hay datos históricos
    if TREE is not None and NEIGHBORS_DF is not None and features['dist_km'] > 0:
        try:
            # Buscar los 3 vecinos más cercanos en un radio de 2km
            dist, ind = TREE.query(np.radians([[features['obra_lat'], features['obra_lon']]]), k=3)
            
            # Filtrar vecinos que estén a más de 2km (en radianes)
            max_dist_rad = 2 / 6371 # 2km en radianes
            valid_neighbors_idx = ind[0][dist[0] < max_dist_rad]

            if len(valid_neighbors_idx) > 0:
                avg_time = NEIGHBORS_DF.iloc[valid_neighbors_idx]['tiempo_viaje_ida_min'].mean()
                return max(5, int(round(avg_time)))
        except Exception as e:
            logging.warning(f"Fallo en fallback de vecinos: {e}. Usando siguiente fallback.")
            pass

    # 3. Si no hay modelo ni vecinos, devolvemos None para que el llamador use ORS o default
    return None

def predict_descarga_time(features, config):
    """Predice el tiempo de descarga. Usa el modelo, luego fallback de vecinos, luego default."""
    # 1. Usar el modelo si está cargado
    if MODEL_DESCARGA:
        X = [features[k] for k in ['dist_km','hour','minute','dow','volumen_m3','tipo_obra_cat']]
        return max(5, int(round(MODEL_DESCARGA.predict([X])[0]))) # Mínimo 5 minutos

    # 2. Fallback a la fórmula simple
    cantidad = features['volumen_m3']
    return int(config.get('tiempo_descarga_fijo', 15) + (cantidad * config.get('ratio_descarga', 2)))