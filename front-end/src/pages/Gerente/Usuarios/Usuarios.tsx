import { Building } from '../../../components/Building'

export function UsuariosPage() {
    return (
        <Building
            nombrePagina='Usuarios y permisos'
            redirigir='/gerente'
            msjRetorno='Volver al dashboard'
        />
    )
}