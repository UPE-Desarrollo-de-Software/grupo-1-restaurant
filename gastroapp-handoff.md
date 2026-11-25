# Handoff — GastroApp (front-end + diagnóstico backend)

Fecha: 2026-11-23
Repo: `C:\Users\chiguas\Desktop\enzito\proyectos\GastroApp\grupo-1-restaurant`
Rama actual: `rama-EC`. Working tree limpio.

## Contexto de la sesión anterior

Tres temas abiertos, todos relacionados con el commit `1471dc7 feat(platos): recargo por
ingrediente opcional y nuevo configurador`:

1. Un pedido ya commiteado (`1471dc7`) rompe consultas que usan `precio_adicional`.
2. El envío/confirmación de un pedido tarda ~8 s por plato.
3. Nombre del commit para el trabajo de persistencia por visita del comensal.

El punto 3 está **cerrado**: se commiteó como
`c85f8bc feat(cliente): conservar borrador y pedidos al salir de la mesa`
(6 archivos, +181/-34). No hay cambios pendientes en el front.

Los puntos 1 y 2 quedaron **sólo diagnosticados, sin implementar**: no se tocó el backend.

## Estado de lo entregado (commit `c85f8bc`)

Persistencia por visita del comensal, opción A (front-only). El estado de la visita
(`pedidoIds`, `confirmarPendiente`, `borrador`) se espeja en
`localStorage['gastro_cliente_visitas']`, con una entrada por `mesa.id`, vencimiento a 24 h
y tope de 10 entradas. Se restaura al reingresar con el mismo código de mesa. Un 401/403 del
backend descarta la entrada de esa visita; un fallo de red la conserva. Un código reutilizado
por otra visita no hereda nada porque cambia `mesa.id`.

Archivos del commit: `front-end/src/utils/visitasCliente.ts` (nuevo),
`ClienteProvider.tsx`, `useCliente.ts`, `MesaPage.tsx`, `types/Cliente.ts`, `AGENTS.md`.
`npm run lint` y `npm run build` pasaron.

Pendiente sólo la prueba manual con backend vivo (ver "Próximos pasos", punto 1).

## Tema 1 — `precio_adicional` (bloqueante en bases ya migradas)

### Diagnóstico (confirmado)

