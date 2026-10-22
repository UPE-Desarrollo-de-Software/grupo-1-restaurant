// Sesión del comensal identificado en una mesa (respuesta de POST /acceso).
export interface ClienteMesa {
    id: number
    codigo_acceso: string
    estado: string
}

// Snapshot mínimo del plato dentro del borrador: permite renderizar y
// calcular importes sin volver a pedir el detalle (y sobrevive a recargas).
export interface PlatoBorrador {
    id: number
    nombre: string
    imagen: string | null
    precio: number
}

// Dato de personalización (viene de GET /platos/{id}); el precioAdicional
// solo se cobra cuando el ingrediente entra en `ingredientes` (agregado).
export interface OpcionBorrador {
    id: number
    nombre: string
    precioAdicional: number
}

// Línea del borrador armado localmente (nunca toca el backend hasta enviar).
// `clave` identifica la combinación plato + opciones: mismas opciones suman
// cantidad, opciones distintas generan otra línea (nunca se fusionan).
export interface LineaBorrador {
    clave: string
    plato: PlatoBorrador
    cantidad: number
    // Ingredientes a AGREGAR (ids, contrato de POST /cliente/pedidos).
    ingredientes: number[]
    // Ingredientes a EXCLUIR (ids, contrato de POST /cliente/pedidos).
    excluir: number[]
    // Datos para mostrar las opciones elegidas sin refetch.
    opciones: Record<number, OpcionBorrador>
}

// Persistencia en localStorage bajo la clave `gastro_cliente`.
export interface SesionCliente {
    mesa: ClienteMesa
    // Pedidos creados por ESTE comensal (raíces): con ellos ubica su
    // parte en el resumen de la mesa y con el último intenta anexarse.
    pedidoIds: number[]
    // true cuando las líneas ya se crearon en el server pero falló la
    // confirmación: el reintento SOLO confirma (evita duplicar líneas).
    confirmarPendiente: boolean
    borrador: LineaBorrador[]
}
