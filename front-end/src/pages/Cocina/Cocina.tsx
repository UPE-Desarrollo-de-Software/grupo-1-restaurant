import { Building } from '../../components/Building'

export function CocinaPage() {
    return (
        <Building
            nombrePagina='Pedidos en cocina'
            redirigir='/menu'
            msjRetorno='Volver a la carta'
        />
    )
}
