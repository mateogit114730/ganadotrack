import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, INICIO_POR_ROL } from './context/AuthContext.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import { Cargando } from './components/Comunes.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

// Cada pantalla se descarga recién cuando se usa: el encargado, desde el celular,
// no descarga las pantallas del administrador (RNF03).
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Lotes = lazy(() => import('./pages/admin/Lotes.jsx'));
const LoteDetalle = lazy(() => import('./pages/admin/LoteDetalle.jsx'));
const Insumos = lazy(() => import('./pages/admin/Insumos.jsx'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios.jsx'));
const Configuracion = lazy(() => import('./pages/admin/Configuracion.jsx'));
const CargarAlimentacion = lazy(() => import('./pages/encargado/CargarAlimentacion.jsx'));
const Sanidad = lazy(() => import('./pages/veterinario/Sanidad.jsx'));
const Perfil = lazy(() => import('./pages/Perfil.jsx'));
const Raciones = lazy(() => import('./pages/veterinario/Raciones.jsx'));
const Protocolos = lazy(() => import('./pages/veterinario/Protocolos.jsx'));

function Inicio() {
  const { usuario } = useAuth();
  return <Navigate to={usuario ? INICIO_POR_ROL[usuario.rol] : '/login'} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/perfil" element={<Perfil />} />
              <Route element={<RutaProtegida roles={['ADMIN']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lotes" element={<Lotes />} />
                <Route path="/lotes/:id" element={<LoteDetalle />} />
                <Route path="/insumos" element={<Insumos />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Route>
              <Route element={<RutaProtegida roles={['ADMIN', 'ENCARGADO']} />}>
                <Route path="/alimentacion" element={<CargarAlimentacion />} />
              </Route>
              <Route element={<RutaProtegida roles={['ADMIN', 'VETERINARIO']} />}>
                <Route path="/sanidad" element={<Sanidad />} />
                <Route path="/raciones" element={<Raciones />} />
                <Route path="/protocolos" element={<Protocolos />} />
              </Route>
            </Route>
          </Route>
          <Route path="/" element={<Inicio />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
