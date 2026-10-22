import type { LineaBorrador } from '../types/Cliente'

// Cálculo de importes del borrador (misma fórmula que el backend:
// unitario = precio del plato + Σ precio_adicional de los agregados;
// los excluidos no cobran). El total definitivo lo recalcula el
// backend al crear el pedido — acá es solo presentación.

export function unitarioLinea(linea: LineaBorrador): number {
    return linea.plato.precio + linea.ingredientes.reduce(
        (acum, id) => acum + (linea.opciones[id]?.precioAdicional ?? 0),
        0,
    )
}

export function importeLinea(linea: LineaBorrador): number {
    return unitarioLinea(linea) * linea.cantidad
}
