import { useEffect, useState } from "react";
import { getRoles } from "../../api/auth";
import type { Rol } from "../../types/Auth";
import type { ReactNode } from "react";
import { RolesContext,ROLES_FALLBACK } from "./useRoles";

export function RolesProvider({children}: {children: ReactNode}){
    const [roles, setRoles] = useState<Rol[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(()=>{
        const controller = new AbortController()
        getRoles(controller.signal)
            .then(setRoles)
            .catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setRoles(ROLES_FALLBACK)
                setError(err instanceof Error ? err.message : 'Error al cargar roles')
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [])
    
    return(
        <RolesContext.Provider value={{ roles, loading, error }}>
            {children}
        </RolesContext.Provider>
    )
}