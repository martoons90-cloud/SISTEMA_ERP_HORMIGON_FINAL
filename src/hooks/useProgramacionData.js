// src/pages/logistica/hooks/useProgramacionData.js
import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { supabase } from '../supabaseClient.js';

export const useProgramacionData = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    viajes: [],
    choferes: [],
    camiones: [],
    bombas: [],
    plantas: [],
    disponibilidadChoferes: {},
    disponibilidadCamiones: {},
    disponibilidadBombas: {},
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        viajesRes,
        choferesRes,
        camionesRes,
        bombasRes,
        plantasRes,
      ] = await Promise.all([
        supabase.from('log_viajes').select(`*, pedido:ven_pedidos_venta(*, cliente:ven_clientes(*), obra:ven_clientes_obras(*), detalle:ven_pedidos_venta_detalle(*, articulo:stk_articulos(id, name, code))), articulo:stk_articulos(id, name, code), planta:log_plantas(*), camion:log_camiones(*), chofer:log_choferes(*), bomba:log_bombas(*)`),
        supabase.from('log_choferes').select('*').eq('activo', true),
        supabase.from('log_camiones').select('*'),
        supabase.from('log_bombas').select('*').eq('activo', true),
        supabase.from('log_plantas').select('*'),
      ]);

      if (viajesRes.error) throw viajesRes.error;
      if (choferesRes.error) throw choferesRes.error;
      if (camionesRes.error) throw camionesRes.error;
      if (bombasRes.error) throw bombasRes.error;
      if (plantasRes.error) throw plantasRes.error;

      setData({
        viajes: viajesRes.data || [],
        choferes: choferesRes.data || [],
        camiones: camionesRes.data || [],
        bombas: bombasRes.data || [],
        plantas: plantasRes.data || [],
        disponibilidadChoferes: (choferesRes.data || []).reduce((acc, c) => ({ ...acc, [c.id]: true }), {}),
        disponibilidadCamiones: (camionesRes.data || []).reduce((acc, c) => ({ ...acc, [c.id]: true }), {}),
        disponibilidadBombas: (bombasRes.data || []).reduce((acc, b) => ({ ...acc, [b.id]: true }), {}),
      });

    } catch (error) {
      enqueueSnackbar('Error al cargar los datos de programación: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, fetchData, setViajes: (newViajes) => setData(prev => ({...prev, viajes: newViajes})) };
};
