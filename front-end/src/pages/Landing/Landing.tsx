import { CartaAbierta } from '../../components/Landing/CartaAbierta'
import { ConexionMesa } from '../../components/Landing/ConexionMesa'
import { HorariosServicio } from '../../components/Landing/HorariosServicio'
import s from './Landing.module.css'

export function LandingPage(){
  return(
    <div className={s.landing}>
      <CartaAbierta/>
      <ConexionMesa/>
      <HorariosServicio/>
    </div>
  )
}
