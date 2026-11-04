<?php

use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);

    // Nunca se toca AWS en los tests.
    Storage::fake('s3');
});

/*
|--------------------------------------------------------------------------
| Helpers (nombres únicos: las funciones de Pest son globales)
|--------------------------------------------------------------------------
*/

function tokenImagen(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

function subirImagenPlato(int $id, mixed $archivo, string $rol = 'Gerente')
{
    app('auth')->forgetGuards();

    return test()
        ->withToken(tokenImagen($rol))
        ->post("/api/platos/{$id}/imagen", ['imagen' => $archivo], ['Accept' => 'application/json']);
}

function quitarImagenPlato(int $id, string $rol = 'Gerente')
{
    app('auth')->forgetGuards();

    return test()
        ->withToken(tokenImagen($rol))
        ->deleteJson("/api/platos/{$id}/imagen");
}

/*
|--------------------------------------------------------------------------
| Subida
|--------------------------------------------------------------------------
*/

test('sube la imagen, guarda el path y devuelve la url', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))
        ->assertOk()
        ->assertJsonPath('plato.id', $plato->id)
        ->assertJsonStructure(['message', 'plato' => ['id', 'imagen', 'imagen_url']]);

    $path = $plato->fresh()->imagen;

    expect($path)->toStartWith('platos/');
    Storage::disk('s3')->assertExists($path);
});

test('reemplazar la imagen borra la anterior de S3', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('uno.jpg'))->assertOk();
    $primera = $plato->fresh()->imagen;

    subirImagenPlato($plato->id, UploadedFile::fake()->image('dos.png'))->assertOk();
    $segunda = $plato->fresh()->imagen;

    expect($segunda)->not->toBe($primera);
    Storage::disk('s3')->assertMissing($primera);
    Storage::disk('s3')->assertExists($segunda);
});

test('quitar la imagen la borra de S3 y deja el campo en null', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $path = $plato->fresh()->imagen;

    quitarImagenPlato($plato->id)->assertOk();

    expect($plato->fresh()->imagen)->toBeNull();
    Storage::disk('s3')->assertMissing($path);
});

/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

test('rechaza archivos que no son imagen', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->create('menu.pdf', 100, 'application/pdf'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');

    expect($plato->fresh()->imagen)->toBeNull();
});

test('rechaza imágenes de más de 2 MB', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('grande.jpg')->size(3000))
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');
});

test('exige el campo imagen', function () {
    $plato = Plato::factory()->create();

    subirImagenPlato($plato->id, null)
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');
});

/*
|--------------------------------------------------------------------------
| Permisos y errores
|--------------------------------------------------------------------------
*/

test('devuelve 403 sin el permiso gestionar_platos', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'), rol: 'Mozo')
        ->assertForbidden();

    expect($plato->fresh()->imagen)->toBeNull();
    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('devuelve 404 si el plato no existe', function () {
    subirImagenPlato(999999, UploadedFile::fake()->image('plato.jpg'))
        ->assertNotFound();

    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

/*
|--------------------------------------------------------------------------
| Accessor imagen_url
|--------------------------------------------------------------------------
*/

test('imagen_url es null cuando el plato no tiene imagen', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    expect($plato->imagen_url)->toBeNull();
});

test('imagen_url respeta URLs externas ya guardadas', function () {
    $plato = Plato::factory()->create(['imagen' => 'https://ejemplo.com/foto.jpg']);

    expect($plato->imagen_url)->toBe('https://ejemplo.com/foto.jpg');
});
