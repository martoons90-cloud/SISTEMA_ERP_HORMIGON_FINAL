import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Switch, FormControlLabel, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Divider, Autocomplete,
  Tabs, Tab
} from '@mui/material'; 
import { PlusCircle, PencilSimple, Trash, ArrowSquareOut } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

// Componente helper para el panel de cada pestaña
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Componente para enlazar a páginas de gestión dedicadas
const ConfigLinkCard = ({ title, description, to }) => {
  const navigate = useNavigate();
  return (
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, my: 1 }}>
              {description}
          </Typography>
          <Button 
              variant="outlined" 
              endIcon={<ArrowSquareOut />} 
              onClick={() => navigate(to)}
          >
              Gestionar
          </Button>
      </Paper>
  );
};

// Componente genérico para una tabla de configuración simple (CRUD)
const SimpleCrudTable = ({ title, items, onOpenDialog, columns, onDelete }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">{title}</Typography>
      <Button variant="contained" size="small" startIcon={<PlusCircle />} onClick={() => onOpenDialog()}>
        Nuevo
      </Button>
    </Box>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map(col => <TableCell key={col.key} align={col.align || 'left'}>{col.header}</TableCell>)}
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              {columns.map(col => (
                <TableCell key={col.key} align={col.align || 'left'}>
                  {col.render ? col.render(item) : item[col.key]}
                  {col.key === 'valor' ? '%' : ''}
                </TableCell>
              ))}
              <TableCell align="right">
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => onOpenDialog(item)}><PencilSimple /></IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => onDelete(item)}><Trash /></IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);


const ConfiguracionVentas = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Estados de configuración
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ type: '', data: null, title: '' });
  const [currentItem, setCurrentItem] = useState({});

  // Estado para las pestañas
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ven_configuracion').select('key, value');
      if (error) throw error;

      // Transforma el array de {key, value} en un único objeto de configuración
      const configObject = data.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setConfig(configObject);
    } catch (error) {
      enqueueSnackbar(`Error cargando la configuración: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleConfigChange = async (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase.from('ven_configuracion').upsert({ key, value });
      if (error) throw error;
      enqueueSnackbar('Configuración guardada.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Error al guardar la configuración: ${error.message}`, { variant: 'error' });
    }
  };

  const handleOpenDialog = (type, data = null, title) => {
    setDialogConfig({ type, data, title });
    // This dialog is now only used for mock data tables
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogConfig({ type: '', data: null, title: '' });
    setCurrentItem({});
  };

  const handleSave = async () => {
    // No-op for now, as all connected tables have their own pages.
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración del Módulo de Ventas
      </Typography>
      
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="pestañas de configuración de ventas">
            <Tab label="Comercial" id="config-tab-0" aria-controls="config-tabpanel-0" />
            <Tab label="Geografía y Obras" id="config-tab-1" aria-controls="config-tabpanel-1" />
            <Tab label="Facturación" id="config-tab-2" aria-controls="config-tabpanel-2" />
            <Tab label="General" id="config-tab-3" aria-controls="config-tabpanel-3" />
          </Tabs>
        </Box>

        {/* Pestaña Comercial */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard 
                title="Vendedores"
                description="Administra los vendedores, sus datos personales, comisiones y su vínculo con los usuarios del sistema."
                to="/ventas/configuracion/vendedores"
              />
            </Grid>
            <Grid item xs={12} md={6}>
            <ConfigLinkCard 
                title="Condiciones de Venta"
                description="Define los plazos de pago para las ventas, como Contado, 30 días, etc."
                to="/ventas/configuracion/condiciones-venta"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Categorías de Clientes"
                description="Clasifica a tus clientes (ej: Grande, Mediano, Consumidor Final) para aplicar distintas políticas."
                to="/ventas/configuracion/categorias-cliente"
               />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Listas de Precios"
                description="Crea y administra las diferentes listas de precios para tus productos y servicios."
                to="/ventas/configuracion/listas-precios"
               />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pestaña Geografía y Obras */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Tipos de Obra"
                description="Define los diferentes tipos de obra (ej: Edificio, Nave Industrial, Vivienda) para una mejor clasificación."
                to="/ventas/configuracion/tipos-obra"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Provincias"
                description="Administra las provincias para la correcta asignación geográfica de clientes y obras."
                to="/ventas/configuracion/provincias"
               />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Localidades"
                description="Gestiona las localidades y su asignación a una provincia."
                to="/ventas/configuracion/localidades"
               />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Zonas / Barrios"
                description="Define zonas o barrios dentro de las localidades para una segmentación más detallada."
                to="/ventas/configuracion/zonas"
               />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pestaña Facturación */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Alícuotas de IVA"
                description="Define los diferentes porcentajes de IVA aplicables en las facturas de venta."
                to="/ventas/configuracion/alicuotas-iva"
               />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Percepciones de Venta"
                description="Administra las percepciones impositivas (IIBB, IVA) que se aplican en las facturas."
                to="/ventas/configuracion/percepciones-venta"
               />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConfigLinkCard
                title="Talonarios / Puntos de Venta"
                description="Configura los puntos de venta (PV) y los tipos de comprobantes asociados (Factura A, B, Remito X, etc.)."
                to="/ventas/configuracion/talonarios"
               />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pestaña General */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Parámetros Generales</Typography>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={<Switch checked={config.requiereAprobacionCotizacion || false} onChange={(e) => handleConfigChange('requiereAprobacionCotizacion', e.target.checked)} />}
                  label="Requerir aprobación manual para Cotizaciones"
                  disabled={loading}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Si está activado, las cotizaciones nuevas requerirán una aprobación para convertirse en pedidos.
                </Typography>

                <FormControlLabel
                  control={<Switch checked={config.habilitarObras || false} onChange={(e) => handleConfigChange('habilitarObras', e.target.checked)} />}
                  label="Habilitar gestión de Obras/Destinos por cliente"
                  disabled={loading}
                />
                <Typography variant="body2" color="text.secondary">
                  Permite asignar múltiples direcciones de entrega (obras) a un mismo cliente.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Parámetros de Pedidos</Typography>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={<Switch checked={config.pedidoTieneVencimiento || false} onChange={(e) => handleConfigChange('pedidoTieneVencimiento', e.target.checked)} />}
                  label="Los pedidos tienen fecha de vencimiento"
                  disabled={loading}
                />
                {config.pedidoTieneVencimiento && (
                  <Box sx={{ pl: 4, mt: 1 }}>
                    <TextField
                      label="Días de validez del pedido"
                      type="number"
                      size="small"
                      value={config.diasVencimientoPedido || ''}
                      onChange={(e) => handleConfigChange('diasVencimientoPedido', parseInt(e.target.value, 10) || 0)}
                      sx={{ mb: 2 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={config.vencimientoEsFlexible || false} onChange={(e) => handleConfigChange('vencimientoEsFlexible', e.target.checked)} />}
                      label="Permitir extensión de vencimiento (flexible)"
                      disabled={loading}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Si es flexible, un usuario con permisos podrá aprobar pedidos vencidos.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* --- DIÁLOGO GENÉRICO PARA CRUD --- */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          {/* Aquí se podrían agregar otros formularios en el futuro */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ConfiguracionVentas;
