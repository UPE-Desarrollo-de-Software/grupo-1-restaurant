import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { MenuPage } from './pages/Menu'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/Login/Login'
import { RegisterPage } from './pages/Register/Register'
import { RequireAuth } from './components/RequireAuth'
import { LandingPage } from './pages/Landing/Landing'
import { ABMProductosPage } from './pages/ABMProductos/ABMProductos'
import { RolesProvider } from './context/RolesContext/RolesContext'
import { DashboardPage } from './pages/Gerente/Dashboard/Dashboard'
import { CartaHubPage } from './pages/Gerente/Carta/CartaHub'
import { DisponibilidadPage } from './pages/Gerente/Carta/Disponibilidad'
import { PromocionesPage } from './pages/Gerente/Carta/Promociones'
import { MesasHubPage } from './pages/Gerente/Mesas/MesasHub'
import { GestionMesasPage } from './pages/Gerente/Mesas/GestionMesas'
import { QrMesasPage } from './pages/Gerente/Mesas/QrMesas'
import { ComandasPage } from './pages/Gerente/Mesas/Comandas'
import { ReservasPage } from './pages/Gerente/Reservas/Reservas'
import { UsuariosPage } from './pages/Gerente/Usuarios/Usuarios'
import { HistorialAccionesPage } from './pages/Gerente/HistorialAcciones/HistorialAcciones'

function App() {

  return (
    <RolesProvider>
      <BrowserRouter>
        <Routes>
            <Route element={<MainLayout/>}>

              <Route path='/' element={<LandingPage/>}/>
              <Route path='/menu' element={<MenuPage/>}/>

              <Route element={<RequireAuth rolesPermitidos={['Gerente']}><Outlet/></RequireAuth>}>
                <Route path='/gerente' element={<DashboardPage/>}/>
                <Route path='/gerente/carta' element={<CartaHubPage/>}/>
                <Route path='/gerente/carta/productos' element={<ABMProductosPage/>}/>
                <Route path='/gerente/carta/disponibilidad' element={<DisponibilidadPage/>}/>
                <Route path='/gerente/carta/promociones' element={<PromocionesPage/>}/>
                <Route path='/gerente/mesas' element={<MesasHubPage/>}/>
                <Route path='/gerente/mesas/gestion' element={<GestionMesasPage/>}/>
                <Route path='/gerente/mesas/qr' element={<QrMesasPage/>}/>
                <Route path='/gerente/mesas/comandas' element={<ComandasPage/>}/>
                <Route path='/gerente/reservas' element={<ReservasPage/>}/>
                <Route path='/gerente/usuarios' element={<UsuariosPage/>}/>
                <Route path='/gerente/historial-acciones' element={<HistorialAccionesPage/>}/>
              </Route>


            </Route>
            <Route element={<AuthLayout/>}>

              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/register' element={
                <RequireAuth rolesPermitidos={['Gerente']}>
                  <RegisterPage/>
                </RequireAuth>
                }/>
            </Route>
        </Routes>
      </BrowserRouter>
    </RolesProvider>
  )
}

export default App
