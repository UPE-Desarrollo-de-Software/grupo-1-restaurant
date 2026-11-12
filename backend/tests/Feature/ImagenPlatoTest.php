<?php

use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

/**
 * En la BD se guarda la URL completa. Para consultar el disco hay que
 * volver al path del archivo dentro del bucket (ej. `platos/xxx.jpg`).
 */
function rutaS3(string $url): string
{
    $base = rtrim(Storage::disk('s3')->url(''), '/').'/';

    return Str::after($url, $base);
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

/**
 * Datos válidos para crear/editar un plato, tomados de la factory.
 * Se excluyen `imagen` e `imagen_url`: la imagen solo entra por su ruta.
 *
 * @return array<string, mixed>
 */
function datosPlatoImagen(array $extra = []): array
{
    $datos = Arr::except(Plato::factory()->make()->toArray(), ['imagen', 'imagen_url']);

    return array_merge($datos, $extra);
}

/** Crear plato por JSON (como trabaja el front). */
function crearPlatoJson(array $datos, string $rol = 'Gerente')
{
    app('auth')->forgetGuards();

    return test()
        ->withToken(tokenImagen($rol))
        ->postJson('/api/platos', $datos);
}

/** Editar plato por JSON. El PUT exige el plato completo; `$datos` pisa los valores. */
function actualizarPlatoJson(int $id, array $datos, string $rol = 'Gerente')
{
    app('auth')->forgetGuards();

    return test()
        ->withToken(tokenImagen($rol))
        ->putJson("/api/platos/{$id}", array_merge(datosPlatoImagen(), $datos));
}

/*
|--------------------------------------------------------------------------
| Subida
|--------------------------------------------------------------------------
*/

test('sube la imagen, guarda la url y la devuelve', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))
        ->assertOk()
        ->assertJsonPath('plato.id', $plato->id)
        ->assertJsonStructure(['message', 'plato' => ['id', 'imagen', 'imagen_url']]);

    $url = $plato->fresh()->imagen;
    $path = rutaS3($url);

    expect($path)->toStartWith('platos/');
    expect($url)->toBe(Storage::disk('s3')->url($path));
    Storage::disk('s3')->assertExists($path);
});

test('reemplazar la imagen borra la anterior de S3', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('uno.jpg'))->assertOk();
    $primera = $plato->fresh()->imagen;

    subirImagenPlato($plato->id, UploadedFile::fake()->image('dos.png'))->assertOk();
    $segunda = $plato->fresh()->imagen;

    expect($segunda)->not->toBe($primera);
    Storage::disk('s3')->assertMissing(rutaS3($primera));
    Storage::disk('s3')->assertExists(rutaS3($segunda));
});

test('reemplazar una url externa vieja no intenta borrar nada ajeno', function () {
    $plato = Plato::factory()->create(['imagen' => 'https://ejemplo.com/foto.jpg']);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('propia.jpg'))->assertOk();

    $url = $plato->fresh()->imagen;

    expect($url)->not->toBe('https://ejemplo.com/foto.jpg');
    Storage::disk('s3')->assertExists(rutaS3($url));
});

test('quitar la imagen la borra de S3 y deja el campo en null', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $url = $plato->fresh()->imagen;

    quitarImagenPlato($plato->id)->assertOk();

    expect($plato->fresh()->imagen)->toBeNull();
    Storage::disk('s3')->assertMissing(rutaS3($url));
});

/*
|--------------------------------------------------------------------------
| Crear / editar por JSON no tocan la imagen
|--------------------------------------------------------------------------
*/

test('crear un plato por JSON lo deja sin imagen', function () {
    $datos = datosPlatoImagen();

    crearPlatoJson($datos)->assertSuccessful();

    $plato = Plato::where('nombre', $datos['nombre'])->firstOrFail();

    expect($plato->imagen)->toBeNull();
    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('crear ignora una imagen enviada como texto y no la guarda', function () {
    $datos = datosPlatoImagen(['imagen' => 'https://ejemplo.com/inventada.jpg']);

    crearPlatoJson($datos)->assertSuccessful();

    $plato = Plato::where('nombre', $datos['nombre'])->firstOrFail();

    expect($plato->imagen)->toBeNull();
});

test('editar un plato por JSON conserva la imagen que ya tenía', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $url = $plato->fresh()->imagen;

    actualizarPlatoJson($plato->id, ['nombre' => 'Nombre editado'])->assertSuccessful();

    expect($plato->fresh()->nombre)->toBe('Nombre editado');
    expect($plato->fresh()->imagen)->toBe($url);
    Storage::disk('s3')->assertExists(rutaS3($url));
});

test('editar ignora una imagen enviada como texto y conserva la actual', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $url = $plato->fresh()->imagen;

    // El front reenvía el plato con la URL actual (o cualquier texto).
    actualizarPlatoJson($plato->id, [
        'nombre' => 'Nombre editado',
        'imagen' => 'https://ejemplo.com/inventada.jpg',
    ])->assertSuccessful();

    expect($plato->fresh()->imagen)->toBe($url);
    Storage::disk('s3')->assertExists(rutaS3($url));
});

/*
|--------------------------------------------------------------------------
| Eliminar plato
|--------------------------------------------------------------------------
*/

test('eliminar un plato borra su imagen de S3', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $url = $plato->fresh()->imagen;

    app('auth')->forgetGuards();
    test()
        ->withToken(tokenImagen('Gerente'))
        ->deleteJson("/api/platos/{$plato->id}")
        ->assertSuccessful();

    expect(Plato::find($plato->id))->toBeNull();
    Storage::disk('s3')->assertMissing(rutaS3($url));
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
    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('rechaza imágenes de más de 2 MB', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('grande.jpg')->size(3000))
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');

    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('rechaza una imagen enviada como texto', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, 'https://ejemplo.com/inventada.jpg')
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');

    expect($plato->fresh()->imagen)->toBeNull();
});

test('exige el campo imagen', function () {
    $plato = Plato::factory()->create();

    subirImagenPlato($plato->id, null)
        ->assertStatus(422)
        ->assertJsonValidationErrors('imagen');
});

test('un rechazo no borra la imagen anterior', function () {
    $plato = Plato::factory()->create(['imagen' => null]);

    subirImagenPlato($plato->id, UploadedFile::fake()->image('plato.jpg'))->assertOk();
    $url = $plato->fresh()->imagen;

    subirImagenPlato($plato->id, UploadedFile::fake()->create('menu.pdf', 100, 'application/pdf'))
        ->assertStatus(422);

    expect($plato->fresh()->imagen)->toBe($url);
    expect(Storage::disk('s3')->allFiles())->toBe([rutaS3($url)]);
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

test('quitar la imagen devuelve 403 sin el permiso gestionar_platos', function () {
    $plato = Plato::factory()->create(['imagen' => 'https://ejemplo.com/foto.jpg']);

    quitarImagenPlato($plato->id, rol: 'Mozo')->assertForbidden();

    expect($plato->fresh()->imagen)->toBe('https://ejemplo.com/foto.jpg');
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

test('imagen_url respeta URLs ya guardadas', function () {
    $plato = Plato::factory()->create(['imagen' => 'https://ejemplo.com/foto.jpg']);

    expect($plato->imagen_url)->toBe('https://ejemplo.com/foto.jpg');
});
