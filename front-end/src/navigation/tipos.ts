export interface OpcionNav {
    to: string
    label: string
    icon?: string
    // Con `end: true` la opción sólo queda activa en la coincidencia exacta.
    end?: boolean
    // Raíz del sub-árbol de rutas que cubre la opción. Si no se define, se usa
    // `to`. Permite que el link apunte a una pantalla y aun así la opción siga
    // activa en sus sub-pantallas (ej. '/mozo' con raíz '/mozo/mesas').
    raiz?: string
}

export interface SeccionNav {
    prefijo: string
    roles: string[]
    opciones: OpcionNav[]
}
