import { Building } from '../../../components/Building'

export function ComandasPage() {
    return (
        <Building 
            nombrePagina='Historial de comandas'
            redirigir='/gerente/mesas'
            msjRetorno='Volver a Mesas'
        />
    )
}

