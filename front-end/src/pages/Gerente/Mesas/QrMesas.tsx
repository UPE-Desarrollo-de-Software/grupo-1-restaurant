import { Building } from '../../../components/Building'

export function QrMesasPage() {
    return (
        <Building
            nombrePagina='Códigos QR por mesa'
            redirigir='/gerente/mesas'
            msjRetorno='Volver a Mesas'
        />
    )
}
