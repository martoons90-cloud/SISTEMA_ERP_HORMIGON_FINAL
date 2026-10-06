import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import Layout from './components/Layout';
import { supabase } from './supabaseClient';

// Importamos nuestras páginas
import { Typography } from '@mui/material';
import Articulos from './pages/stock/Articulos';
import Depositos from './pages/stock/Depositos';
import GestionVariantes from './pages/stock/GestionVariantes';
import Movimientos from './pages/stock/Movimientos';
import ConfiguracionStock from './pages/stock/ConfiguracionStock';
import OrdenesCompra from './pages/compras/OrdenesCompra';
import NuevaOrdenCompra from './pages/compras/NuevaOrdenCompra';
import EditarOrdenCompra from './pages/compras/EditarOrdenCompra';
import Proveedores from './pages/compras/Proveedores';
import ConfiguracionCompras from './pages/compras/ConfiguracionCompras';
import NuevaRecepcion from './pages/compras/NuevaRecepcion';
import RemitosIngreso from './pages/compras/RemitosIngreso';
import NuevaDevolucion from './pages/compras/NuevaDevolucion';
import Devoluciones from './pages/compras/Devoluciones';
import FacturasCompra from './pages/compras/FacturasCompra';
import NuevaFacturaCompra from './pages/compras/NuevaFacturaCompra';
import EditarFacturaCompra from './pages/compras/EditarFacturaCompra';
import MiPerfil from './pages/MiPerfil';
import Login from './pages/Login';
import PedidosVenta from './pages/ventas/PedidosVenta';
import NuevoPedidoVenta from './pages/ventas/NuevoPedidoVenta';
import Cotizaciones from './pages/ventas/Cotizaciones';
import NuevaCotizacion from './pages/ventas/NuevaCotizacion';
import NuevaFacturaVenta from './pages/ventas/NuevaFacturaVenta';
import ConfiguracionVentas from './pages/ventas/ConfiguracionVentas';
import GestionVendedores from './pages/ventas/GestionVendedores';
import GestionCondicionesVenta from './pages/ventas/GestionCondicionesVenta';
import GestionCategoriasCliente from './pages/ventas/GestionCategoriasCliente';
import GestionTiposObra from './pages/ventas/GestionTiposObra';
import GestionProvincias from './pages/ventas/GestionProvincias';
import GestionLocalidades from './pages/ventas/GestionLocalidades';
import GestionZonas from './pages/ventas/GestionZonas';
import GestionAlicuotasIVA from './pages/ventas/GestionAlicuotasIVA';
import GestionPercepcionesVenta from './pages/ventas/GestionPercepcionesVenta';
import GestionTalonarios from './pages/ventas/GestionTalonarios';
import GestionListasPrecios from './pages/ventas/GestionListasPrecios';
import DetalleListaPrecios from './pages/ventas/DetalleListaPrecios';
import FacturasVenta from './pages/ventas/FacturasVenta';
import Clientes from './pages/ventas/Clientes';
import DespachosPlanta from './pages/produccion/DespachosPlanta';
import GestionFormulas from './pages/produccion/GestionFormulas';
import NuevaFormula from './pages/produccion/NuevaFormula';
import GestionRemitosEmitidos from './pages/produccion/GestionRemitosEmitidos';

// Rutas de Logística
import RemitosEntrega from './pages/produccion/RemitosEntrega';
import NuevoRemito from './pages/produccion/NuevoRemito';
import Plantas from './pages/logistica/Plantas';
import Choferes from './pages/logistica/Choferes';
import Camiones from './pages/logistica/Camiones';
import Bombas from './pages/logistica/Bombas';
import ProgramacionDiaria from './pages/logistica/ProgramacionDiaria';
import ConfiguracionLogistica from './pages/logistica/ConfiguracionLogistica';
import GestionTalonariosRemitos from './pages/logistica/GestionTalonariosRemitos';

// Rutas de Laboratorio y Mantenimiento
import RegistroProbetas from './components/RegistroProbetas';
import AgendaEnsayos from './components/AgendaEnsayos';
import InformesCalidad from './components/InformesCalidad';
import OrdenesTrabajo from './components/OrdenesTrabajo';
import PlanesPreventivos from './components/PlanesPreventivos';
import ActivosEquipos from './components/ActivosEquipos';

// Rutas de Tesorería (Lazy Loading para mejorar el rendimiento inicial)
const OrdenesPago = lazy(() => import('./pages/tesoreria/OrdenesPago'));
const NuevaOrdenPago = lazy(() => import('./pages/tesoreria/NuevaOrdenPago'));

