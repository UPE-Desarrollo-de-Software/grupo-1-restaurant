import { Building } from '../../components/Building'

export function MozoReservasPage() {
    return (
        <Building
            nombrePagina='Reservas'
            redirigir='/mozo'
            msjRetorno='Volver a mesas'
        />
    )
}
