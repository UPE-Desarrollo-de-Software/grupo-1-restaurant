import s from './Buscador.module.css'

interface BuscadorProps{
  placeHolder: string,
  valor?: string,
  onCambio?: (valor: string) => void,
}


export function Buscador({placeHolder, valor, onCambio}: BuscadorProps) {
  const controlado = onCambio !== undefined
  return (
    <div className={s.wrapper}>
      <i className={`bi bi-search ${s.iconoIzq}`} aria-hidden="true" />
      <input
        className={s.input}
        type='text'
        placeholder={placeHolder}
        value={controlado ? (valor ?? '') : undefined}
        onChange={controlado ? (e) => onCambio(e.target.value) : undefined}
        readOnly={!controlado}
      />
    </div>
  )
}