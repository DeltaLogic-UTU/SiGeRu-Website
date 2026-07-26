<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Solo se permite POST.', null, 405);
}

$datos = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$accion = $datos['accion'] ?? '';

if ($accion === 'registro') registrar($datos);
if ($accion === 'login') login($datos);
if ($accion === 'perfil') perfil($datos);
responder(false, 'Acción no válida.', null, 400);

function registrar(array $datos): void {
    foreach (['nombre','apellido','documento','telefono','email','password','perfil','motivo'] as $campo) {
        if (trim((string)($datos[$campo] ?? '')) === '') responder(false, "El campo $campo es obligatorio.", null, 400);
    }
    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) responder(false, 'El correo no es válido.', null, 400);
    if (strlen($datos['password']) < 8) responder(false, 'La contraseña debe tener 8 o más caracteres.', null, 400);
    if (($datos['perfil'] ?? '') === 'chofer' && trim((string)($datos['licencia'] ?? '')) === '') {
        responder(false, 'La licencia es obligatoria para chofer.', null, 400);
    }

    responder(true, 'Solicitud validada y registrada en el prototipo local.', [
        'id_solicitud'=>time(),
        'nombre'=>trim($datos['nombre']),
        'apellido'=>trim($datos['apellido']),
        'documento'=>trim($datos['documento']),
        'telefono'=>trim($datos['telefono']),
        'email'=>strtolower(trim($datos['email'])),
        'perfil'=>strtolower(trim($datos['perfil'])),
        'licencia'=>trim((string)($datos['licencia'] ?? '')),
        'estado'=>'pendiente',
        'fecha_solicitud'=>date('Y-m-d H:i:s')
    ], 201);
}

function login(array $datos): void {
    $usuario = strtolower(trim($datos['usuario'] ?? ''));
    $password = $datos['password'] ?? '';
    $demo = [
        'vecino@sigeru.uy'=>['password'=>'Sigeru123','rol'=>'vecino'],
        'cuadrilla@sigeru.uy'=>['password'=>'Sigeru123','rol'=>'cuadrilla'],
        'operario@sigeru.uy'=>['password'=>'Sigeru123','rol'=>'operario'],
        'chofer@sigeru.uy'=>['password'=>'Sigeru123','rol'=>'chofer'],
        'admin@sigeru.uy'=>['password'=>'Sigeru123','rol'=>'administrador']
    ];
    if (isset($demo[$usuario]) && hash_equals($demo[$usuario]['password'], $password)) {
        responder(true, 'Inicio de sesión correcto.', ['email'=>$usuario], 200, $demo[$usuario]['rol']);
    }
    responder(false, 'Usuario o contraseña incorrectos.', null, 401);
}

function perfil(array $datos): void {
    foreach (['nombre','apellido','documento','telefono','email','rol'] as $campo) {
        if (trim((string)($datos[$campo] ?? '')) === '') {
            responder(false, "El campo $campo es obligatorio.", null, 400);
        }
    }

    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        responder(false, 'El correo no es válido.', null, 400);
    }

    if (!in_array($datos['rol'], ['administrador','vecino'], true)) {
        responder(false, 'El perfil no puede editar ese rol.', null, 403);
    }

    if (!empty($datos['password']) && strlen($datos['password']) < 8) {
        responder(false, 'La nueva contraseña debe tener 8 o más caracteres.', null, 400);
    }

    responder(true, 'Perfil validado correctamente.', [
        'nombre'=>trim($datos['nombre']),
        'apellido'=>trim($datos['apellido']),
        'documento'=>trim($datos['documento']),
        'telefono'=>trim($datos['telefono']),
        'email'=>strtolower(trim($datos['email'])),
        'rol'=>$datos['rol']
    ]);
}

function responder(bool $success, string $message, mixed $data = null, int $status = 200, ?string $rol = null): void {
    http_response_code($status);
    $response = ['success'=>$success,'message'=>$message,'data'=>$data];
    if ($rol !== null) $response['rol'] = $rol;
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
