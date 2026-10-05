<?php

test('la raiz responde con la documentacion del backend', function () {
    $this->get('/')
        ->assertOk()
        ->assertSee('API Restaurante')
        ->assertSee('/api/login-cliente');
});

test('lista los endpoints con metodo, seccion y badge de acceso', function () {
    $contenido = $this->get('/')->assertOk()->getContent();

    expect($contenido)
        ->toContain('/api/sesiones/{sesion}/cerrar')
        ->toContain('Operación de mesa (mozo)')
        ->toContain('Gerente')
        ->toMatch('/\d+ endpoints/');
});

test('ya no muestra la portada default de laravel', function () {
    $this->get('/')
        ->assertOk()
        ->assertDontSee("Let's get started");
});
