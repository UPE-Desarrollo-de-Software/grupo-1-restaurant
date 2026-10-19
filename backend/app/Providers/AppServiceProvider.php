<?php

namespace App\Providers;

use App\Repositories\CategoriaRepository;
use App\Repositories\DetallePedidoRepository;
use App\Repositories\EloquentCategoriaRepository;
use App\Repositories\EloquentDetallePedidoRepository;
use App\Repositories\EloquentIngredienteRepository;
use App\Repositories\EloquentMesaRepository;
use App\Repositories\EloquentParametroRepository;
use App\Repositories\EloquentPedidoRepository;
use App\Repositories\EloquentPlatoRepository;
use App\Repositories\EloquentReservaRepository;
use App\Repositories\EloquentRolRepository;
use App\Repositories\EloquentUsuarioRepository;
use App\Repositories\IngredienteRepository;
use App\Repositories\MesaRepository;
use App\Repositories\ParametroRepository;
use App\Repositories\PedidoRepository;
use App\Repositories\PlatoRepository;
use App\Repositories\ReservaRepository;
use App\Repositories\RolRepository;
use App\Repositories\UsuarioRepository;
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
        $this->app->bind(DetallePedidoRepository::class, EloquentDetallePedidoRepository::class);
        $this->app->bind(ParametroRepository::class, EloquentParametroRepository::class);
        $this->app->bind(ReservaRepository::class, EloquentReservaRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
