import { Building } from '../../../components/Building'

export function GestionMesasPage() {
    return (
        <Building
            nombrePagina='Gestión de mesas'
            redirigir='/gerente/mesas'
            msjRetorno='Volver a Mesas'
        />
    )
}
