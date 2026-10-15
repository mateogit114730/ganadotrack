import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import PetsIcon from '@mui/icons-material/Pets';
import GrassIcon from '@mui/icons-material/Grass';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import VaccinesIcon from '@mui/icons-material/VaccinesOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { useAuth } from '../context/AuthContext.jsx';
import { ETIQUETAS } from '../utils/formato.js';
import { COLORES } from '../theme.js';
import { FranjaPasto } from './ilustraciones/index.jsx';

const ANCHO_MENU = 248;

// Opciones del menú según el rol (RF08).
export const MENU = [
  { a: '/dashboard', texto: 'Inicio', icono: <DashboardIcon />, roles: ['ADMIN'] },
  { a: '/lotes', texto: 'Lotes', icono: <PetsIcon />, roles: ['ADMIN'] },
  { a: '/alimentacion', texto: 'Alimentación', icono: <GrassIcon />, roles: ['ADMIN', 'ENCARGADO'] },
  { a: '/insumos', texto: 'Insumos y stock', icono: <InventoryIcon />, roles: ['ADMIN'] },
  { a: '/sanidad', texto: 'Sanidad', icono: <VaccinesIcon />, roles: ['ADMIN', 'VETERINARIO'] },
  { a: '/usuarios', texto: 'Usuarios', icono: <PeopleIcon />, roles: ['ADMIN'] },
  { a: '/configuracion', texto: 'Configuración', icono: <SettingsIcon />, roles: ['ADMIN'] },
];

function saludo() {
  const hora = new Date().getHours();
  if (hora < 13) return 'Buen día';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaLarga() {
  const texto = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Iniciales a partir de las palabras del nombre (ignora paréntesis y signos). */
const iniciales = (nombre) =>
  (nombre.match(/\p{L}+/gu) ?? ['?']).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

function Isotipo({ tam = 40 }) {
  return (
    <Box
      component="img"
      src="/isotipo-192.png"
      alt=""
      sx={{ width: tam, height: tam, borderRadius: '50%', bgcolor: '#fff', p: 0.25, flexShrink: 0 }}
    />
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const theme = useTheme();
  const navegar = useNavigate();
  const escritorio = useMediaQuery(theme.breakpoints.up('md'));
  const [abierto, setAbierto] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(null);
  const { pathname } = useLocation();

  const opciones = MENU.filter((m) => m.roles.includes(usuario.rol));
  // El encargado tiene una sola pantalla: no necesita menú lateral (RNF01).
  const conMenu = opciones.length > 1;
  const primerNombre = usuario.nombre.split(' ')[0];

  const menu = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: COLORES.bosque, color: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.5 }}>
        <Isotipo tam={46} />
        <Box>
          <Typography sx={{ fontFamily: '"Bitter", serif', fontWeight: 700, fontSize: 21, lineHeight: 1 }}>
            ganado<Box component="span" sx={{ color: COLORES.hoja }}>track</Box>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>Gestión de feedlot</Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: alpha('#fff', 0.15) }} />
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {opciones.map((m) => {
          const activo = pathname.startsWith(m.a);
          return (
            <ListItemButton
              key={m.a}
              component={NavLink}
              to={m.a}
              onClick={() => setAbierto(false)}
              sx={{
                borderRadius: 2.5, mb: 0.5, color: '#fff',
                bgcolor: activo ? alpha(COLORES.hoja, 0.35) : 'transparent',
                '&:hover': { bgcolor: alpha(COLORES.hoja, activo ? 0.45 : 0.18) },
              }}
            >
              <ListItemIcon sx={{ color: activo ? '#fff' : alpha('#fff', 0.8), minWidth: 40 }}>{m.icono}</ListItemIcon>
              <ListItemText primary={m.texto} slotProps={{ primary: { sx: { fontWeight: activo ? 800 : 600 } } }} />
            </ListItemButton>
          );
        })}
      </List>
      <FranjaPasto sx={{ width: '100%', height: 40, display: 'block' }} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ml: { md: conMenu ? `${ANCHO_MENU}px` : 0 },
          width: { md: conMenu ? `calc(100% - ${ANCHO_MENU}px)` : '100%' },
          bgcolor: alpha(COLORES.paja, 0.92),
          backdropFilter: 'blur(6px)',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          {conMenu && !escritorio && (
            <IconButton edge="start" onClick={() => setAbierto(true)} aria-label="Abrir menú">
              <MenuIcon />
            </IconButton>
          )}
          {!conMenu && <Isotipo tam={36} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"Bitter", serif', fontWeight: 700, fontSize: { xs: 17, sm: 19 } }} noWrap>
              {saludo()}, {primerNombre}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {fechaLarga()}
            </Typography>
          </Box>
          <IconButton onClick={(e) => setMenuUsuario(e.currentTarget)} aria-label="Menú de usuario" sx={{ p: 0.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: 15, fontWeight: 700 }}>
              {iniciales(usuario.nombre)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={menuUsuario} open={Boolean(menuUsuario)} onClose={() => setMenuUsuario(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{usuario.nombre}</Typography>
              <Typography variant="caption" color="text.secondary">{ETIQUETAS.rol[usuario.rol]}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setMenuUsuario(null); navegar('/perfil'); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>Mi perfil
            </MenuItem>
            <MenuItem onClick={logout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {conMenu && (
        <Drawer
          variant={escritorio ? 'permanent' : 'temporary'}
          open={escritorio || abierto}
          onClose={() => setAbierto(false)}
          sx={{ width: { md: ANCHO_MENU }, flexShrink: 0, '& .MuiDrawer-paper': { width: ANCHO_MENU, border: 0 } }}
        >
          {menu}
        </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3.5 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
