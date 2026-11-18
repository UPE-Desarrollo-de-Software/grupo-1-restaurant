// Pagos del comensal con Mercado Pago — Checkout Pro (DER v3.2).
// Shapes espejo de PagoService::saldo()/historial() y de
// PagoController (GET|POST /cliente/pagos + POST /cliente/pagos/
// verificar). El monto lo calcula SIEMPRE el backend: el front sólo
// lo muestra y redirige al init_point.

export type TipoPago = 'total' | 'mi_parte'

// `en_proceso` = Mercado Pago tiene el pago sin resolver (fondos
// retenidos): NO cuenta en el saldo y bloquea un nuevo intento de
// pago (el front oculta los botones "Pagar").
export type EstadoPago = 'pendiente' | 'en_proceso' | 'aprobado' | 'rechazado' | 'cancelado'

// Cómo se cobró: efectivo (registrado por el mozo al cerrar la
// visita) o Mercado Pago (Checkout Pro).
export type MedioPago = 'efectivo' | 'mercado_pago'

// Lo que falta pagar por PARTE (pedido raíz): subtotal menos lo que
// esa parte ya abonó (sus pagos "mi_parte" + cualquier "total").
export interface SaldoPartePago {
    pedido_id: number
    subtotal: number
    pagado: number
    pendiente: number
}

export interface SaldoPagos {
    total: number
    pagado: number
    pendiente: number
    partes: SaldoPartePago[]
}

export interface PagoResumen {
    id: number
    tipo: TipoPago
    monto: number
    estado: EstadoPago
    medio_pago: MedioPago
    pedido_id: number | null
    fecha: string | null
}

// GET /cliente/pagos — `habilitado` es el feature flag del back
// (sin MP_ACCESS_TOKEN → false: el front oculta los botones).
export interface PagosCliente {
    habilitado: boolean
    saldo: SaldoPagos
    pagos: PagoResumen[]
}

// POST /cliente/pagos/verificar — misma forma que PagosCliente más
// `verificacion` (estado del pago que se consultó contra MP).
export interface VerificacionPago extends PagosCliente {
    verificacion: {
        pago_id: number | null
        estado: EstadoPago | null
    }
}

// POST /cliente/pagos — 201 con la preferencia de Checkout Pro;
// el front navega a `init_point` (URL de pago de Mercado Pago).
export interface PreferenciaPago {
    mensaje: string
    init_point: string
    preference_id: string
    pago_id: number
    monto: number
}
