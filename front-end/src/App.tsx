import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MenuPage } from './pages/Menu'
import { MainLayout } from './layouts/MainLayout'

function App() {

  return (
      <BrowserRouter>
        <Routes>
            <Route element={<MainLayout/>}>
              <Route path='/menu' element={<MenuPage/>}>
              {/* <Route path='/pedido'/>
              <Route path='/reservas'/>
              <Route path='/unir-mesa'/> */}
              </Route>
            </Route>
        </Routes>
      </BrowserRouter>
  )
}

export default App
