import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Chip, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import PetsIcon from '@mui/icons-material/Pets';
import GrassIcon from '@mui/icons-material/Grass';
import InventoryIcon from '@mui/icons-material/Inventory2';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext.jsx';
import { ETIQUETAS } from '../utils/formato.js';

const ANCHO_MENU = 240;

// Opciones del menú según el rol (RF08).
const MENU = [
  { a: '/dashboard', texto: 'Dashboard', icono: <DashboardIcon />, roles: ['ADMIN'] },
  { a: '/lotes', texto: 'Lotes', icono: <PetsIcon />, roles: ['ADMIN'] },
  { a: '/alimentacion', texto: 'Cargar alimentación', icono: <GrassIcon />, roles: ['ADMIN', 'ENCARGADO'] },
  { a: '/insumos', texto: 'Insumos y stock', icono: <InventoryIcon />, roles: ['ADMIN'] },
  { a: '/sanidad', texto: 'Sanidad', icono: <VaccinesIcon />, roles: ['ADMIN', 'VETERINARIO'] },
  { a: '/usuarios', texto: 'Usuarios', icono: <PeopleIcon />, roles: ['ADMIN'] },
  { a: '/configuracion', texto: 'Configuración', icono: <SettingsIcon />, roles: ['ADMIN'] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const theme = useTheme();
  const escritorio = useMediaQuery(theme.breakpoints.up('md'));
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();

  const opciones = MENU.filter((m) => m.roles.includes(usuario.rol));
  // El encargado tiene una sola pantalla: no necesita menú lateral (RNF01).
  const conMenu = opciones.length > 1;

  const menu = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1 }}>
        <Box component="img" src="/logo.png" alt="" sx={{ width: 36, height: 36 }} />
        <Typography variant="h6" color="primary">GanadoTrack</Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {opciones.map((m) => (
          <ListItemButton
            key={m.a}
            component={NavLink}
            to={m.a}
            selected={pathname.startsWith(m.a)}
            onClick={() => setAbierto(false)}
          >
            <ListItemIcon>{m.icono}</ListItemIcon>
            <ListItemText primary={m.texto} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ ml: { md: conMenu ? `${ANCHO_MENU}px` : 0 }, width: { md: conMenu ? `calc(100% - ${ANCHO_MENU}px)` : '100%' } }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {conMenu && !escritorio && (
            <IconButton color="inherit" edge="start" onClick={() => setAbierto(true)} aria-label="Abrir menú">
              <MenuIcon />
            </IconButton>
          )}
          {!conMenu && <Box component="img" src="/logo.png" alt="" sx={{ width: 32, height: 32, bgcolor: 'white', borderRadius: '50%' }} />}
          <Typography variant="h6" sx={{ flex: 1 }} noWrap>
            {conMenu ? opciones.find((m) => pathname.startsWith(m.a))?.texto ?? 'GanadoTrack' : 'GanadoTrack'}
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{usuario.nombre}</Typography>
            <Chip size="small" label={ETIQUETAS.rol[usuario.rol]} sx={{ bgcolor: 'secondary.main', color: 'white' }} />
          </Box>
          <IconButton color="inherit" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {conMenu && (
        <Drawer
          variant={escritorio ? 'permanent' : 'temporary'}
          open={escritorio || abierto}
          onClose={() => setAbierto(false)}
          sx={{ width: { md: ANCHO_MENU }, flexShrink: 0, '& .MuiDrawer-paper': { width: ANCHO_MENU } }}
        >
          {menu}
        </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
