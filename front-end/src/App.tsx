import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MenuPage } from './pages/Menu'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/Login/Login'
import { RegisterPage } from './pages/Register/Register'
import { RequireAuth } from './components/RequireAuth'
import { ROLES } from './api/auth'

function App() {

  return (
      <BrowserRouter>
        <Routes>
            <Route element={<MainLayout/>}>
              <Route path='/menu' element={<MenuPage/>}/>
            </Route>
            <Route element={<AuthLayout/>}>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/register' element={
                <RequireAuth rolesPermitidos={[ROLES.GERENTE]}>
                  <RegisterPage/>
                </RequireAuth>
                }/>
            </Route>
        </Routes>
      </BrowserRouter>
  )
}

export default App
