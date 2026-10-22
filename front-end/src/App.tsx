import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { ClienteProvider } from './context/ClienteContext/ClienteProvider'
import { CartaPage } from './pages/Carta'
import { MesaPage } from './pages/Cliente/MesaPage'
import { DetallePlatoPage } from './pages/Cliente/DetallePlatoPage'
import { PedidoPage } from './pages/Cliente/PedidoPage'
import { ReservasClientePage } from './pages/Cliente/ReservasClientePage'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/Login/Login'
import { RequireAuth } from './components/RequireAuth'
import { LandingPage } from './pages/Landing/Landing'
import { CrearPlatoPage } from './pages/Gerente/Carta/Platos/CrearPlato'
import { DashboardPage } from './pages/Gerente/Dashboard/Dashboard'
import { CartaHubPage } from './pages/Gerente/Carta/CartaHub'
import { PromocionesHubPage } from './pages/Gerente/Carta/Promociones/PromocionesHub'
import { CrearPromocionPage } from './pages/Gerente/Carta/Promociones/CrearPromocion'
import { EditarPromocionPage } from './pages/Gerente/Carta/Promociones/EditarPromocion'
import { MesasHubPage } from './pages/Gerente/Mesas/MesasHub'
import { GestionMesasPage } from './pages/Gerente/Mesas/GestionMesas'
import { CrearMesaPage } from './pages/Gerente/Mesas/CrearMesa'
import { EditarMesaPage } from './pages/Gerente/Mesas/EditarMesa'
import { QrMesasPage } from './pages/Gerente/Mesas/QRMesas/QrMesas'
import { ComandasPage } from './pages/Gerente/Mesas/Comandas/Comandas'
import { ReservasHubPage } from './pages/Gerente/Reservas/ReservasHub'
import { CrearReservaPage } from './pages/Gerente/Reservas/CrearReserva'
import { EditarReservaPage } from './pages/Gerente/Reservas/EditarReserva'
import { UsuariosHubPage } from './pages/Gerente/Usuarios/UsuariosHub'
import { CrearUsuarioPage } from './pages/Gerente/Usuarios/CrearUsuario'
import { EditarUsuarioPage } from './pages/Gerente/Usuarios/EditarUsuario'
import { CocinaPage } from './pages/Cocina/Cocina'
import { MozoPage } from './pages/Mozo/Mozo'
import { MozoMesaPage } from './pages/Mozo/MozoMesa'
import { PlatosHubPage } from './pages/Gerente/Carta/Platos/PlatosHub'
import { EditarPlatoPage } from './pages/Gerente/Carta/Platos/EditarPlato'
import { CategoriasPage } from './pages/Gerente/Carta/Categorias/CategoriasHub'
import { IngredientesHubPage } from './pages/Gerente/Carta/Ingredientes/IngredientesHub'
import { CrearIngredientePage } from './pages/Gerente/Carta/Ingredientes/CrearIngrediente'
import { EditarIngredientePage } from './pages/Gerente/Carta/Ingredientes/EditarIngredientes'
import { CrearCategoriaPage } from './pages/Gerente/Carta/Categorias/CrearCategoria'
import { EditarCategoriaPage } from './pages/Gerente/Carta/Categorias/EditarCategoria'

function App() {

  return (
    <BrowserRouter>
      <ClienteProvider>
      <Routes>
            <Route element={<MainLayout/>}>

              <Route path='/' element={<LandingPage/>}/>
              <Route path='/carta' element={<CartaPage/>}/>
              {/* Alias: reparan el fallback roto de RequireAuth/Login ('/menu'). */}
              <Route path='/menu' element={<Navigate to='/carta' replace/>}/>
              <Route path='/plato/:id' element={<DetallePlatoPage/>}/>
              <Route path='/pedido' element={<PedidoPage/>}/>
              <Route path='/reservas' element={<ReservasClientePage/>}/>
              <Route path='/mesa' element={<MesaPage/>}/>

              <Route element={<RequireAuth rolesPermitidos={['Gerente']}><Outlet/></RequireAuth>}>
                <Route path='/gerente' element={<DashboardPage/>}/>
                <Route path='/gerente/carta' element={<CartaHubPage/>}/>
                <Route path='/gerente/carta/platos' element={<PlatosHubPage/>}/>
                <Route path='/gerente/carta/platos/crear' element={<CrearPlatoPage/>}/>
                <Route path='/gerente/carta/platos/:id/editar' element={<EditarPlatoPage/>}/>
                <Route path='/gerente/carta/categorias' element={<CategoriasPage/>}/>
                <Route path='/gerente/carta/categorias/crear' element={<CrearCategoriaPage/>}/>
                <Route path='/gerente/carta/categorias/:id/editar' element={<EditarCategoriaPage/>}/>
                <Route path='/gerente/carta/ingredientes' element={<IngredientesHubPage/>}/>
                <Route path='/gerente/carta/ingredientes/crear' element={<CrearIngredientePage/>}/>
                <Route path='/gerente/carta/ingredientes/:id/editar' element={<EditarIngredientePage/>}/>
                <Route path='/gerente/carta/promociones' element={<PromocionesHubPage/>}/>
                <Route path='/gerente/carta/promociones/crear' element={<CrearPromocionPage/>}/>
                <Route path='/gerente/carta/promociones/:id/editar' element={<EditarPromocionPage/>}/>
                <Route path='/gerente/mesas' element={<MesasHubPage/>}/>
                <Route path='/gerente/mesas/gestion' element={<GestionMesasPage/>}/>
                <Route path='/gerente/mesas/gestion/crear' element={<CrearMesaPage/>}/>
                <Route path='/gerente/mesas/gestion/:id/editar' element={<EditarMesaPage/>}/>
                <Route path='/gerente/mesas/qr' element={<QrMesasPage/>}/>
                <Route path='/gerente/mesas/comandas' element={<ComandasPage/>}/>
                <Route path='/gerente/reservas' element={<ReservasHubPage/>}/>
                <Route path='/gerente/reservas/crear' element={<CrearReservaPage/>}/>
                <Route path='/gerente/reservas/:id/editar' element={<EditarReservaPage/>}/>
                <Route path='/gerente/usuarios' element={<UsuariosHubPage/>}/>
                <Route path='/gerente/usuarios/crear' element={<CrearUsuarioPage/>}/>
                <Route path='/gerente/usuarios/:id/editar' element={<EditarUsuarioPage/>}/>
              </Route>


              <Route element={<RequireAuth rolesPermitidos={['Cocina']}><Outlet/></RequireAuth>}>
                <Route path='/cocina' element={<CocinaPage/>}/>
              </Route>

              <Route element={<RequireAuth rolesPermitidos={['Mozo']}><Outlet/></RequireAuth>}>
                <Route path='/mozo' element={<MozoPage/>}/>
                <Route path='/mozo/mesas/crear' element={<CrearMesaPage baseVuelta='/mozo' soloSesion/>}/>
                <Route path='/mozo/mesas/:id' element={<MozoMesaPage/>}/>
                <Route path='/mozo/reservas' element={<ReservasHubPage/>}/>
                <Route path='/mozo/reservas/crear' element={<CrearReservaPage/>}/>
                <Route path='/mozo/reservas/:id/editar' element={<EditarReservaPage/>}/>
              </Route>


            </Route>
            <Route element={<AuthLayout/>}>

              <Route path='/login' element={<LoginPage/>}/>
            </Route>
        </Routes>
      </ClienteProvider>
      </BrowserRouter>
  )
}

export default App
