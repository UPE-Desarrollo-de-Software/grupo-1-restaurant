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
