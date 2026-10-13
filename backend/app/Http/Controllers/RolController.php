<?php

namespace App\Http\Controllers;

use App\Models\Rol;

class RolController extends Controller
{
    //

    public function index()
    {
        return Rol::all();
    }
}
