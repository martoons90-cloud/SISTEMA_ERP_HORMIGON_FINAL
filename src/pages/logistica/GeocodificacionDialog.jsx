import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Button, Box, Typography, Chip, CircularProgress
} from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import { Factory } from 'phosphor-react';

// Componente para el buscador integrado en el mapa
const GeoSearchComponent = ({ onResultSelect }) => {
  const map = useMap();
  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      autoClose: true,
      keepResult: true,
    });
    map.addControl(searchControl);
    map.on('geosearch/showlocation', (e) => onResultSelect({ lat: e.location.y, lng: e.location.x }));
    return () => map.removeControl(searchControl);
  }, [map, onResultSelect]);
  return null;
};

// Componente para redimensionar el mapa y evitar el panel gris
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const GeocodificacionDialog = ({ open, onClose, onSave, obra, plantas, getRouteDetails }) => {
  const [position, setPosition] = useState(null);
  const [coordsString, setCoordsString] = useState('');
  const [addressString, setAddressString] = useState('');
  const [mapCenter, setMapCenter] = useState([-34.6037, -58.3816]); // Ubicación por defecto
  const [isSaving, setIsSaving] = useState(false);

  // Estados para el cálculo de ruta
  const [selectedPlanta, setSelectedPlanta] = useState(null);
  const [routeDetails, setRouteDetails] = useState({ distance: null, duration: null });
  const [isCalculating, setIsCalculating] = useState(false);

  // Función para obtener la dirección a partir de coordenadas
  const reverseGeocode = useCallback(async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setAddressString(data?.display_name || 'No se pudo encontrar la dirección.');
    } catch (error) {
      console.error("Error en la geocodificación inversa:", error);
      setAddressString('Error al buscar la dirección.');
    }
  }, []);

  // Efecto para calcular la ruta cuando cambia la planta o la posición
  const calculateRoute = useCallback(async (currentPosition, currentPlanta) => {
    // Usamos los argumentos 'currentPosition' y 'currentPlanta' en lugar del estado
    // para evitar problemas de "stale state".
    if (currentPlanta && currentPosition && getRouteDetails) {
      setIsCalculating(true);
      const startCoords = { lon: currentPlanta.longitud, lat: currentPlanta.latitud };
      const endCoords = { lon: currentPosition.lng, lat: currentPosition.lat };
      console.log('[DEBUG] Calculando ruta desde:', startCoords, 'hasta:', endCoords);
      const details = await getRouteDetails(startCoords, endCoords);
      console.log('[DEBUG] Detalles de ruta recibidos:', details);
      if (details) {
        setRouteDetails({
          distance: (details.distance / 1000).toFixed(1), // a km
          duration: Math.round(details.duration / 60),   // a minutos
        });
      } else {
        console.log('[DEBUG] No se recibieron detalles de la ruta, reseteando.');
        setRouteDetails({ distance: null, duration: null });
      }
      setIsCalculating(false);
    }
  }, [getRouteDetails]); // La única dependencia externa es la función

  // Efecto para inicializar el diálogo cuando se abre
  useEffect(() => {
    if (obra && open) {
      const lat = parseFloat(obra.latitud);
      const lng = parseFloat(obra.longitud);
      
      // Preseleccionar la planta si se pasó un ID
      const currentPlanta = plantas.find(p => p.id === obra.preselectedPlantaId) || plantas[0] || null;
      setSelectedPlanta(currentPlanta);

      if (!isNaN(lat) && !isNaN(lng)) {
        const initialPosition = { lat, lng };
        setPosition(initialPosition);
        setMapCenter([lat, lng]);
        setCoordsString(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        reverseGeocode(lat, lng);
        // Llamamos a calcular la ruta aquí con los datos iniciales
        calculateRoute(initialPosition, currentPlanta);
      } else {
        // Si la obra no tiene coordenadas, resetea los estados
        setPosition(null);
        setCoordsString('');
        setAddressString(obra.direccion || '');
        setRouteDetails({ distance: null, duration: null });
      }
    } 
  }, [obra, open, reverseGeocode, plantas, calculateRoute]);


  // Maneja la selección de una nueva ubicación (por clic o búsqueda)
  const handleLocationSelect = (latlng) => {
    setPosition(latlng);
    setCoordsString(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
    setMapCenter([latlng.lat, latlng.lng]);
    reverseGeocode(latlng.lat, latlng.lng);
    calculateRoute(latlng, selectedPlanta); // Llamamos a calcular la ruta aquí también
  };

  // Componente interno para manejar los clics en el mapa
  const MapEvents = () => {
    useMapEvents({ click: (e) => handleLocationSelect(e.latlng) });
    return null;
  };

  const handleSave = async () => {
    if (position) {
      setIsSaving(true);
      try {
        // La función onSave ahora debe ser una promesa
        await onSave({ latitud: position.lat, longitud: position.lng });
      } catch (error) {
        // El componente padre es responsable de mostrar el snackbar de error
        console.error("Error al intentar guardar la ubicación:", error);
      } finally {
        setIsSaving(false);
        onClose();
      }
    }
  };

  if (!obra) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Geocodificar: {obra.nombre}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }} alignItems="center">
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección Encontrada"
              value={addressString}
              InputProps={{ readOnly: true }}
              variant="filled"
              helperText="La dirección se actualiza al buscar o hacer clic en el mapa."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Factory size={24} color="grey" />
              <Box>
                <Typography variant="caption" color="text.secondary">Ruta desde Planta</Typography>
                <Typography variant="body1" fontWeight="500">{selectedPlanta ? selectedPlanta.nombre : 'No asignada'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1 }}>
              {isCalculating ? <CircularProgress size={24} /> : (
                routeDetails.distance !== null && (
                  <Chip label={`Aprox. ${routeDetails.distance} km / ${routeDetails.duration} min`} color="primary" variant="outlined" />
                )
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Coordenadas (Latitud, Longitud)"
              value={coordsString}
              InputProps={{ readOnly: true }}
              helperText="Las coordenadas se actualizan al buscar o hacer clic en el mapa."
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ height: '50vh', width: '100%', border: '1px solid #ccc', borderRadius: 1 }}>
              <MapContainer center={mapCenter} zoom={position ? 16 : 13} style={{ height: '100%', width: '100%' }} key={mapCenter.join(',')}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapResizer />
                <GeoSearchComponent onResultSelect={handleLocationSelect} />
                <MapEvents />
                {position && <Marker position={[position.lat, position.lng]} />}
              </MapContainer>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={!position || isSaving}>
          {isSaving ? <CircularProgress size={24} /> : 'Guardar Ubicación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GeocodificacionDialog;
