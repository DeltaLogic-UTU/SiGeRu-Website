<?php
header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? 'listar';

$trabajadores = [
    ['id_trabajador'=>101,'nombre'=>'Albert','apellido'=>'Einstein','rol'=>'chofer','estado'=>'activo','asignacion'=>'SBK-3265'],
    ['id_trabajador'=>102,'nombre'=>'Leonardo','apellido'=>'da Vinci','rol'=>'chofer','estado'=>'activo','asignacion'=>'SAE-5268'],
    ['id_trabajador'=>201,'nombre'=>'María','apellido'=>'Pérez','rol'=>'operario','estado'=>'activo','asignacion'=>'Centro de acopio Norte']
];

if ($accion === 'listar') responder(true, 'Trabajadores obtenidos.', $trabajadores);
if ($accion === 'crear' || $accion === 'modificar') responder(true, 'Datos de trabajador validados.', $datos);
if ($accion === 'eliminar') responder(true, 'Trabajador eliminado en modo prototipo.');
responder(false, 'Acción no válida.', null, 400);

function responder(bool $success, string $message, mixed $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
