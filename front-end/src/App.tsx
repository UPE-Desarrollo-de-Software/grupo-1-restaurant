import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { MenuPage } from './pages/Menu'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/Login/Login'
import { RegisterPage } from './pages/Register/Register'
import { RequireAuth } from './components/RequireAuth'
import { LandingPage } from './pages/Landing/Landing'
import { CrearPlatoPage } from './pages/Gerente/Carta/Platos/CrearPlato'
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
import { CocinaPage } from './pages/Cocina/Cocina'
import { MozoPage } from './pages/Mozo/Mozo'
import { MozoReservasPage } from './pages/Mozo/MozoReservas'
import { PlatosHubPage } from './pages/Gerente/Carta/Platos/PlatosHub'
import { EditarPlatoPage } from './pages/Gerente/Carta/Platos/EditarPlato'
import { CategoriasPage } from './pages/Gerente/Carta/Categorias/CategoriasHub'
import { IngredientesHubPage } from './pages/Gerente/Carta/Ingredientes/IngredientesHub'
import { CrearIngredientePage } from './pages/Gerente/Carta/Ingredientes/CrearIngrediente'
import { EditarIngredientePage } from './pages/Gerente/Carta/Ingredientes/EditarIngredientes'
import { CrearCategoriaPage } from './pages/Gerente/Carta/Categorias/CrearCategoria'

function App() {

  return (
    <BrowserRouter>
      <Routes>
            <Route element={<MainLayout/>}>

              <Route path='/' element={<LandingPage/>}/>
              <Route path='/menu' element={<MenuPage/>}/>

              <Route element={<RequireAuth rolesPermitidos={['Gerente']}><Outlet/></RequireAuth>}>
                <Route path='/gerente' element={<DashboardPage/>}/>
                <Route path='/gerente/carta' element={<CartaHubPage/>}/>
                <Route path='/gerente/carta/platos' element={<PlatosHubPage/>}/>
                <Route path='/gerente/carta/platos/crear' element={<CrearPlatoPage/>}/>
                <Route path='/gerente/carta/platos/:id/editar' element={<EditarPlatoPage/>}/>
                <Route path='/gerente/carta/categorias' element={<CategoriasPage/>}/>
                <Route path='/gerente/carta/categorias/crear' element={<CrearCategoriaPage/>}/>
                <Route path='/gerente/carta/ingredientes' element={<IngredientesHubPage/>}/>
                <Route path='/gerente/carta/ingredientes/crear' element={<CrearIngredientePage/>}/>
                <Route path='/gerente/carta/ingredientes/:id/editar' element={<EditarIngredientePage/>}/>
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


              <Route element={<RequireAuth rolesPermitidos={['Cocina']}><Outlet/></RequireAuth>}>
                <Route path='/cocina' element={<CocinaPage/>}/>
              </Route>

              <Route element={<RequireAuth rolesPermitidos={['Mozo']}><Outlet/></RequireAuth>}>
                <Route path='/mozo' element={<MozoPage/>}/>
                <Route path='/mozo/reservas' element={<MozoReservasPage/>}/>
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
  )
}

export default App
