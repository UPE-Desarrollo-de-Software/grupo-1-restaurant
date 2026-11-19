<?php

namespace App\Providers;

use App\Repositories\CategoriaRepository;
use App\Repositories\ConfigMesaRepository;
use App\Repositories\DetallePedidoRepository;
use App\Repositories\EloquentCategoriaRepository;
use App\Repositories\EloquentConfigMesaRepository;
use App\Repositories\EloquentDetallePedidoRepository;
use App\Repositories\EloquentIngredienteRepository;
use App\Repositories\EloquentMesaRepository;
use App\Repositories\EloquentPagoRepository;
use App\Repositories\EloquentPedidoRepository;
use App\Repositories\EloquentPlatoRepository;
use App\Repositories\EloquentPreordenRepository;
use App\Repositories\EloquentPromocionRepository;
use App\Repositories\EloquentReservaRepository;
use App\Repositories\EloquentRolRepository;
use App\Repositories\EloquentUsuarioRepository;
use App\Repositories\IngredienteRepository;
use App\Repositories\MesaRepository;
use App\Repositories\PagoRepository;
use App\Repositories\PedidoRepository;
use App\Repositories\PlatoRepository;
use App\Repositories\PreordenRepository;
use App\Repositories\PromocionRepository;
use App\Repositories\ReservaRepository;
use App\Repositories\RolRepository;
use App\Repositories\UsuarioRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bindings de la arquitectura hexagonal: cada puerto (interfaz
     * Repository) se resuelve con su adaptador Eloquent. Los UseCases
     * inyectan Services y los Services inyectan estas interfaces:
     * la capa de persistencia se puede trocar (u ocultar con fakes en
     * tests) sin tocar la lógica de negocio.
     */
    public function register(): void
    {
        $this->app->bind(RolRepository::class, EloquentRolRepository::class);
        $this->app->bind(UsuarioRepository::class, EloquentUsuarioRepository::class);
        $this->app->bind(CategoriaRepository::class, EloquentCategoriaRepository::class);
        $this->app->bind(PlatoRepository::class, EloquentPlatoRepository::class);
        $this->app->bind(IngredienteRepository::class, EloquentIngredienteRepository::class);
        $this->app->bind(MesaRepository::class, EloquentMesaRepository::class);
        $this->app->bind(PedidoRepository::class, EloquentPedidoRepository::class);
        $this->app->bind(PagoRepository::class, EloquentPagoRepository::class);
        $this->app->bind(DetallePedidoRepository::class, EloquentDetallePedidoRepository::class);
        $this->app->bind(ConfigMesaRepository::class, EloquentConfigMesaRepository::class);
        $this->app->bind(ReservaRepository::class, EloquentReservaRepository::class);
        $this->app->bind(PromocionRepository::class, EloquentPromocionRepository::class);
        $this->app->bind(PreordenRepository::class, EloquentPreordenRepository::class);
    }

    /**
     * Rate limiters con nombre.
     *
     * `comensal` protege /cliente/*: 60 requests por minuto por VISITA
     * (la credencial es el Bearer = codigo_acceso) más una red de
     * seguridad de 600 por minuto por IP. Reemplaza al `throttle:60,1`
     * compartido: antes todas las mesas del local gastaban el mismo
     * cupo por IP y se frenaban entre ellas.
     */
    public function boot(): void
    {
        RateLimiter::for('comensal', function (Request $request) {
            // ThrottleRequests corre ANTES del middleware `cliente`
            // (tiene prioridad propia), así que todavía no hay mesa
            // resuelta: la llave sale del Bearer crudo, hasheado.
            $credencial = $request->bearerToken() ?? $request->ip();

            $respuesta = fn (Request $peticion, array $headers) => response()->json(
                ['message' => 'Demasiados pedidos seguidos: esperá un momento y volvé a intentar.'],
                429,
                $headers,
            );

            return [
                Limit::perMinute(60)->by(hash('sha256', $credencial))->response($respuesta),
                Limit::perMinute(600)->by($request->ip())->response($respuesta),
            ];
        });
    }
}
