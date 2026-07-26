<?php
header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? 'listar';

$instalaciones = [
    ['id_instalacion'=>1,'nombre'=>'Estación BUCEO','tipo'=>'Depósito','estado'=>'Operativo','calle'=>'Av. Gral. Rivera','esquina_1'=>'Managripé','esquina_2'=>'Vanguardia','capacidad_actual'=>'Casi lleno'],
    ['id_instalacion'=>2,'nombre'=>'Cantón 2','tipo'=>'Depósito','estado'=>'No operativo','calle'=>'Dr. Carlos María de Pena','esquina_1'=>'Cnel. Arana','esquina_2'=>'Filadelfia','capacidad_actual'=>'Lleno'],
    ['id_instalacion'=>3,'nombre'=>'Usina 3','tipo'=>'Depósito','estado'=>'Operativo','calle'=>'Camino Corrales','esquina_1'=>'Pavón','esquina_2'=>'Añagualpo','capacidad_actual'=>'Disponible'],
    ['id_instalacion'=>4,'nombre'=>'Géminis','tipo'=>'Centro de acopio','estado'=>'Operativo','calle'=>'Géminis','esquina_1'=>'Pilar','esquina_2'=>'Senda','capacidad_actual'=>'Casi lleno'],
    ['id_instalacion'=>5,'nombre'=>'Durán','tipo'=>'Centro de acopio','estado'=>'No operativo','calle'=>'José Durán','esquina_1'=>'Antonio Taddei','esquina_2'=>'Durán Pasaje A','capacidad_actual'=>'Lleno'],
    ['id_instalacion'=>6,'nombre'=>'Tróccoli','tipo'=>'Centro de acopio','estado'=>'Operativo','calle'=>'La Paloma','esquina_1'=>'Tróccoli','esquina_2'=>'Joaquín Martorí','capacidad_actual'=>'Disponible'],
    ['id_instalacion'=>7,'nombre'=>'Felipe Cardoso','tipo'=>'Vertedero','estado'=>'Operativo','calle'=>'Felipe Cardoso','esquina_1'=>'Cepeda','esquina_2'=>'Punta Rieles','capacidad_actual'=>'Disponible']
];

if ($accion === 'listar') responder(true, 'Instalaciones obtenidas.', $instalaciones);

if ($accion === 'crear') {
    validar($datos, ['nombre','tipo','estado','calle']);
    $datos['id_instalacion'] = count($instalaciones) + 1;
    responder(true, 'Instalación validada correctamente.', $datos, 201);
}

if ($accion === 'modificar') {
    validar($datos, ['id_instalacion','nombre','tipo','estado','calle']);
    responder(true, 'Instalación validada correctamente.', $datos);
}

if ($accion === 'eliminar') {
    validar($datos, ['id_instalacion']);
    responder(true, 'Instalación eliminada en modo prototipo.');
}

responder(false, 'Acción no válida.', null, 400);

function validar(array $datos, array $campos): void {
    foreach ($campos as $campo) {
        if (trim((string)($datos[$campo] ?? '')) === '') {
            responder(false, "El campo $campo es obligatorio.", null, 400);
        }
    }
}

function responder(bool $success, string $message, mixed $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
