import s from './Resumen.module.css'

const stats = [
  { label: 'Totales', valor: 48, punto: 'puntoTotales' },
  { label: 'Disponibles', valor: 44, punto: 'puntoDisponibles' },
  { label: 'Pausados', valor: 4, punto: 'puntoPausados' },
]


export function Resumen() {
  return (
    <div className={s.grid}>
      {stats.map(stat => (
        <div key={stat.label} className={s.item}>
          <p className={`text-headline-md ${s.valor}`}>{stat.valor}</p>
          <p className={`text-label-md ${s.label}`}>
            <span className={`${s.punto} ${s[stat.punto]}`} aria-hidden="true" />
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
