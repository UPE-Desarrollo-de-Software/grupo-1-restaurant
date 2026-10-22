import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { Buscador } from '../../components/Carta/Buscador'
import { BotonRedireccion } from '../../components/Carta/BotonRedireccion'
import { Resumen } from '../../components/Carta/Resumen'
import { Lista } from '../../components/Carta/Lista'
import { OcuparMesaModal } from '../../components/Mesas/OcuparMesaModal'
import { GrupoMesaModal } from '../../components/Mesas/GrupoMesaModal'
import { useDatos } from '../../hooks/useDatos'
import type { Mesa } from '../../types/Mesa'
import s from './Mozo.module.css'

// Panel de mesas del mozo: mismo andamiaje que GestionMesas del gerente
// (buscador + toolbar de servicio + resumen/lista), pero dando a
// /mozo/mesas/crear (alta con sesión de atención) y sin edición de mesas.
export function MozoPage() {
    const [busqueda, setBusqueda] = useState('')
    const [modalOcupar, setModalOcupar] = useState(false)
    const [modalGrupo, setModalGrupo] = useState<'agrupar' | 'desagrupar' | null>(null)
    const { items, loading, error, recargar } = useDatos('mesa')

    const mesas = items as Mesa[]
    const hayParaOcupar = mesas.some(mesa => mesa.estado !== 'ocupada')
    const hayParaAgrupar =
        mesas.filter(mesa => mesa.estado === 'ocupada' && mesa.grupo_codigo == null).length >= 2
    const hayGrupos = mesas.some(mesa => mesa.grupo_codigo != null)

    return (
        <div className={`${s.page} ${s.hub}`}>
            <Buscador
                placeHolder='Buscar mesa por id o estado...'
                valor={busqueda}
                onCambio={setBusqueda}
            />

            <div className={s.toolbar}>
                <BotonRedireccion nombre='Nueva mesa' ruta='/mozo/mesas/crear' />
                <div className={s.accionesGrupo}>
                    <Button
                        size='sm'
                        variant='outline-primary'
                        className='text-label-md'
                        disabled={!hayParaOcupar || loading}
                        onClick={() => setModalOcupar(true)}
                    >
                        <i className='bi bi-box-arrow-in-right me-1' aria-hidden='true' />
                        Ocupar mesa
                    </Button>
                    <Button
                        size='sm'
                        variant='outline-primary'
                        className='text-label-md'
                        disabled={!hayParaAgrupar || loading}
                        onClick={() => setModalGrupo('agrupar')}
                    >
                        <i className='bi bi-collection me-1' aria-hidden='true' />
                        Agrupar mesas
                    </Button>
                    <Button
                        size='sm'
                        variant='outline-primary'
                        className='text-label-md'
                        disabled={!hayGrupos || loading}
                        onClick={() => setModalGrupo('desagrupar')}
                    >
                        <i className='bi bi-layout-split me-1' aria-hidden='true' />
                        Desagrupar
                    </Button>
                </div>
            </div>

            <Resumen tipo='mesa' items={items} loading={loading} />
            <Lista tipo='mesa' items={items} loading={loading} error={error} busqueda={busqueda} />

            <OcuparMesaModal
                visible={modalOcupar}
                mesas={mesas}
                onCerrar={() => setModalOcupar(false)}
                onCambio={recargar}
            />
            {modalGrupo !== null && (
                <GrupoMesaModal
                    visible={true}
                    modo={modalGrupo}
                    mesas={mesas}
                    onCerrar={() => setModalGrupo(null)}
                    onCambio={recargar}
                />
            )}
        </div>
    )
}
