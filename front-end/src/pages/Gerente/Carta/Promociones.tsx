import { Building } from '../../../components/Building'

export function PromocionesPage() {
    return (
        <Building 
            nombrePagina='Promociones'
            redirigir='/gerente/carta'
            msjRetorno='Volver a Carta'
        />
    )
}
