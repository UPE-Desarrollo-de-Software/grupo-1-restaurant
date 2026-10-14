export interface OpcionNav {
    to: string
    label: string
    icon?: string
    end?: boolean
}

export interface SeccionNav {
    prefijo: string
    roles: string[]
    opciones: OpcionNav[]
}
