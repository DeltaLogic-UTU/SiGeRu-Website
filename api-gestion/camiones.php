<?php

header('Content-Type: application/json; charset=utf-8');

$datos = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $datos['accion'] ?? $_GET['accion'] ?? '';

$camiones = [
    [
        'id_camion' => 1,
        'matricula' => 'SBK-3265',
        'tipo' => 'mixto',
        'marca' => 'Scania',
        'modelo' => 'P250',
        'chasis' => 'CH-SBK-3265-001',
        'estado' => 'recolectando',
        'km_total' => 134567,
        'ult_carga_combustible' => '2026-07-23',
        'activo' => true,
        'km_en_turno' => 65.0,
        'tiempo_activo' => '06:34',
        'gps' => 'CH_102',
        'capacidad_kg' => 8000,
        'peso_recolectado_kg' => 3502.56,
        'contenedores_asignados' => 62,
        'contenedores_recolectados' => 25,
        'chofer_asignado' => 'Albert Einstein',
        'cuadrilla_acompanante' => 'B-02',
        'ruta_asignada' => 'R_B_105',
        'turno' => 'Nocturno'
    ],
    [
        'id_camion' => 2,
        'matricula' => 'SAE-5268',
        'tipo' => 'reciclaje',
        'marca' => 'Iveco',
        'modelo' => 'Eurocargo',
        'chasis' => 'CH-SAE-5268-002',
        'estado' => 'en circuito',
        'km_total' => 98320,
        'ult_carga_combustible' => '2026-07-23',
        'activo' => true,
        'km_en_turno' => 76.4,
        'tiempo_activo' => '05:48',
        'gps' => 'C_102',
        'capacidad_kg' => 7000,
        'peso_recolectado_kg' => 2100.10,
        'contenedores_asignados' => 48,
        'contenedores_recolectados' => 31,
        'chofer_asignado' => 'Leonardo da Vinci',
        'cuadrilla_acompanante' => null,
        'ruta_asignada' => 'R_C_102',
        'turno' => 'Nocturno'
    ],
    [
        'id_camion' => 3,
        'matricula' => 'SCE-1235',
        'tipo' => 'mixto',
        'marca' => 'Volkswagen',
        'modelo' => 'Constellation',
        'chasis' => 'CH-SCE-1235-003',
        'estado' => 'en base',
        'km_total' => 110845,
        'ult_carga_combustible' => '2026-07-22',
        'activo' => true,
        'km_en_turno' => 0,
        'tiempo_activo' => '00:00',
        'gps' => 'CH_114',
        'capacidad_kg' => 8000,
        'peso_recolectado_kg' => 0,
        'contenedores_asignados' => 0,
        'contenedores_recolectados' => 0,
        'chofer_asignado' => 'Frida Kahlo',
        'cuadrilla_acompanante' => null,
        'ruta_asignada' => '',
        'turno' => 'Nocturno'
    ],
    [
        'id_camion' => 4,
        'matricula' => 'SDT-5632',
        'tipo' => 'general',
        'marca' => 'Scania',
        'modelo' => 'P280',
        'chasis' => 'CH-SDT-5632-004',
        'estado' => 'dirigiéndose a vertedero',
        'km_total' => 145230,
        'ult_carga_combustible' => '2026-07-23',
        'activo' => true,
        'km_en_turno' => 128.1,
        'tiempo_activo' => '06:12',
        'gps' => 'CH_102',
        'capacidad_kg' => 8000,
        'peso_recolectado_kg' => 7250,
        'contenedores_asignados' => 58,
        'contenedores_recolectados' => 58,
        'chofer_asignado' => 'Julio César',
        'cuadrilla_acompanante' => 'CH_03',
        'ruta_asignada' => 'R_D_104',
        'turno' => 'Nocturno'
    ]
];

switch ($accion) {
    case 'listar':
        responder(true, 'Camiones obtenidos.', $camiones);
        break;

    case 'obtener':
        $id = $datos['id_camion'] ?? $_GET['id'] ?? null;
        foreach ($camiones as $camion) {
            if ($camion['id_camion'] == $id || $camion['matricula'] === $id) {
                responder(true, 'Camión encontrado.', $camion);
            }
        }
        responder(false, 'Camión no encontrado.');
        break;

    case 'crear':
        validar($datos, ['matricula', 'tipo', 'marca', 'modelo', 'estado']);
        responder(true, 'Camión creado en modo local.', [
            'id_camion' => count($camiones) + 1,
            'matricula' => $datos['matricula'],
            'tipo' => $datos['tipo'],
            'marca' => $datos['marca'],
            'modelo' => $datos['modelo'],
            'chasis' => $datos['chasis'] ?? '',
            'estado' => $datos['estado'],
            'km_total' => $datos['km_total'] ?? 0,
            'ult_carga_combustible' => $datos['ult_carga_combustible'] ?? null,
            'activo' => $datos['activo'] ?? true,
            'km_en_turno' => $datos['km_en_turno'] ?? 0,
            'tiempo_activo' => $datos['tiempo_activo'] ?? '00:00',
            'gps' => $datos['gps'] ?? '',
            'capacidad_kg' => $datos['capacidad_kg'] ?? 8000,
            'peso_recolectado_kg' => 0,
            'contenedores_asignados' => 0,
            'contenedores_recolectados' => 0,
            'chofer_asignado' => $datos['chofer_asignado'] ?? null,
            'cuadrilla_acompanante' => $datos['cuadrilla_acompanante'] ?? null,
            'ruta_asignada' => '',
            'turno' => $datos['turno'] ?? 'Nocturno'
        ]);
        break;

    case 'modificar':
        validar($datos, ['id_camion']);
        responder(true, 'Camión modificado en modo local.', $datos);
        break;

    case 'cambiar_estado':
        validar($datos, ['id_camion', 'estado']);
        responder(true, 'Estado del camión actualizado en modo local.', [
            'id_camion' => $datos['id_camion'],
            'estado' => $datos['estado']
        ]);
        break;

    case 'asignar_chofer':
        validar($datos, ['id_camion', 'chofer_asignado']);
        responder(true, 'Chofer actualizado en modo local.', [
            'id_camion' => $datos['id_camion'],
            'chofer_asignado' => $datos['chofer_asignado']
        ]);
        break;

    case 'asignar_acompanante':
        validar($datos, ['id_camion', 'cuadrilla_acompanante']);
        responder(true, 'Acompañante actualizado en modo local.', [
            'id_camion' => $datos['id_camion'],
            'cuadrilla_acompanante' => $datos['cuadrilla_acompanante']
        ]);
        break;

    case 'eliminar':
        validar($datos, ['id_camion']);
        responder(true, 'Camión dado de baja en modo local.', ['id_camion' => $datos['id_camion']]);
        break;

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