La columna se agregó **editando** el archivo de create:
`backend/database/migrations/2026_09_17_154130_create_plato_ingrediente_table.php`.
`migrate` no re-ejecuta un create ya aplicado, así que cualquier base migrada antes del
cambio nunca recibe la columna. Error real reproducido:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'plato_ingrediente.precio_adicional' in 'field list'
```

El MySQL local ya la tiene (se hizo `migrate:fresh` después). El deploy corre
`app:preparar-base` → `migrate --force` (ver `backend/routes/console.php`), no `fresh`, por lo
que la columna no llega a producción.

### Opciones propuestas (ninguna elegida todavía)

1. **Recomendada** — migración nueva y aditiva con guard `Schema::hasColumn(...)` y `down()`
   condicional. Idempotente: en bases nuevas (donde el create ya trae la columna) no hace
   nada; en bases viejas la agrega. Requiere anotar la excepción a la convención "sólo se
   edita el create" en `backend/AGENTS.md`.
2. Revertir la columna del create y moverla a una migración aditiva. Más limpio
   históricamente, pero exigiría chequeo en bases que ya corrieron el create editado.
3. `migrate:fresh --seed` en cada entorno. Descarta datos; sólo sirve para entornos
   descartables, no para el deploy.

Decisión abierta también: si el fix incluye el bug no fatal del label "Hereda el catálogo" en
`front-end/src/components/.../IngredienteConfigCard.tsx`.

### Archivos implicados

- `backend/database/migrations/2026_09_17_154130_create_plato_ingrediente_table.php`
- `backend/app/Models/Plato.php`, `backend/app/Models/Ingrediente.php`
  (`withPivot([... 'precio_adicional'])`, `precioAdicionalParaPlato()`)
- `backend/AGENTS.md` (convención de migraciones)

### Si se aprueba implementar

Crear la migración aditiva con guard, correr `vendor/bin/pint`, y ejecutar los tests de platos
y pedidos. Tests backend en Windows:

```
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/pest ...
```

usando `C:\php\php.exe`. Ojo: correr `PedidoMesaTest` sin `CocinaTest` falla con
`Call to undefined function conCocina()` porque el helper vive en el otro archivo (hay que
pasar ambos). Fallos ambientales conocidos, no regresiones: `APP_KEY` (`DocsTest`,
`ExampleTest`), falta GD (`ImagenPlatoTest`), `disponibilidad_reservas.json` con
`intervalo_minutos: 60` (`ReservaTest`), y `php artisan db:table` falla por falta de `intl`.

## Tema 2 — lentitud de alta/confirmación de pedido (~8 s)

### Medición

Con la conexión de Laravel tal como está: `select 1` cuesta ~42 ms; 20 selects = 841 ms.
Con `PDO::ATTR_EMULATE_PREPARES => true`: 20 selects = 15 ms (~0,7 ms cada uno).

Endpoints medidos (medición in-process con `PedidoService` dentro de una transacción con
`rollBack()`, porque no se podía hacer un POST real por HTTP sin escribir datos):

| Operación                | Queries | Tiempo |
|--------------------------|---------|--------|
| `GET /cliente/pedidos`   | 13      | 1.200 ms |
| Alta 1 línea             | 11      | 475 ms |
| Alta 5 líneas            | 23      | 1.752 ms |
| Confirmar                | 17      | 732 ms |
| Alta 5 líneas (emulado)  | 23      | 48 ms |
| Resumen (emulado)        | —       | 48 ms |

### Causa

Prepared statements nativos contra MySQL en Docker por `127.0.0.1:3307`: cada round trip
cuesta ~40 ms. El comensal manda un solo POST con todas las líneas, pero el backend hace ~3
queries extra por línea (`PedidoService::agregarProducto`/`agregarLinea` recargan el plato en
cada línea), más la confirmación y el refetch del resumen.

### Pasos propuestos (ninguno aprobado)

1. `PDO::ATTR_EMULATE_PREPARES => true` en los bloques `mysql` y `mariadb` de
   `backend/config/database.php`. Un solo cambio, gana casi todo el tiempo.
2. Opcional, aparte: bajar el número de queries (N+1). Ver
   `backend/app/Services/PedidoService.php`,
   `backend/app/Services/MesaService.php` (`pedidoAArray` llama `sinConfirmar()` por pedido),
   `backend/app/Repositories/EloquentPedidoRepository.php` (`conDetallesOrFail` con eager loads
   pesados).

Preguntas sin responder: ¿los ~8 s son en local o en el deploy? ¿Se hace sólo el paso 1 o
también el paso 2?

## Entorno local (referencia, sin secretos)

- Backend en `127.0.0.1:8000`, MySQL en Docker (`gastroapp-db`) en el puerto `3307`, Reverb en
  `8080`.
- `backend/.env`: `DB_PORT=3307`, `BROADCAST_CONNECTION=reverb`, `QUEUE_CONNECTION=database`.
  Los eventos son `ShouldBroadcast` (van por cola: hace falta el worker).
- La medición con prepares emulados se hizo sólo en runtime (`config(...)` + `DB::purge('mysql')`);
  no se modificó ningún archivo.
- No hay `DB::listen` ni profiler interceptando queries; `laravel/pao` es dev-only.

## Próximos pasos

1. Prueba manual de `c85f8bc` con backend vivo: entrar a una mesa, armar un borrador,
   "Salir de mesa", reingresar con el mismo código y verificar "Tu parte" y el borrador
   recuperado. Después cerrar la mesa y confirmar que un código reutilizado no hereda nada.
2. Decidir el fix de `precio_adicional` (opción 1, 2 o 3) y si incluye el label de
   `IngredienteConfigCard.tsx`.
3. Decidir si se aplica el paso 1 de performance (config de prepares) y/o el paso 2 (bajar
   queries).
4. Si se aprueba implementar: hace falta un agente con permiso de escritura (la sesión
   anterior estaba en Plan mode). Correr `npm run lint` y `npm run build` al tocar el front;
   `vendor/bin/pint` y los tests correspondientes al tocar el backend.

## Skills sugeridas para la próxima sesión

- `api-engineer` — punto de entrada si la próxima sesión ataca el backend/API (endpoints de
  pedidos, contrato, performance). Rutea a las skills específicas de Postman.
- `performance-testing` — si se decide medir formalmente el alta/confirmación y fijar umbrales
  de latencia o error, en lugar de la medición in-process manual.
- `stop-slop` — si hay que redactar el commit/PR o la nota para el equipo de backend.
- `caveman` — sólo si el usuario la vuelve a pedir; el estilo terse no debe aplicarse a
  documentos persistidos como este.
