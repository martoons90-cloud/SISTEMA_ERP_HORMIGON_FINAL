# api/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
import traceback

# --- Cargar variables de entorno desde el archivo .env ---
# Debe hacerse antes de que cualquier otro módulo intente usarlas.
load_dotenv()

# --- Módulo de estimación de tiempos con Machine Learning ---
from estimadores import load_models
from optimizar import run_optimization

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Inicialización de la aplicación Flask ---
app = Flask(__name__)
CORS(app) # Habilitar CORS para permitir peticiones locales

@app.route('/api/optimizar', methods=['POST'])
def optimizar_planificacion():
    try:
        problem_data = request.get_json()
        resultado, status_code = run_optimization(problem_data)
        return jsonify(resultado), status_code

    except Exception as e:
        logging.error(f"Error fatal en la optimización: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        load_models()
    except Exception as e:
        logging.warning(f"No se pudieron cargar los modelos de predicción. Causa: {e}")
    app.run(debug=True)
