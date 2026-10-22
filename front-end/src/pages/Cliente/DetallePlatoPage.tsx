import { useEffect, useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { getPlato } from '../../api/platos'
import { useCategorias } from '../../hooks/useCategorias'
import type { PlatoObtener } from '../../types/Menu'
import s from './DetallePlatoPage.module.css'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(precio)

// Detalle de un plato de la carta (GET /platos/{id}, público): nombre,
// imagen, descripción, precio, categoría, ingredientes con sus flags del
// pivot y promoción vigente. Se llega desde "Ver detalles" en la tarjeta
// y se vuelve a la Carta conservando la navegación (Link, no redirect).
export function DetallePlatoPage() {
    const { id } = useParams()
    const platoId = Number(id)
    const idInvalido = !Number.isInteger(platoId) || platoId <= 0
    const { categorias } = useCategorias()

    const [plato, setPlato] = useState<PlatoObtener | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (idInvalido) return
        const controller = new AbortController()
        async function cargar() {
            try {
                const obtenido = await getPlato(platoId, controller.signal)
                setPlato(obtenido)
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'No se pudo cargar el plato')
            } finally {
                setCargando(false)
            }
        }
        cargar()
        return () => controller.abort()
    }, [platoId, idInvalido])

    const volver = (
        <Link to='/carta' className={`text-body-md ${s.volver}`}>
            <i className='bi bi-arrow-left me-1' aria-hidden='true' />
            Volver a la Carta
        </Link>
    )

    if (idInvalido) {
        return (
            <div className={s.pagina}>
                {volver}
                <Alert variant='warning' className='text-body-md'>
                    El plato indicado no existe.
                </Alert>
            </div>
        )
    }

    return (
        <div className={s.pagina}>
            {volver}

            {cargando && (
                <div className={s.cargando}>
                    <Spinner animation='border' size='sm' />
                    <span className='text-body-md'>Cargando plato…</span>
                </div>
            )}

            {error && <Alert variant='danger' className='text-body-md'>{error}</Alert>}

            {plato && !cargando && !error && (
                <article className={s.tarjeta}>
                    <div className={s.media}>
                        <img
                            className={s.imagen}
                            src={plato.imagen ?? undefined}
                            alt={plato.nombre}
                        />
                    </div>

                    <div className={s.contenido}>
                        <div className={s.etiquetas}>
                            {categorias
                                .filter(categoria => categoria.id === plato.categoria_id)
                                .map(categoria => (
                                    <span key={categoria.id} className={`text-label-md ${s.etiqueta}`}>
                                        {categoria.nombre}
                                    </span>
                                ))}
                            {plato.promocion && (
                                <span className={`text-label-md ${s.etiquetaPromo}`}>
                                    <i className='bi bi-tag-fill me-1' aria-hidden='true' />
                                    {plato.promocion.nombre}
                                </span>
                            )}
                            {!plato.disponible && (
                                <span className={`text-label-md ${s.etiquetaNoDisponible}`}>
                                    No disponible hoy
                                </span>
                            )}
                        </div>

                        <h1 className={`text-headline-lg ${s.nombre}`}>{plato.nombre}</h1>

                        <p className={`text-price-display ${s.precio}`}>
                            {formatearPrecio(plato.precio)}
                        </p>

                        {plato.descripcion && (
                            <p className={`text-body-md ${s.descripcion}`}>{plato.descripcion}</p>
                        )}

                        <section className={s.ingredientes} aria-labelledby='ingredientes-title'>
                            <h2 id='ingredientes-title' className={`text-headline-sm ${s.subtitulo}`}>
                                Ingredientes
                            </h2>
                            {plato.ingredientes.length === 0 ? (
                                <p className={`text-body-sm ${s.sinIngredientes}`}>
                                    Este plato no tiene ingredientes registrados.
                                </p>
                            ) : (
                                <ul className={s.listaIngredientes}>
                                    {plato.ingredientes.map(ing => (
                                        <li key={ing.id} className={`text-body-sm ${s.itemIngrediente}`}>
                                            <span className={s.nombreIngrediente}>{ing.nombre}</span>
                                            {ing.pivot.opcional && !ing.pivot.por_defecto ? (
                                                <span className={`text-label-sm ${s.chipOpcional}`}>
                                                    {Number(ing.precioAdicional) > 0
                                                        ? `+ ${formatearPrecio(Number(ing.precioAdicional))}`
                                                        : 'agregable'}
                                                </span>
                                            ) : (
                                                <span className={`text-label-sm ${s.chip}`}>
                                                    {ing.pivot.por_defecto ? 'lo podés quitar' : 'incluido'}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className={`text-body-sm ${s.notaPersonalizacion}`}>
                                <i className='bi bi-sliders me-1' aria-hidden='true' />
                                Podés personalizar este plato al agregarlo a tu pedido desde la Carta
                                (con tu mesa identificada).
                            </p>
                        </section>
                    </div>
                </article>
            )}
        </div>
    )
}
