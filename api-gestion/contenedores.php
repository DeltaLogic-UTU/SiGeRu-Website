<?php

header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? '';

$contenedores = [
    ['id_contenedor'=>1,'codigo'=>'CONT-CH0985','modelo'=>'Ecopunto','tipo'=>'reciclaje','capacidad'=>3,'estado'=>'roto','dias_sin_recoleccion'=>2,'calle'=>'Villasboas','esquina'=>'Av. Gral. Rivera','municipio'=>'CH','barrio'=>'Buceo','circuito'=>'CH_115','ultimo_registro'=>'2026-07-24'],
    ['id_contenedor'=>2,'codigo'=>'CONT-B0152','modelo'=>'EASY','tipo'=>'mixto','capacidad'=>2.25,'estado'=>'desbordado','dias_sin_recoleccion'=>4,'calle'=>'Sarandí','esquina'=>'Ituzaingó','municipio'=>'B','barrio'=>'Ciudad Vieja','circuito'=>'B_05','ultimo_registro'=>'2026-07-21'],
    ['id_contenedor'=>3,'codigo'=>'CONT-F0056','modelo'=>'Metálico','tipo'=>'general','capacidad'=>3,'estado'=>'roto','dias_sin_recoleccion'=>6,'calle'=>'Veracruz','esquina'=>'Capitán Videla','municipio'=>'E','barrio'=>'Maroñas','circuito'=>'E_103','ultimo_registro'=>'2026-07-19'],
    ['id_contenedor'=>4,'codigo'=>'CONT-A0215','modelo'=>'Metálico','tipo'=>'general','capacidad'=>3,'estado'=>'funcional','dias_sin_recoleccion'=>1,'calle'=>'Japón','esquina'=>'Egipto','municipio'=>'C','barrio'=>'Centro','circuito'=>'C_102','ultimo_registro'=>'2026-07-24']
];

switch ($accion) {
    case 'listar':
        responder(true, 'Contenedores obtenidos.', $contenedores);

    case 'obtener':
        $id = $datos['id_contenedor'] ?? $_GET['id'] ?? null;
        foreach ($contenedores as $contenedor) {
            if ($contenedor['id_contenedor'] == $id) responder(true, 'Contenedor encontrado.', $contenedor);
        }
        responder(false, 'Contenedor no encontrado.');

    case 'crear':
        validar($datos, ['codigo','modelo','tipo','capacidad','estado','calle','municipio']);
        responder(true, 'Contenedor creado en modo local.', [
            'id_contenedor'=>count($contenedores)+1,
            'codigo'=>$datos['codigo'],
            'modelo'=>$datos['modelo'],
            'tipo'=>$datos['tipo'],
            'capacidad'=>(float)$datos['capacidad'],
            'estado'=>$datos['estado'],
            'dias_sin_recoleccion'=>(int)($datos['dias_sin_recoleccion'] ?? 0),
            'calle'=>$datos['calle'],
            'esquina'=>$datos['esquina'] ?? '',
            'municipio'=>$datos['municipio'],
            'barrio'=>$datos['barrio'] ?? '',
            'circuito'=>$datos['circuito'] ?? '',
            'ultimo_registro'=>$datos['ultimo_registro'] ?? date('Y-m-d')
        ]);

    case 'modificar':
        validar($datos, ['id_contenedor']);
        responder(true, 'Contenedor modificado en modo local.', $datos);

    case 'eliminar':
        validar($datos, ['id_contenedor']);
        responder(true, 'Contenedor dado de baja en modo local.', ['id_contenedor'=>$datos['id_contenedor']]);

    default:
        responder(false, 'Acción no válida.');
}

function validar(array $datos, array $campos): void {
    foreach ($campos as $campo) {
        if (!isset($datos[$campo]) || $datos[$campo] === '') responder(false, "El campo $campo es obligatorio.");
    }
}

function responder(bool $success, string $message, mixed $data = null): void {
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
