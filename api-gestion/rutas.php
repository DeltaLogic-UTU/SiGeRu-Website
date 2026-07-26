<?php

header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? '';

switch ($accion) {
    case 'crear_ruta':
        validar($datos, ['matricula', 'municipio', 'circuito']);

        $circuitos = [
            'B' => ['B_05', 'B_06', 'B_7'],
            'E' => ['E_102', 'E_103', 'E_106'],
            'CH' => ['CH_102', 'CH_109', 'CH_114', 'CH_115'],
            'C' => ['C_102']
        ];

        if (!isset($circuitos[$datos['municipio']]) ||
            !in_array($datos['circuito'], $circuitos[$datos['municipio']], true)) {
            responder(false, 'El circuito no corresponde al municipio seleccionado.');
        }

        responder(true, 'Ruta creada y asignada en modo local.', [
            'matricula' => $datos['matricula'],
            'municipio' => $datos['municipio'],
            'circuito' => $datos['circuito'],
            'estado' => 'Asignada'
        ]);

    case 'editar_ruta':
        validar($datos, ['matricula', 'circuito', 'estado']);
        if (!in_array($datos['estado'], ['Asignada', 'En curso', 'Finalizada'], true)) {
            responder(false, 'Estado de ruta no válido.');
        }
        responder(true, 'Estado de circuito actualizado en modo local.', [
            'matricula' => $datos['matricula'],
            'circuito' => $datos['circuito'],
            'estado' => $datos['estado']
        ]);

    case 'eliminar_ruta':
        validar($datos, ['matricula']);
        responder(true, 'Ruta quitada del camión en modo local.', [
            'matricula' => $datos['matricula'],
            'circuito_anterior' => $datos['circuito_actual'] ?? ''
        ]);

    default:
        responder(false, 'Acción no válida.');
}

function validar(array $datos, array $campos): void
{
    foreach ($campos as $campo) {
        if (!isset($datos[$campo]) || $datos[$campo] === '') {
            responder(false, "El campo $campo es obligatorio.");
        }
    }
}

function responder(bool $success, string $message, mixed $data = null): void
{
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
