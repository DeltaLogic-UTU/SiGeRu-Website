<?php

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success' => true,
    'message' => 'API de Usuarios SiGeRU funcionando.',
    'archivo_principal' => 'validations.php',
    'acciones' => [
        'login',
        'registro',
        'perfil',
        'solicitud_acceso'
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);