import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import type { Mesa } from '../../types/Mesa'
import { agruparMesas, desagruparMesas } from '../../api/mesas'

type Modo = 'agrupar' | 'desagrupar'

interface GrupoMesaModalProps {
  visible: boolean
  modo: Modo
  mesas: Mesa[]
  onCerrar: () => void
  onCambio: () => void
}

export function GrupoMesaModal({ visible, modo, mesas, onCerrar, onCambio }: GrupoMesaModalProps) {
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [grupoElegido, setGrupoElegido] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [exito, setExito] = useState<{ grupo_codigo?: number } | null>(null)

  const paraAgrupar = mesas.filter(mesa => mesa.estado === 'ocupada' && mesa.grupo_codigo == null)
  // Una entrada por grupo (varias mesas pueden compartir grupo_codigo).
  const grupos = Array.from(
    new Map(
      mesas
        .filter(mesa => mesa.grupo_codigo != null)
        .map(mesa => [mesa.grupo_codigo as number, mesa])
    ).values()
  )

  function cerrar() {
    setSeleccion([])
    setGrupoElegido(null)
    setErrorApi(null)
    setExito(null)
    onCerrar()
  }

  function toggle(id: number) {
    setSeleccion(actual =>
      actual.includes(id) ? actual.filter(item => item !== id) : [...actual, id]
    )
  }

  async function handlerConfirmar() {
    setEnviando(true)
    setErrorApi(null)
    try {
      if (modo === 'agrupar') {
        const { grupo_codigo } = await agruparMesas(seleccion)
        setExito({ grupo_codigo })
      } else {
        if (grupoElegido === null) return
        const idsDelGrupo = mesas
          .filter(mesa => mesa.grupo_codigo === grupoElegido)
          .map(mesa => mesa.id)
        await desagruparMesas(idsDelGrupo)
        setExito({})
      }
      onCambio()
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo completar la operación')
    } finally {
      setEnviando(false)
    }
  }

  const confirmacionDeshabilitada =
    modo === 'agrupar'
      ? seleccion.length < 2 || enviando
      : grupoElegido === null || enviando

  return (
    <Modal show={visible} onHide={cerrar} centered aria-labelledby='grupo-mesa-titulo'>
      <Modal.Header closeButton>
        <Modal.Title id='grupo-mesa-titulo' className='text-headline-sm'>
          {exito
            ? (modo === 'agrupar' ? 'Mesas agrupadas' : 'Mesas desagrupadas')
            : (modo === 'agrupar' ? 'Agrupar mesas' : 'Desagrupar mesas')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

        {exito ? (
          <div className='text-center'>
            <p className='text-body-md mb-2'>
              {modo === 'agrupar'
                ? 'Las comandas de estas mesas se leen juntas. Los códigos de acceso no cambian.'
                : 'Cada mesa vuelve a leerse por separado.'}
            </p>
            {exito.grupo_codigo !== undefined && (
              <p className='text-headline-lg mb-0' style={{ letterSpacing: '0.2em' }}>
                Grupo {exito.grupo_codigo}
              </p>
            )}
          </div>
        ) : modo === 'agrupar' ? (
          paraAgrupar.length === 0 ? (
            <p className='text-body-md text-center mb-0'>
              No hay mesas ocupadas sin agrupar.
            </p>
          ) : (
            <div className='d-flex flex-column gap-2'>
              <p className='text-body-sm text-muted mb-1'>
                Marcá al menos 2 mesas ocupadas. Solo se agrupan mesas ocupadas y sin grupo.
              </p>
              {paraAgrupar.map(mesa => (
                <Form.Check
                  key={mesa.id}
                  type='checkbox'
                  id={`agrupar-mesa-${mesa.id}`}
                  className='text-body-md'
                  label={
                    `Mesa #${String(mesa.id).padStart(2, '0')} · ${mesa.capacidad} lugares`
                  }
                  checked={seleccion.includes(mesa.id)}
                  onChange={() => toggle(mesa.id)}
                />
              ))}
            </div>
          )
        ) : grupos.length === 0 ? (
          <p className='text-body-md text-center mb-0'>No hay mesas agrupadas actualmente.</p>
        ) : (
          <div className='d-flex flex-column gap-2'>
            <p className='text-body-sm text-muted mb-1'>
              Elegí un grupo: se desagrupan todas sus mesas de una.
            </p>
            {grupos.map(mesa => (
              <Form.Check
                key={mesa.grupo_codigo}
                type='radio'
                id={`desagrupar-grupo-${mesa.grupo_codigo}`}
                name='desagrupar-grupo'
                className='text-body-md'
                label={
                  `Grupo ${mesa.grupo_codigo} · mesas ` +
                  mesas
                    .filter(hermana => hermana.grupo_codigo === mesa.grupo_codigo)
                    .map(hermana => `#${String(hermana.id).padStart(2, '0')}`)
                    .join(', ')
                }
                checked={grupoElegido === mesa.grupo_codigo}
                onChange={() => setGrupoElegido(mesa.grupo_codigo ?? null)}
              />
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {exito ? (
          <Button variant='primary' className='text-label-md' type='button' onClick={cerrar}>
            Entendido
          </Button>
        ) : (
          <>
            <Button variant='outline-secondary' className='text-label-md' type='button' onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              variant='primary'
              className='text-label-md'
              type='button'
              onClick={handlerConfirmar}
              disabled={confirmacionDeshabilitada}
            >
              {enviando
                ? <><Spinner size='sm' animation='border' className='me-2' />Aplicando...</>
                : (modo === 'agrupar' ? `Agrupar (${seleccion.length})` : 'Desagrupar')}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
