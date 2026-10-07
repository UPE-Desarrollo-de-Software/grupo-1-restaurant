import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MenuPage } from './pages/Menu'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/Login/Login'
import { RegisterPage } from './pages/Register/Register'
import { RequireAuth } from './components/RequireAuth'
import { LandingPage } from './pages/Landing/Landing'
import { ABMProductosPage } from './pages/ABMProductos/ABMProductos'
import { RolesProvider } from './context/RolesContext/RolesContext'

function App() {

  return (
    <RolesProvider>
      <BrowserRouter>
        <Routes>
            <Route element={<MainLayout/>}>
              <Route path='/' element={<LandingPage/>}/>
              <Route path='/menu' element={<MenuPage/>}/>
              <Route path='/abm-productos' element={<ABMProductosPage/>}/>
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
