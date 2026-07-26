<?php

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success' => true,
    'message' => 'API de Gestión SiGeRU funcionando.',
    'recursos' => [
        'contenedores',
        'incidencias_contenedores',
        'camiones',
        'cuadrillas',
        'rutas',
        'incidencias_camiones',
        'instalaciones',
        'inventario',
        'solicitudes',
        'trabajadores',
        'personal',
        'reclamos'
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
