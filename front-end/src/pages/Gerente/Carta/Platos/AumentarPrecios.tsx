import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { useCategorias } from '../../../../hooks/useCategorias'
import { useDatos } from '../../../../hooks/useDatos'
import type { AumentoPreciosResponse, PlatoListar } from '../../../../types/Menu'
import { aumentoPreciosSchema } from '../../../../schemas/carta'
import { aumentarPrecios } from '../../../../api/platos'
import { ExitoModal } from '../../../../components/Exito/ExitoModal'
import { formatearPrecio } from '../../../../utils/historial'

const TIPOS = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'monto', label: 'Monto fijo ($)' },
]

const REDONDEOS = [
    { value: '', label: 'Sin redondeo' },
    { value: '50', label: 'Redondear a 50' },
    { value: '100', label: 'Redondear a 100' },
]

export function AumentarPreciosPage() {
    const navigate = useNavigate()
    const [alcance, setAlcance] = useState<'todos' | 'categoria'>('todos')
    const [categoriaId, setCategoriaId] = useState('')
    const [tipo, setTipo] = useState<'' | 'porcentaje' | 'monto'>('')
    const [valor, setValor] = useState('')
    const [redondeo, setRedondeo] = useState('') // '' = sin redondeo

    const [confirmando, setConfirmando] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    // Ajuste aplicado: abre el modal con el detalle que devolvió el backend.
    const [resultado, setResultado] = useState<AumentoPreciosResponse | null>(null)
    const [tocado, setTocado] = useState(false)

    const { categorias, loadingCategorias, errorCategorias } = useCategorias()
    // Mismo listado completo que el panel (activos y pausados): sirve para
    // contar los platos que van a entrar al ajuste antes de confirmar.
    const { items, loading: loadingPlatos, error: errorPlatos, recargar } = useDatos('plato')
    const platos = items as PlatoListar[]

    const errores: Record<string, string> = {}
    const resultados = aumentoPreciosSchema.safeParse({
        alcance,
        categoria_id: categoriaId,
        tipo: tipo || undefined,
        valor,
        redondeo,
    })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    const categoriaElegida = categorias.find(c => c.id === Number(categoriaId)) ?? null
    const etiquetaAlcance = alcance === 'todos'
        ? 'Toda la carta'
        : `Categoría: ${categoriaElegida?.nombre ?? `#${categoriaId}`}`
    const etiquetaValor = tipo === 'porcentaje'
        ? `+${valor}%`
        : `+${formatearPrecio(Number(valor))}`
    const etiquetaRedondeo = redondeo === '' ? 'Sin redondeo' : `Redondeo a ${redondeo}`

    const hayPlatos = !loadingPlatos && !errorPlatos
    const platosAfectados = platos.filter(plato =>
        alcance === 'todos' || plato.categoria_id === Number(categoriaId)
    )

    function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setResultado(null)
        setErrorApi(null)

        // Solo abre la confirmación: el aumento se aplica recién al
        // confirmar en el modal (toca toda la carta de una).
        if (resultados.success) setConfirmando(true)
    }

    async function confirmar() {
        if (!resultados.success) return

        setEnviando(true)
        setErrorApi(null)
        try {
            const respuesta = await aumentarPrecios(resultados.data)
            setResultado(respuesta)
            setConfirmando(false)
            setTocado(false)
            // Los precios del listado quedaron viejos: refresca para que
            // el próximo resumen no muestre importes viejos.
            void recargar()
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar los precios')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Aumento de precios</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    Ajustá los precios de la carta por categoría o de todos los platos de una vez.
                </p>

                {errorCategorias &&
                    <Alert variant='danger' className='text-body-md'>
                        No se pudieron cargar las categorías. Verificá que el servidor esté activo
                    </Alert>}

                <Alert variant='info' className='text-body-sm'>
                    El aumento solo cambia los precios de la carta: los pedidos ya hechos conservan
                    el precio con el que se cargaron.
                </Alert>

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='aumento-alcance'>
                            <Form.Label className={`text-label-md ${s.label}`}>Alcance</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={alcance}
                                onChange={(e) => setAlcance(e.target.value as 'todos' | 'categoria')}
                            >
                                <option value='todos'>Toda la carta</option>
                                <option value='categoria'>Una categoría</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='aumento-categoria'>
                            <Form.Label className={`text-label-md ${s.label}`}>Categoría</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                isInvalid={tocado && !!errores.categoria_id}
                                disabled={alcance === 'todos' || loadingCategorias}
                            >
                                <option value='' disabled={true}>Seleccioná una categoría</option>
                                {categorias.map(c => (
                                    <option value={c.id} key={c.id}>{c.nombre}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.categoria_id}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='aumento-tipo'>
                            <Form.Label className={`text-label-md ${s.label}`}>Tipo de aumento</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                                isInvalid={tocado && !!errores.tipo}
                            >
                                <option value='' disabled={true}>Seleccioná un tipo</option>
                                {TIPOS.map(opcion => (
                                    <option value={opcion.value} key={opcion.value}>{opcion.label}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.tipo}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='aumento-valor'>
                            <Form.Label className={`text-label-md ${s.label}`}>
                                {tipo === 'porcentaje' ? 'Valor (%)' : 'Valor ($)'}
                            </Form.Label>
                            <Form.Control
                                className={s.input}
                                type='number'
                                min={0}
                                step='any'
                                placeholder={tipo === 'porcentaje' ? '15' : '500'}
                                value={valor}
                                onChange={(e) => setValor(e.target.value)}
                                isInvalid={tocado && !!errores.valor}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.valor}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='aumento-redondeo'>
                        <Form.Label className={`text-label-md ${s.label}`}>Redondeo (opcional)</Form.Label>
                        <Form.Select
                            className={s.input}
                            value={redondeo}
                            onChange={(e) => setRedondeo(e.target.value)}
                        >
                            {REDONDEOS.map(opcion => (
                                <option value={opcion.value} key={opcion.value}>{opcion.label}</option>
                            ))}
                        </Form.Select>
                        <p className={`text-body-sm ${s.ayuda}`}>
                            Redondea los precios nuevos a múltiplos de 50 o 100. El precio nunca baja:
                            si el redondeo lo comería, sube al siguiente escalón.
                        </p>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit'>
                            Revisar aumento
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/carta/platos')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>

            <Modal
                show={confirmando}
                onHide={() => !enviando && setConfirmando(false)}
                centered
                aria-labelledby='confirmar-aumento-titulo'
            >
                <Modal.Header closeButton>
                    <Modal.Title id='confirmar-aumento-titulo' className='text-headline-sm'>
                        ¿Aplicar el aumento?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='text-body-md'>
                    {errorApi && (
                        <Alert variant='danger' className='text-body-sm' role='alert'>
                            {errorApi}
                        </Alert>
                    )}

                    <ul className={s.confirmacionDatos}>
                        <li>
                            <span>Alcance</span>
                            <strong>{etiquetaAlcance}</strong>
                        </li>
                        <li>
                            <span>Aumento</span>
                            <strong>{resultados.success ? etiquetaValor : '—'}</strong>
                        </li>
                        <li>
                            <span>Redondeo</span>
                            <strong>{etiquetaRedondeo}</strong>
                        </li>
                        {hayPlatos && (
                            <li>
                                <span>Platos afectados</span>
                                <strong>{platosAfectados.length}</strong>
                            </li>
                        )}
                    </ul>

                    <p className={`text-body-sm ${s.ayuda}`}>
                        Los pedidos ya hechos conservan su precio: el cambio solo aplica a la carta.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        className='text-label-md'
                        variant='outline-secondary'
                        type='button'
                        disabled={enviando}
                        onClick={() => setConfirmando(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className='text-label-md'
                        variant='primary'
                        type='button'
                        disabled={enviando}
                        onClick={confirmar}
                    >
                        {enviando
                            ? <><Spinner size='sm' animation='border' className='me-1' />Aplicando...</>
                            : 'Aplicar aumento'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <ExitoModal
                show={resultado !== null}
                titulo='Precios actualizados'
                mensaje={`Se actualizaron ${resultado?.total ?? 0} platos de la carta.`}
                datos={resultado
                    ? [
                        { etiqueta: 'Alcance', valor: etiquetaAlcance },
                        { etiqueta: 'Aumento', valor: etiquetaValor },
                        { etiqueta: 'Redondeo', valor: etiquetaRedondeo },
                    ]
                    : []}
                textoSeguir='Ajustar de nuevo'
                onSeguir={() => setResultado(null)}
                onListo={() => navigate('/gerente/carta/platos')}
            >
                {resultado && resultado.actualizados.length > 0 && (
                    <ul className={s.resultadoLista}>
                        {resultado.actualizados.map(plato => (
                            <li key={plato.id} className='text-body-sm'>
                                <span>{plato.nombre}</span>
                                <span>
                                    <span className={s.resultadoAnterior}>
                                        {formatearPrecio(plato.precio_anterior)}
                                    </span>
                                    {' → '}
                                    <strong>{formatearPrecio(plato.precio_nuevo)}</strong>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </ExitoModal>
        </div>
    )
}
