import { Building } from '../../../components/Building'

export function DisponibilidadPage() {
    return (
        <Building 
            nombrePagina='Disponibilidad de platos'
            redirigir='/gerente/carta'
            msjRetorno='Volver a Carta'
        />
    )
}
