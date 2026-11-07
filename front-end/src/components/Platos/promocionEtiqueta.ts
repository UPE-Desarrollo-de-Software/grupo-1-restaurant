import type { Promocion } from '../../types/Menu'

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

// Resumen del beneficio para la opción del select (el cálculo del
// descuento lo hace el backend al armar el pedido). Módulo aparte:
// react-refresh/only-export-components impide exportarlo desde
// CrearPlato/EditaPlato.
export function etiquetaPromocion(promocion: Promocion): string {
  if (promocion.tipo === '2x1') return '2x1'
  if (promocion.valor === null) return promocion.tipo
  if (promocion.tipo === 'porcentaje') return `${promocion.valor}%`
  return formatearPrecio(promocion.valor)
}
