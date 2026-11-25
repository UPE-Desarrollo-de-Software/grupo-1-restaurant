import { useState } from 'react'
import { Button, Card } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import type { EstadoVisitaMesa, Mesa } from '../../types/Mesa'
import { ETIQUETAS_ESTADO_VISITA, estadoVisitaDeMesa } from '../../utils/mesas'
import t from '../Tarjeta/Tarjeta.module.css'
import s from './MesaCard.module.css'

// Card de mesa (Diseño 2.0). La estructura común vive en
// ../Tarjeta/Tarjeta.module.css; acá quedan las particularidades:
// borde lateral + badge por estado de la visita, código copiable y
// resumen de platos/importe. El `resumen` lo agrega GET /mesas por lote.
//
// El footer tiene UNA sola acción según la sección: Editar (gerente) o
// Atender (mozo). No se tocan permisos ni reglas de negocio.

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

// Clase local por estado: pinta el borde lateral y el badge.
const CLASE_ESTADO: Record<EstadoVisitaMesa, string> = {
  eligiendo: 'estadoEligiendo',
  en_cocina: 'estadoEnCocina',
  listo: 'estadoListo',
  servido: 'estadoServido',
}

export function MesaCard({ mesa }: { mesa: Mesa }) {
  const enMozo = useLocation().pathname.startsWith('/mozo')
  const [copiado, setCopiado] = useState(false)
  const estado = estadoVisitaDeMesa(mesa)
  const resumen = mesa.resumen

  async function copiarCodigo() {
    if (!mesa.codigo_acceso) return
    try {
      await navigator.clipboard.writeText(mesa.codigo_acceso)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin soporte de clipboard: el código queda visible en pantalla.
    }
  }

  return (
    <Card className={`${t.card} ${s.card} ${s[CLASE_ESTADO[estado]]}`}>
      <Card.Body className={t.body}>
        <div className={s.cabecera}>
          <div className={s.identidad}>
            <span className={`text-label-sm ${t.indice}`}>#{String(mesa.id).padStart(2, '0')}</span>
            <span className={`text-body-sm ${s.capacidad}`}>
              <i className='bi bi-people' aria-hidden='true' />
              {mesa.capacidad} lugares
            </span>
          </div>

          <span className={`text-label-sm ${s.badgeEstado}`}>
            <span className={s.puntoEstado} aria-hidden='true' />
            {ETIQUETAS_ESTADO_VISITA[estado]}
          </span>
        </div>

        {mesa.codigo_acceso && (
          <div className={s.codigoFila}>
            <span className={`text-body-sm ${s.detalle}`}>
              Código: <strong className={s.codigoValor}>{mesa.codigo_acceso}</strong>
            </span>
            <Button
              size='sm'
              variant='outline-secondary'
              className={`text-label-md ${s.botonCopiar}`}
              type='button'
              onClick={copiarCodigo}
              aria-label='Copiar código de la mesa'
            >
              <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'} me-1`} aria-hidden='true' />
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        )}

        <p className={`text-body-md ${s.pedido}`}>
          {resumen && resumen.platos > 0 ? (
            <>
              <strong>{resumen.platos}</strong>{' '}
              {resumen.platos === 1 ? 'plato' : 'platos'}
              <span className={s.separador} aria-hidden='true'>•</span>
              <strong>{formatearPrecio(resumen.total)}</strong>
            </>
          ) : (
            <span className={s.sinPedido}>Sin pedidos todavía</span>
          )}
        </p>

        <div className={`${t.footer} ${t.footerDerecha}`}>
          <Link
            className={`btn btn-outline-primary btn-sm rounded-pill text-label-md ${t.botonAccion}`}
            to={enMozo ? `/mozo/mesas/${mesa.id}` : `/gerente/mesas/gestion/${mesa.id}/editar`}
          >
            <i className={`bi ${enMozo ? 'bi-arrow-right' : 'bi-pencil'} ${t.iconoAccion}`} aria-hidden='true' />
            {enMozo ? 'Atender' : 'Editar'}
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