function App() {
  console.log("El componente App.jsx se está renderizando. Si ves esto, el error de arranque se solucionó.");

  const [mode, setMode] = useState('dark');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const theme = useMemo(
    () =>
      createTheme({
        unstable_shouldUseGrid2: true, // <-- ACTIVAMOS GRID V2 GLOBALMENTE
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Colores para el modo claro
                primary: { main: '#1976d2' },
                background: {
                  default: '#f4f6f8',
                  paper: '#ffffff',
                },
              }
            : {
                // Colores para el modo oscuro
                primary: { main: '#90caf9' },
                background: {
                  default: '#121212',
                  paper: '#1e1e1e',
                },
              }),
        },
      }),
    [mode],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <Routes>
          {!session ? (
            <Route path="*" element={<Login />} />
          ) : (
            <Route path="/" element={<Layout toggleTheme={colorMode.toggleColorMode} currentMode={mode} />}>
              <Route index element={<Typography variant="h4" sx={{ p: 3 }}>Bienvenido al Sistema ERP</Typography>} />
              
              {/* Rutas de Stock */}
              <Route path="stock/articulos" element={<Articulos />} />
              <Route path="stock/variantes" element={<GestionVariantes />} />
              <Route path="stock/depositos" element={<Depositos />} />
              <Route path="stock/movimientos" element={<Movimientos />} />
              <Route path="stock/configuracion" element={<ConfiguracionStock />} />
  
              {/* Rutas de Compras */}
              <Route path="compras/ordenes" element={<OrdenesCompra />} />
              <Route path="compras/ordenes/nueva" element={<NuevaOrdenCompra />} />
              <Route path="compras/recepcion/nueva/:ordenId" element={<NuevaRecepcion />} />
              <Route path="compras/remitos" element={<RemitosIngreso />} />
              <Route path="compras/devoluciones/nueva" element={<NuevaDevolucion />} />
              <Route path="compras/devoluciones" element={<Devoluciones />} />
              <Route path="compras/ordenes/editar/:id" element={<EditarOrdenCompra />} />
              <Route path="compras/facturas/nueva" element={<NuevaFacturaCompra />} />
              <Route path="compras/facturas/editar/:facturaId" element={<EditarFacturaCompra />} />
              <Route path="compras/facturas" element={<FacturasCompra />} />
              <Route path="compras/proveedores" element={<Proveedores />} />
              <Route path="compras/configuracion" element={<ConfiguracionCompras />} />

              {/* Rutas de Ventas */}
              <Route path="ventas/pedidos" element={<PedidosVenta />} />
              <Route path="ventas/pedidos/nuevo" element={<NuevoPedidoVenta />} />
              <Route path="ventas/pedidos/editar/:pedidoId" element={<NuevoPedidoVenta />} />
              <Route path="ventas/cotizaciones" element={<Cotizaciones />} />
              <Route path="ventas/cotizaciones/nueva" element={<NuevaCotizacion />} />              
              <Route path="ventas/cotizaciones/editar/:cotizacionId" element={<NuevaCotizacion />} />
              <Route path="ventas/facturas/nueva" element={<NuevaFacturaVenta />} />
              <Route path="ventas/facturas/nueva/:pedidoId" element={<NuevaFacturaVenta />} />
              <Route path="ventas/clientes" element={<Clientes />} />
              <Route path="ventas/facturas" element={<FacturasVenta />} />
              <Route path="ventas/configuracion" element={<ConfiguracionVentas />} />
              <Route path="ventas/configuracion/vendedores" element={<GestionVendedores />} />
              <Route path="ventas/configuracion/condiciones-venta" element={<GestionCondicionesVenta />} />
              <Route path="ventas/configuracion/categorias-cliente" element={<GestionCategoriasCliente />} />
              <Route path="ventas/configuracion/tipos-obra" element={<GestionTiposObra />} />
              <Route path="ventas/configuracion/provincias" element={<GestionProvincias />} />
              <Route path="ventas/configuracion/localidades" element={<GestionLocalidades />} />
              <Route path="ventas/configuracion/zonas" element={<GestionZonas />} />
              <Route path="ventas/configuracion/alicuotas-iva" element={<GestionAlicuotasIVA />} />
              <Route path="ventas/configuracion/percepciones-venta" element={<GestionPercepcionesVenta />} />
              <Route path="ventas/configuracion/talonarios" element={<GestionTalonarios />} />
              <Route path="ventas/configuracion/listas-precios" element={<GestionListasPrecios />} />
              <Route path="ventas/listas-precios/:listaId" element={<DetalleListaPrecios />} />

              {/* Rutas de Logística (sin remitos) */}
              <Route path="logistica/plantas" element={<Plantas />} />
              <Route path="logistica/choferes" element={<Choferes />} />
              <Route path="logistica/camiones" element={<Camiones />} />
              <Route path="logistica/bombas" element={<Bombas />} />
              <Route path="logistica/programacion" element={<ProgramacionDiaria />} />
              <Route path="logistica/configuracion" element={<ConfiguracionLogistica />} />
              <Route path="logistica/talonarios-remitos" element={<GestionTalonariosRemitos />} />

              {/* Rutas de Producción */}
              <Route path="produccion/remitos" element={<RemitosEntrega />} />
              <Route path="produccion/remitos/nuevo/:pedidoId" element={<NuevoRemito />} />
              <Route path="produccion/remitos-emitidos" element={<GestionRemitosEmitidos />} />
              <Route path="produccion/formulas" element={<GestionFormulas />} />
              <Route path="produccion/formulas/nueva" element={<NuevaFormula />} />
              <Route path="produccion/formulas/editar/:formulaId" element={<NuevaFormula />} />
              <Route path="produccion/despachos" element={<DespachosPlanta />} />

              {/* Rutas de Laboratorio */}
              <Route path="laboratorio/probetas" element={<RegistroProbetas />} />
              <Route path="laboratorio/ensayos" element={<AgendaEnsayos />} />
              <Route path="laboratorio/informes" element={<InformesCalidad />} />

              {/* Rutas de Mantenimiento */}
              <Route path="mantenimiento/ordenes" element={<OrdenesTrabajo />} />
              <Route path="mantenimiento/planes" element={<PlanesPreventivos />} />
              <Route path="mantenimiento/activos" element={<ActivosEquipos />} />


              {/* Rutas de Tesorería */}
              <Route path="tesoreria/pagos" element={
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                  <OrdenesPago />
                </Suspense>
              } />
              <Route path="tesoreria/pagos/nueva" element={
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                  <NuevaOrdenPago />
                </Suspense>
              } />

              {/* Ruta de Perfil */}
              <Route path="perfil" element={<MiPerfil />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
