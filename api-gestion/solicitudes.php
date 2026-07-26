<?php
header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? 'listar';

if ($accion === 'listar') {
    responder(true, 'Las solicitudes se administran desde el almacenamiento local del prototipo.', []);
}

if ($accion === 'aprobar' || $accion === 'rechazar') {
    responder(true, 'Acción validada en modo prototipo.', [
        'id_solicitud'=>(int)($datos['id_solicitud'] ?? 0),
        'estado'=>$accion === 'aprobar' ? 'aprobada' : 'rechazada'
    ]);
}

responder(false, 'Acción no válida.', null, 400);

function responder(bool $success, string $message, mixed $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
