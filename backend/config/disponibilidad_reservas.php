<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Disponibilidad horaria de reservas — VALORES POR DEFECTO
    |--------------------------------------------------------------------------
    |
    | Fuente única del rango en el que el local acepta reservas. Los usa
    | DisponibilidadReservaService para generar la grilla de turnos y para
    | validar el horario de toda alta de reserva (staff y web).
    |
    | IMPORTANTE: estos son sólo los DEFAULTS. El gerente puede cambiarlos
    | en runtime desde GET/PUT /api/configuracion/disponibilidad; ese
    | cambio NO va a la base de datos: se guarda en el archivo JSON que
    | indica `archivo` (ver el docblock del service para el ciclo de vida).
    |
    | Los valores de acá se usan cuando el archivo no existe (primer
    | arranque), cuando está ilegible o cuando el backend se redespliega
    | (el `storage/` de la imagen se recrea).
    |
    */

    'hora_inicio' => env('RESERVAS_HORA_INICIO', '09:00'),

    'hora_fin' => env('RESERVAS_HORA_FIN', '23:00'),

    'intervalo_minutos' => (int) env('RESERVAS_INTERVALO_MINUTOS', 30),

    /*
    | Anticipación mínima (horas) que exige el alta de una reserva.
    | Es la fuente única de la regla: el front la recibe por API en vez
    | de replicar el valor. No la edita el gerente (no está en el PUT).
    */
    'anticipacion_horas' => (int) env('RESERVAS_ANTICIPACION_HORAS', 2),

    /*
    |--------------------------------------------------------------------------
    | Archivo de la configuración vigente (runtime)
    |--------------------------------------------------------------------------
    |
    | Fuera de storage/app/private a propósito: es configuración operativa,
    | no un archivo privado de usuario. El directorio está ignorado por
    | storage/app/.gitignore y por .dockerignore.
    |
    */

    'archivo' => storage_path('app/configuracion/disponibilidad_reservas.json'),

];
