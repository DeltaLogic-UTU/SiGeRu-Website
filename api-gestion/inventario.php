<?php
header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? 'listar';

$inventario = [
    ['id_inventario'=>1,'id_instalacion'=>1,'nombre_item'=>'Escoba','estado'=>'Excelente','tipo'=>'Limpieza','cantidad'=>52],
    ['id_inventario'=>2,'id_instalacion'=>1,'nombre_item'=>'Pala','estado'=>'Carencia','tipo'=>'Limpieza','cantidad'=>27],
    ['id_inventario'=>3,'id_instalacion'=>1,'nombre_item'=>'Llave inglesa','estado'=>'Óptimo','tipo'=>'Mantenimiento','cantidad'=>11],
    ['id_inventario'=>4,'id_instalacion'=>1,'nombre_item'=>'Carro de barrendero','estado'=>'Disponible','tipo'=>'Equipamiento','cantidad'=>18],
    ['id_inventario'=>5,'id_instalacion'=>1,'nombre_item'=>'Escobillón de calle','estado'=>'Disponible','tipo'=>'Limpieza','cantidad'=>35],
    ['id_inventario'=>6,'id_instalacion'=>1,'nombre_item'=>'Cepillo de cordón','estado'=>'Disponible','tipo'=>'Limpieza','cantidad'=>34],
    ['id_inventario'=>7,'id_instalacion'=>1,'nombre_item'=>'Recogedor industrial','estado'=>'Disponible','tipo'=>'Limpieza','cantidad'=>22],
    ['id_inventario'=>8,'id_instalacion'=>1,'nombre_item'=>'Pinza recolectora','estado'=>'Disponible','tipo'=>'Limpieza','cantidad'=>16],
    ['id_inventario'=>9,'id_instalacion'=>1,'nombre_item'=>'Rastrillo metálico','estado'=>'Disponible','tipo'=>'Limpieza','cantidad'=>15],
    ['id_inventario'=>10,'id_instalacion'=>1,'nombre_item'=>'Chaleco reflectivo','estado'=>'Disponible','tipo'=>'Seguridad','cantidad'=>48],
    ['id_inventario'=>11,'id_instalacion'=>1,'nombre_item'=>'Guantes de protección','estado'=>'Disponible','tipo'=>'Seguridad','cantidad'=>96],
    ['id_inventario'=>12,'id_instalacion'=>1,'nombre_item'=>'Conos de señalización','estado'=>'Disponible','tipo'=>'Seguridad','cantidad'=>30],
    ['id_inventario'=>13,'id_instalacion'=>1,'nombre_item'=>'Bolsas reforzadas','estado'=>'Disponible','tipo'=>'Insumo','cantidad'=>240]
];

if ($accion === 'listar') {
    $idInstalacion = (int)($_GET['id_instalacion'] ?? 0);
    if ($idInstalacion > 0) {
        $inventario = array_values(array_filter(
            $inventario,
            fn($item) => (int)$item['id_instalacion'] === $idInstalacion
        ));
    }
    responder(true, 'Inventario obtenido.', $inventario);
}

if ($accion === 'crear') {
    validar($datos, ['id_instalacion','nombre_item','estado','tipo','cantidad']);
    $datos['id_inventario'] = count($inventario) + 1;
    responder(true, 'Artículo validado correctamente.', $datos, 201);
}

if ($accion === 'modificar') {
    validar($datos, ['id_inventario','nombre_item','estado','tipo','cantidad']);
    responder(true, 'Artículo validado correctamente.', $datos);
}

if ($accion === 'eliminar') {
    validar($datos, ['id_inventario']);
    responder(true, 'Artículo eliminado en modo prototipo.');
}

responder(false, 'Acción no válida.', null, 400);

function validar(array $datos, array $campos): void {
    foreach ($campos as $campo) {
        if (!isset($datos[$campo]) || $datos[$campo] === '') {
            responder(false, "El campo $campo es obligatorio.", null, 400);
        }
    }
}

function responder(bool $success, string $message, mixed $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
