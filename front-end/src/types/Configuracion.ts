// GET /configuracion (ConfiguracionController::show): la composición
// del salón (CONFIG_MESA) con el aforo y el tope de mesas derivados.
export interface ConfigMesaFila {
    capacidad: number
    cantidad: number
}

export interface Configuracion {
    config_mesas: ConfigMesaFila[]
    aforo: number
    mesas_maximas: number
}

// GET/PUT /configuracion/disponibilidad: ventana de turnos de reservas.
// `slots` es la grilla derivada (['09:00', '09:30', …]) y
// `anticipacion_horas` sólo la informa el backend (no se edita acá).
// OJO: esta configuración NO vive en la base de datos (ver
// DisponibilidadReservaService en el backend).
export interface DisponibilidadReservas {
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: number
    anticipacion_horas: number
    slots: string[]
    total_slots: number
}

// Body del PUT: sólo la ventana y el intervalo.
export interface DisponibilidadReservasInput {
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: number
}
