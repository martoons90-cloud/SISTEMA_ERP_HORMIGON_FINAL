import React, { useState, useEffect } from 'react';
import {
  AppBar, Box, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Menu, MenuItem, Tooltip, Avatar, Collapse
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Iconos de Phosphor Icons
import {
  ShoppingCart, Factory, Truck, Stack, Mountains,
  UserCircle, Buildings, User as UserIcon,
  Moon,
  Sun,
  GearSix,
  Gear,
  Calendar,
  CheckSquare,
  Path,
  Car,
  Scales,
  ChartBar,
  CaretDoubleRight,
  CaretDoubleLeft,
  CaretDown,
  CaretUp,
  Cube,
  Swap,
  Archive,
  ClipboardText,
  AddressBook,
  Wrench,
  SignOut,
  Package,
  ArrowUUpLeft,
  Receipt,
  Bank,
  ListChecks,
  ListDashes, // Icono para el nuevo submenú de ventas
  Book,
  Tag, // Icono para Ventas,
  Scroll,
  Flask,
  Copy
} from 'phosphor-react';

// Anchos de los menús
const mainDrawerWidth = 80;
const subDrawerExpandedWidth = 240;
const subDrawerCollapsedWidth = 80;

// Datos de los módulos y sus submenús
const modulesData = {
  compras: {
    icon: <ShoppingCart size={28} />,
    submenus: [
      { text: 'Órdenes de Compra', icon: <ClipboardText size={24} />, path: '/compras/ordenes' },
      { text: 'Remitos de Ingreso', icon: <Package size={24} />, path: '/compras/remitos' },
      { text: 'Devoluciones', icon: <ArrowUUpLeft size={24} />, path: '/compras/devoluciones' },
      { text: 'Facturas de Compra', icon: <Receipt size={24} />, path: '/compras/facturas' },
      { text: 'Proveedores', icon: <AddressBook size={24} />, path: '/compras/proveedores' },
      { text: 'Configuración', icon: <Wrench size={24} />, path: '/compras/configuracion' },
    ],
  },
  ventas: {
    icon: <Tag size={28} />,
    submenus: [
      { text: 'Cotizaciones', icon: <ListDashes size={24} />, path: '/ventas/cotizaciones' },
      { text: 'Pedidos', icon: <ClipboardText size={24} />, path: '/ventas/pedidos' },
      { text: 'Clientes', icon: <AddressBook size={24} />, path: '/ventas/clientes' },
      { text: 'Facturas de Venta', icon: <Receipt size={24} />, path: '/ventas/facturas' },
      { text: 'Configuración', icon: <Wrench size={24} />, path: '/ventas/configuracion' }, // Ahora apunta a la nueva página
    ],
  },
  tesoreria: {
    icon: <Bank size={28} />,
    submenus: [
      { text: 'Órdenes de Pago', icon: <ListChecks size={24} />, path: '/tesoreria/pagos' },
    ],
  },
  produccion: {
    icon: <Factory size={28} />,
    submenus: [
      // { text: 'Órdenes', icon: <Gear size={24} />, path: '/produccion/ordenes' }, // RUTA PROBLEMÁTICA COMENTADA
      { text: 'Fórmulas', icon: <Book size={24} />, path: '/produccion/formulas' },
      { text: 'Remitos de Entrega', icon: <Truck size={24} weight="fill" />, path: '/produccion/remitos' },
      { text: 'Despachos', icon: <Truck size={24} />, path: '/produccion/despachos' },
      { text: 'Plan Maestro', icon: <Calendar size={24} />, path: '/produccion/plan' },
      { text: 'Calidad', icon: <CheckSquare size={24} />, path: '/produccion/calidad' },
    ],
  },
  logistica: {
    icon: <Truck size={28} />,
    submenus: [
      { text: 'Programación', icon: <Calendar size={24} />, path: '/logistica/programacion' },
      { text: 'Rutas', icon: <Path size={24} />, path: '/logistica/rutas' },
      { text: 'Configuración', icon: <Wrench size={24} />, path: '/logistica/configuracion' },
      { isDivider: true, text: 'divider1' },
      { 
        text: 'Altas', 
        icon: <Package size={24} />,
        children: [
          { text: 'Plantas', icon: <Buildings size={24} />, path: '/logistica/plantas' },
          { text: 'Choferes', icon: <UserIcon size={24} />, path: '/logistica/choferes' },
          { text: 'Camiones', icon: <Truck size={24} />, path: '/logistica/camiones' },
          { text: 'Bombas', icon: <Car size={24} />, path: '/logistica/bombas' },
          { text: 'Talonarios Remitos', icon: <Scroll size={24} />, path: '/logistica/talonarios-remitos' },
        ]
      },
    ],
  },
  stock: {
    icon: <Stack size={28} />,
    submenus: [
      { text: 'Artículos', icon: <Cube size={24} />, path: '/stock/articulos' },
      { text: 'Variantes', icon: <Copy size={24} />, path: '/stock/variantes' },
      { text: 'Depósitos', icon: <Archive size={24} />, path: '/stock/depositos' },
      { text: 'Movimientos', icon: <Swap size={24} />, path: '/stock/movimientos' },
      { text: 'Configuración', icon: <GearSix size={24} />, path: '/stock/configuracion' },
    ],
  },
  aridos: {
    icon: <Mountains size={28} />,
    submenus: [
      { text: 'Cantera', icon: <Mountains size={24} />, path: '/aridos/cantera' },
      { text: 'Báscula', icon: <Scales size={24} />, path: '/aridos/bascula' },
      { text: 'Reportes', icon: <ChartBar size={24} />, path: '/aridos/reportes' },
    ],
  },
  laboratorio: {
    icon: <Flask size={28} />,
    submenus: [
      { text: 'Registro de Probetas', icon: <Package size={24} />, path: '/laboratorio/probetas' },
      { text: 'Agenda de Ensayos', icon: <Calendar size={24} />, path: '/laboratorio/ensayos' },
      { text: 'Informes de Calidad', icon: <ChartBar size={24} />, path: '/laboratorio/informes' },
    ],
  },
  mantenimiento: {
    icon: <Wrench size={28} />,
    submenus: [
      { text: 'Órdenes de Trabajo', icon: <ClipboardText size={24} />, path: '/mantenimiento/ordenes' },
      { text: 'Planes Preventivos', icon: <Calendar size={24} />, path: '/mantenimiento/planes' },
      { text: 'Activos y Equipos', icon: <Car size={24} />, path: '/mantenimiento/activos' },
    ],
  },
};

export default function Layout({ toggleTheme, currentMode }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState('compras');
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [altasOpen, setAltasOpen] = useState(false);

  // Estados y manejadores para el menú de usuario
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email.split('@')[0]);
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/perfil');
    handleClose();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleClose();
    // El listener en App.jsx se encargará de la redirección
  };

  const handleModuleClick = (moduleKey) => {
    setSelectedModule(moduleKey);
  };

  const handleSubmenuToggle = () => {
    setSubmenuOpen(!submenuOpen);
    // Si cerramos el menú principal, también cerramos los submenús desplegables
    if (submenuOpen) {
      setAltasOpen(false);
    }
  };

  const currentSubDrawerWidth = submenuOpen ? subDrawerExpandedWidth : subDrawerCollapsedWidth;

  const mainDrawer = (
    <div>
      <Toolbar />
      <List>
        {Object.keys(modulesData).map((key) => (
          <ListItem key={key} disablePadding>
            <ListItemButton
              selected={selectedModule === key}
              onClick={() => handleModuleClick(key)}
              sx={{
                justifyContent: 'center',
                p: 2.5,
                borderLeft: '4px solid transparent',
                transition: 'border-color 0.2s, background-color 0.2s',
                ...(selectedModule === key && {
                  borderLeftColor: 'primary.main',
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                }),
                ...(selectedModule !== key && {
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                  },
                }),
              }}
            >
              <ListItemIcon sx={{
                minWidth: 0,
                color: selectedModule === key ? 'primary.main' : 'inherit',
                transition: 'color 0.2s',
              }}>
                {modulesData[key].icon}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  const subDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <List sx={{ p: 1, overflow: 'hidden' }}>
        <ListItem sx={{ mb: 1, pl: submenuOpen ? 2 : 'inherit', justifyContent: submenuOpen ? 'flex-start' : 'center' }}>
          <ListItemText 
            primary={selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} 
            primaryTypographyProps={{ 
              variant: 'h6', 
              fontWeight: 'bold',
              sx: { 
                whiteSpace: 'nowrap',
                display: submenuOpen ? 'block' : 'none',
              }
            }} 
          />
        </ListItem>
        {modulesData[selectedModule].submenus.map((item) => {
          if (item.isDivider) {
            return <Divider key={item.text} sx={{ my: 1 }} />;
          }

          if (item.children) {
            return (
              <React.Fragment key={item.text}>
                <ListItemButton 
                  onClick={() => setAltasOpen(!altasOpen)}
                  sx={{ 
                    borderRadius: 2,
                    minHeight: 48,
                    justifyContent: submenuOpen ? 'initial' : 'center',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: submenuOpen ? 3 : 'auto', justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ display: submenuOpen ? 'block' : 'none' }} />
                  {submenuOpen && (altasOpen ? <CaretUp /> : <CaretDown />)}
                </ListItemButton>
                <Collapse in={altasOpen && submenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    {item.children.map((child) => (
                      <ListItemButton 
                        key={child.text} 
                        sx={{ pl: 2.5, borderRadius: 2 }} 
                        component={Link} 
                        to={child.path} 
                        selected={location.pathname === child.path}
                      >
                        <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText primary={child.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton component={Link} to={item.path} selected={location.pathname === item.path} sx={{ borderRadius: 2, minHeight: 48, justifyContent: submenuOpen ? 'initial' : 'center', px: 2.5 }}>
                <ListItemIcon sx={{ minWidth: 0, mr: submenuOpen ? 3 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ display: submenuOpen ? 'block' : 'none' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSubmenuToggle} sx={{ justifyContent: 'center', p: 2 }}>
            <ListItemIcon sx={{ minWidth: 0 }}>
              {submenuOpen ? <CaretDoubleLeft size={24} /> : <CaretDoubleRight size={24} />}
            </ListItemIcon>
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        elevation={0}
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            HormiApp ERP
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {currentMode === 'dark' ? <Sun /> : <Moon />}
          </IconButton>

          <Typography sx={{ ml: 2, mr: 1 }}>Hola, {userName}</Typography>
          <Tooltip title="Cuenta de usuario">
            <IconButton
              onClick={handleMenu}
              color="inherit"
            >
              <UserCircle size={28} />
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="caption">{userEmail}</Typography>
            </MenuItem>
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <UserCircle size={20} />
              </ListItemIcon>
              Mi Perfil
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <SignOut size={20} />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: mainDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: mainDrawerWidth, 
            boxSizing: 'border-box', 
            borderRight: 0 
          },
        }}
      >
        {mainDrawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          width: currentSubDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: currentSubDrawerWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: `${mainDrawerWidth}px`,
          },
        }}
      >
        {subDrawer}
      </Drawer>

      <Box
        component="main"
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
