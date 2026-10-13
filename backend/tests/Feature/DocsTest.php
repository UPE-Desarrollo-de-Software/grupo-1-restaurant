<?php

test('la raiz responde con la documentacion del backend', function () {
    $this->get('/')
        ->assertOk()
        ->assertSee('API Restaurante')
        ->assertSee('/api/login');
});

test('lista los endpoints con metodo, seccion y badge de acceso', function () {
    $contenido = $this->get('/')->assertOk()->getContent();

    expect($contenido)
        ->toContain('/api/mesas/{mesa}/pedidos')
        ->toContain('Pedidos')
        ->toContain('Gerente')
        ->toMatch('/\d+ endpoints/');
});

test('ya no muestra la portada default de laravel', function () {
    $this->get('/')
        ->assertOk()
        ->assertDontSee("Let's get started");
});
