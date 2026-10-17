import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button } from 'react-bootstrap'
import s from './Platos.module.css'
import g from '../../gerente.module.css'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'
import { deletePlato } from '../../../../api/platos'

export function EditarPlatoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [eliminando, setEliminando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  async function handlerEliminar() {
    setErrorApi(null)
    setEliminando(true)
    try {
      await deletePlato(Number(id))
      navigate('/gerente/carta/platos')
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar el plato')
      setEliminando(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.headerFila}>
        <div>
          <h1 className={`text-headline-md ${s.title}`}>Editar plato</h1>
          <p className={`text-body-sm ${s.subtitle}`}>Modificá los datos del plato o eliminálo de la carta.</p>
        </div>
        <Button
          className='text-label-md'
          variant='outline-secondary'
          type='button'
          disabled={eliminando}
          onClick={() => navigate('/gerente/carta/platos')}
        >
          Cancelar edición
        </Button>
      </div>

      {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

      <div className={g.empty}>
        <i className={`bi bi-tools ${g.emptyIcon}`} aria-hidden='true' />
        <p className='text-body-md'>Formulario en construcción</p>
      </div>

      <div className={s.zonaWrap}>
        <ZonaPeligro
          descripcion='Eliminar este plato lo quitará de la carta digital: dejará de estar disponible y no podrá ser ordenado. Esta acción no se puede deshacer.'
          textoBoton='Eliminar plato'
          eliminando={eliminando}
          onEliminar={handlerEliminar}
        />
      </div>
    </div>
  )
}
