<?php

use App\Models\Usuario;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Se corre en cada arranque del contenedor (docker-entrypoint.sh).
 * Las migraciones solo aplican las que falten, así que en una base vacía crean
 * todo y en una existente no tocan nada. Los datos iniciales se cargan solo si
 * no hay ningún usuario: los seeders vuelven a poner la contraseña de prueba de
 * los usuarios y duplican la configuración de mesas si se corren dos veces.
 */
Artisan::command('app:preparar-base', function () {
    if ($this->call('migrate', ['--force' => true]) !== 0) {
        return 1;
    }

    if (Usuario::query()->exists()) {
        $this->info('La base ya tiene datos: no se cargan los datos iniciales.');

        return 0;
    }

    $this->info('Base vacía: se cargan los datos iniciales.');

    return $this->call('db:seed', ['--force' => true]);
})->purpose('Crea las tablas que falten y carga los datos iniciales si la base está vacía');
