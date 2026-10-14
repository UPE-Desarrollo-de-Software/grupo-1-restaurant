import { Building } from '../../../../components/Building'

export function EditarPlatoPage() {
  return (
    <Building
      nombrePagina='Editar plato'
      redirigir='/gerente/carta/productos'
      msjRetorno='Volver a Productos'
    />
  )
}
