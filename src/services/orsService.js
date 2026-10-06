// src/services/orsService.js
import axios from 'axios';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

export const getRouteDetails = async (startCoords, endCoords) => {
  if (!ORS_API_KEY) {
    console.error("API key de OpenRouteService no está configurada.");
    return null;
  }
  try {
    const response = await axios.post(ORS_API_URL, {
      coordinates: [[startCoords.lon, startCoords.lat], [endCoords.lon, endCoords.lat]]
    }, {
      headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' }
    });
    const summary = response.data?.routes?.[0]?.summary;
    if (!summary) return null;
    return {
      duration: summary.duration,
      distance: summary.distance,
    };
  } catch (error) {
    console.error('Error al obtener la ruta de ORS:', error.response ? error.response.data : error.message);
    return null;
  }
};
