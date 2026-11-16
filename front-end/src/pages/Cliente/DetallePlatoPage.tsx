import { useEffect, useState } from 'react'
import { Alert } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { getPlato } from '../../api/platos'
import { useCategorias } from '../../hooks/useCategorias'
import type { PlatoListar, PlatoObtener } from '../../types/Menu'
import { BotonAgregarPlato } from '../../components/Cliente/BotonAgregarPlato'
import GastroLoader from '../../components/GastroLoader/GastroLoader'
import s from './DetallePlatoPage.module.css'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(precio)

// El detalle (PlatoObtener) no trae `categoria_nombre`: se arma el shape que
// consume BotonAgregarPlato con el nombre resuelto desde el listado.
const aPlatoListar = (plato: PlatoObtener, categoriaNombre: string): PlatoListar => ({
    id: plato.id,
    categoria_id: plato.categoria_id,
    categoria_nombre: categoriaNombre,
    promocion_id: plato.promocion_id,
    promocion: plato.promocion ?? null,
    nombre: plato.nombre,
    descripcion: plato.descripcion,
    precio: plato.precio,
    imagen: plato.imagen,
    imagen_url: plato.imagen_url,
    disponible: plato.disponible,
})

// Detalle de un plato de la carta (GET /platos/{id}, público): nombre,
// imagen, descripción, precio, categoría, ingredientes con sus flags del
// pivot y promoción vigente. Se llega desde "Ver detalles" en la tarjeta y
// se vuelve a la Carta conservando la navegación (Link, no redirect).
// Incluye el mismo botón de agregar de la tarjeta.
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

    // Nombre de la categoría para el botón de agregar (el detalle trae el id).
    const categoriaNombre = plato
        ? categorias.find(categoria => categoria.id === plato.categoria_id)?.nombre ?? ''
        : ''

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
                    <GastroLoader messages={['Cargando plato…']} size={80} />
                </div>
            )}

            {error && <Alert variant='danger' className='text-body-md'>{error}</Alert>}

            {plato && !cargando && !error && (
                <article className={s.tarjeta}>
                    <div className={s.media}>
                        <img
                            className={s.imagen}
                            src={plato.imagen_url ?? undefined}
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

                        <div className={s.acciones}>
                            <BotonAgregarPlato
                                plato={aPlatoListar(plato, categoriaNombre)}
                                detalleCargado={plato}
                            />
                        </div>

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
                                ¡Elegí y personaliza el plato!
                            </p>
                        </section>
                    </div>
                </article>
            )}
        </div>
    )
}
