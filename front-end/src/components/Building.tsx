import { Link } from 'react-router-dom'
import s from '../pages/Gerente/gerente.module.css'

interface BuildingProps{
    nombrePagina: string
    redirigir: string,
    msjRetorno: string
}

export function Building( {nombrePagina, redirigir, msjRetorno}: BuildingProps) {
    return (
        <div className={s.page}>
            <h1 className={`text-headline-md ${s.title}`}>{nombrePagina}</h1>
            <div className={s.empty}>
                <i className={`bi bi-tools ${s.emptyIcon}`} aria-hidden="true" />
                <p className='text-body-md'>Pantalla en construcción</p>
                <Link to={`${redirigir}`} className={`text-body-md ${s.backLink}`}>{`← ${msjRetorno} `}</Link>
            </div>
        </div>
    )
}
