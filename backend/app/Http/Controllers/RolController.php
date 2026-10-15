<?php

namespace App\Http\Controllers;

use App\UseCases\Roles\ListarRolesUseCase;

/**
 * Roles disponibles (para el alta de usuarios en el front).
 */
class RolController extends Controller
{
    public function __construct(private ListarRolesUseCase $listarRoles) {}

    public function index()
    {
        return response()->json(($this->listarRoles)(), 200);
    }
}
