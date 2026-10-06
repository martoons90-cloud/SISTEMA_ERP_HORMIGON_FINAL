import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Breadcrumbs, Link,
  CircularProgress, InputAdornment, Checkbox, Tabs, Tab,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import { FloppyDisk, ChartLineUp, ClockCounterClockwise, ArrowLeft } from 'phosphor-react';
import { useSnackbar } from 'notistack';
import { supabase } from '../../supabaseClient';

const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$ 0.00';
    return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

const DetalleListaPrecios = () => {
    const { listaId } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabValue, setTabValue] = useState('selection');

    const [listaInfo, setListaInfo] = useState(null);
    const [items, setItems] = useState([]);
    const [allArticulos, setAllArticulos] = useState([]);

    // State for selection tab
    const [selectedArticuloIds, setSelectedArticuloIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // State for pricing tab
    const [priceUpdates, setPriceUpdates] = useState({});

    // State for bulk update
    const [updatePercentage, setUpdatePercentage] = useState('');
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [updateAmount, setUpdateAmount] = useState('');
    const [updateAmountDialogOpen, setUpdateAmountDialogOpen] = useState(false);

    // State for history tab
    const [priceHistory, setPriceHistory] = useState([]);

    const fetchData = useCallback(async () => {
        if (!listaId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const listaRes = await supabase.from('ven_listas_precios').select('*').eq('id', listaId).single();
            if (listaRes.error) throw new Error(`Error en ven_listas_precios: ${listaRes.error.message}`);
            setListaInfo(listaRes.data);

            const itemsRes = await supabase.from('ven_listas_precios_detalle').select('*, articulo:stk_articulos(*)').eq('lista_id', listaId).order('id');
            if (itemsRes.error) throw new Error(`Error en ven_listas_precios_detalle: ${itemsRes.error.message}`);
            setItems(itemsRes.data || []);
            setSelectedArticuloIds(new Set((itemsRes.data || []).map(item => item.articulo_id)));

            const articulosRes = await supabase.from('stk_articulos').select('*').order('name').order('variant_name');
            if (articulosRes.error) throw new Error(`Error en stk_articulos: ${articulosRes.error.message}`);
            setAllArticulos(articulosRes.data || []);

            const historyRes = await supabase.from('ven_listas_precios_historial').select('*, articulo:stk_articulos(code, name, variant_name), usuario:user_profiles(full_name)').eq('lista_precio_id', listaId).order('created_at', { ascending: false }).limit(100);
            if (historyRes.error) throw new Error(`Error en ven_listas_precios_historial: ${historyRes.error.message}`);
            setPriceHistory(historyRes.data || []);

        } catch (error) {
            enqueueSnackbar(`Error cargando datos: ${error.message}`, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [listaId, enqueueSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleSelection = (articuloId) => {
        setSelectedArticuloIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(articuloId)) {
                newSet.delete(articuloId);
            } else {
                newSet.add(articuloId);
            }
            return newSet;
        });
    };

    const handleSaveSelection = async () => {
        setSaving(true);
        if (!listaId) {
            enqueueSnackbar('Error: No se pudo identificar la lista de precios. Recargue la página.', { variant: 'error' });
            setSaving(false);
            return;
        }
        try {
            const { error } = await supabase.rpc('sync_price_list_items', { 
                p_lista_id: Number(listaId), 
                p_articulo_ids: Array.from(selectedArticuloIds) 
            });
            if (error) throw error;

            await fetchData(); // Recargar todos los datos
            enqueueSnackbar('Selección de artículos guardada con éxito.', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(`Error al guardar la selección: ${error.message}`, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePriceChange = (itemId, newPrice) => {
        setPriceUpdates(prev => ({ ...prev, [itemId]: newPrice }));
    };

    const handleSavePrices = async () => {
        setSaving(true);
        const updates = Object.entries(priceUpdates).map(([itemId, price]) => ({
            id: parseInt(itemId),
            precio: parseFloat(price) || 0
        }));

        if (updates.length === 0) {
            enqueueSnackbar('No hay cambios en los precios para guardar.', { variant: 'info' });
            setSaving(false);
            return;
        }

        try {
            const { error } = await supabase.rpc('update_multiple_prices', {
                updates: updates
            });
            if (error) throw error;

            await fetchData(); // Recargar todos los datos
            setPriceUpdates({});
            enqueueSnackbar('Precios guardados correctamente.', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(`Error al guardar precios: ${error.message}`, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleOpenUpdateAmountDialog = () => {
        if (!updateAmount || parseFloat(updateAmount) === 0) {
            enqueueSnackbar('Por favor, ingrese un monto válido y distinto de cero.', { variant: 'warning' });
            return;
        }
        setUpdateAmountDialogOpen(true);
    };

    const handleCloseUpdateAmountDialog = () => {
        setUpdateAmountDialogOpen(false);
    };

    const handleConfirmUpdateAmount = async () => {
        if (!listaId) {
            enqueueSnackbar('Error: No se pudo identificar la lista de precios. Recargue la página.', { variant: 'error' });
            return;
        }
        try {
            const amount = parseFloat(updateAmount);
            if (isNaN(amount)) {
                throw new Error('Monto no válido.');
            }

            const { error } = await supabase.rpc('update_prices_by_fixed_amount', {
                p_amount: amount,
                p_lista_id: Number(listaId)
            });

            if (error) throw error;

            await fetchData(); // Recargar todos los datos
            setPriceUpdates({});
            enqueueSnackbar(`Precios actualizados con un ajuste de ${formatCurrency(amount)}.`, { variant: 'success' });
            setUpdateAmount('');
            handleCloseUpdateAmountDialog();
        } catch (error) {
            enqueueSnackbar(`Error al actualizar precios: ${error.message}`, { variant: 'error' });
        }
    };

    const handleOpenUpdateDialog = () => {
        if (!updatePercentage || parseFloat(updatePercentage) === 0) {
            enqueueSnackbar('Por favor, ingrese un porcentaje válido y distinto de cero.', { variant: 'warning' });
            return;
        }
        setUpdateDialogOpen(true);
    };

    const handleCloseUpdateDialog = () => {
        setUpdateDialogOpen(false);
    };

    const handleConfirmUpdate = async () => {
        if (!listaId) {
            enqueueSnackbar('Error: No se pudo identificar la lista de precios. Recargue la página.', { variant: 'error' });
            return;
        }
        try {
            const percentage = parseFloat(updatePercentage);
            if (isNaN(percentage)) {
                throw new Error('Porcentaje no válido.');
            }

            const { error } = await supabase.rpc('update_prices_by_percentage', {
                p_lista_id: Number(listaId),
                p_percentage: percentage
            });

            if (error) throw error;

            await fetchData(); // Recargar todos los datos
            setPriceUpdates({});
            enqueueSnackbar(`Precios actualizados con un ${percentage > 0 ? 'aumento' : 'descuento'} del ${Math.abs(percentage)}%.`, { variant: 'success' });
            setUpdatePercentage('');
            handleCloseUpdateDialog();
        } catch (error) {
            enqueueSnackbar(`Error al actualizar precios: ${error.message}`, { variant: 'error' });
        }
    };

    const filteredArticulos = allArticulos.filter(articulo => {
        const matchesSearch = !searchTerm ||
            (articulo.name && articulo.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (articulo.code && articulo.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (articulo.variant_name && articulo.variant_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link component={RouterLink} underline="hover" color="inherit" to="/ventas/listas-precios">
                    Listas de Precios
                </Link>
                <Typography color="text.primary">{listaInfo?.nombre || 'Cargando...'}</Typography>
            </Breadcrumbs>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom>{listaInfo?.nombre}</Typography>
                <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/ventas/listas-precios')}>
                    Volver
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} aria-label="management tabs">
                    <Tab label="Seleccionar Artículos" value="selection" />
                    <Tab label="Gestionar Precios" value="pricing" />
                    <Tab icon={<ClockCounterClockwise size={18} />} iconPosition="start" label="Historial" value="history" />
                </Tabs>
            </Box>

            {tabValue === 'selection' && (
                <Paper sx={{ p: 2 }}>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Buscar por código o nombre"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    <TableContainer sx={{ maxHeight: '60vh' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox"><Checkbox disabled /></TableCell>
                                    <TableCell>Código</TableCell>
                                    <TableCell>Nombre</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredArticulos.length > 0 ? (
                                    filteredArticulos.map(articulo => (
                                        <TableRow key={articulo.id} hover onClick={() => handleToggleSelection(articulo.id)} sx={{ cursor: 'pointer' }}>
                                            <TableCell padding="checkbox">
                                                <Checkbox checked={selectedArticuloIds.has(articulo.id)} />
                                            </TableCell>
                                            <TableCell>{articulo.code}</TableCell>
                                            <TableCell>
                                                {`${articulo.name}${articulo.variant_name ? ` - ${articulo.variant_name}` : ''}`}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">No se encontraron artículos para agregar.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSaveSelection} disabled={saving}>
                            {saving ? 'Guardando...' : `Guardar Selección (${selectedArticuloIds.size} artículos)`}
                        </Button>
                    </Box>
                </Paper>
            )}

            {tabValue === 'pricing' && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Precios de los {items.length} artículos seleccionados</Typography>
                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle1" sx={{ mb: 2 }}>Actualización Masiva</Typography>
                    <Grid container spacing={2} alignItems="center" justifyContent="flex-start">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ajustar en %" type="number" fullWidth size="small" placeholder='Ej: 5 o -10'
                                value={updatePercentage} onChange={(e) => setUpdatePercentage(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button variant="outlined" startIcon={<ChartLineUp />} onClick={handleOpenUpdateDialog} fullWidth>
                                Ajuste Porcentual
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ajustar en $" type="number" fullWidth size="small" placeholder='Ej: 150 o -50'
                                value={updateAmount} onChange={(e) => setUpdateAmount(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button variant="outlined" startIcon={<ChartLineUp />} onClick={handleOpenUpdateAmountDialog} fullWidth>
                                Ajuste Fijo
                            </Button>
                        </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <TableContainer sx={{ maxHeight: '60vh' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Código</TableCell>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell align="right">Precio de Lista</TableCell>
                                    <TableCell align="right" sx={{ width: '200px' }}>Precio Especial</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.articulo.code}</TableCell>
                                        <TableCell>
                                            {`${item.articulo.name}${item.articulo.variant_name ? ` - ${item.articulo.variant_name}` : ''}`}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {formatCurrency(item.articulo.precio_lista)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                value={priceUpdates[item.id] ?? item.precio}
                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                }}
                                                sx={{ input: { textAlign: "right" } }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" startIcon={<FloppyDisk />} onClick={handleSavePrices} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Precios'}
                        </Button>
                    </Box>
                </Paper>
            )}

            {tabValue === 'history' && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Historial de Cambios de Precios</Typography>
                    <TableContainer sx={{ maxHeight: '70vh' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Artículo</TableCell>
                                    <TableCell align="right">Precio Anterior</TableCell>
                                    <TableCell align="right">Precio Nuevo</TableCell>
                                    <TableCell align="center">Cambio</TableCell>
                                    <TableCell>Usuario</TableCell>
                                    <TableCell>Método</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {priceHistory.map((h) => {
                                    const change = h.precio_nuevo - h.precio_anterior;
                                    const changePercent = h.precio_anterior !== 0 ? (change / h.precio_anterior) * 100 : 0;
                                    return (
                                        <TableRow key={h.id} hover>
                                            <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                {h.articulo ? `${h.articulo.name}${h.articulo.variant_name ? ` - ${h.articulo.variant_name}` : ''}` : 'Artículo no disponible'}
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(h.precio_anterior)}</TableCell>
                                            <TableCell align="right"><b>{formatCurrency(h.precio_nuevo)}</b></TableCell>
                                            <TableCell align="center">
                                                <Typography variant="caption" color={change >= 0 ? 'success.main' : 'error.main'}>
                                                    {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(1)}%)
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{h.usuario?.full_name || 'Sistema'}</TableCell>
                                            <TableCell><Chip label={h.metodo_actualizacion} size="small" /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Dialog open={updateDialogOpen} onClose={handleCloseUpdateDialog}>
                <DialogTitle>Confirmar Actualización Masiva</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Está seguro de que desea ajustar **todos** los precios de esta lista en un
                        <strong> {updatePercentage}%</strong>?
                    </Typography>
                    <Typography color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUpdateDialog}>Cancelar</Button>
                    <Button onClick={handleConfirmUpdate} variant="contained" color="primary">Confirmar y Aplicar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={updateAmountDialogOpen} onClose={handleCloseUpdateAmountDialog}>
                <DialogTitle>Confirmar Actualización Masiva</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Está seguro de que desea ajustar **todos** los precios de esta lista en
                        <strong> {formatCurrency(parseFloat(updateAmount || 0))}</strong>?
                    </Typography>
                    <Typography color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUpdateAmountDialog}>Cancelar</Button>
                    <Button onClick={handleConfirmUpdateAmount} variant="contained" color="primary">Confirmar y Aplicar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DetalleListaPrecios;
