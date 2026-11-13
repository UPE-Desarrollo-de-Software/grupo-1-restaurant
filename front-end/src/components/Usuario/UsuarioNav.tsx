import { useState } from 'react'
import { useRol } from '../../context/RolesContext/useRol'
import { ModalPerfil } from './ModalPerfil'
import s from './Usuario.module.css'

// Bloque de usuario del Side Navbar. Todo el bloque es clickeable y abre
// el MISMO modal de perfil que el avatar del Navbar (ModalPerfil), sin
// duplicar la lógica de sesión.
export function UsuarioNav() {
    const [abierto, setAbierto] = useState(false)
    const { usuario } = useRol()

    return (
        <>
            <button
                type='button'
                className={s.bloque}
                aria-label='Abrir mi perfil'
                onClick={() => setAbierto(true)}
            >
                <span className={s.avatar} aria-hidden='true'>
                    <i className='bi bi-person-circle' />
                </span>
                <span className={s.datos}>
                    <span className={`text-label-lg ${s.nombre}`}>
                        {usuario?.nombre ?? 'Cuenta'}
                    </span>
                    {usuario?.email && (
                        <span className={`text-body-sm ${s.email}`}>
                            {usuario.email}
                        </span>
                    )}
                </span>
            </button>

            <ModalPerfil show={abierto} onCerrar={() => setAbierto(false)} />
        </>
    )
}
