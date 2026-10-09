import { Building } from '../../../components/Building'

export function DisponibilidadPage() {
    return (
        <Building 
            nombrePagina='Disponibilidad de productos'
            redirigir='/gerente/carta'
            msjRetorno='Volver a Carta'
        />
    )
}
