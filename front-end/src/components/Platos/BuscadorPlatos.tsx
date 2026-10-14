import s from './BuscadorPlatos.module.css'

export function BuscadorPlatos() {
  return (
    <div className={s.wrapper}>
      <i className={`bi bi-search ${s.iconoIzq}`} aria-hidden="true" />
      <input
        className={s.input}
        type='text'
        placeholder='Buscar por nombre, código o ingrediente'
        readOnly
      />
      <i className={`bi bi-mic ${s.iconoDer}`} aria-hidden="true" />
    </div>
  )
}
