<?php
header('Content-Type: application/json; charset=utf-8');

$accion = $_GET['accion'] ?? 'listar';
if ($accion !== 'listar') responder(false, 'Acción no válida.', null, 400);

$cuadrillas = [
    ['id'=>'B-02','tipo'=>'cuadrilla','nombre'=>'Cuadrilla B-02','responsable'=>'Diego Forlán','estado'=>'En servicio','turno'=>'Nocturno','ubicacion'=>'B_01','integrantes'=>['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez']],
    ['id'=>'B-03','tipo'=>'cuadrilla','nombre'=>'Cuadrilla B-03','responsable'=>'Luis Suárez','estado'=>'Regresando','turno'=>'Nocturno','ubicacion'=>'B_03','integrantes'=>['Rodrigo Bentancur','José María Giménez','Sergio Rochet','Nicolás de la Cruz']],
    ['id'=>'CH_03','tipo'=>'cuadrilla','nombre'=>'Cuadrilla CH_03','responsable'=>'Juana de Ibarbourou','estado'=>'En base','turno'=>'Nocturno','ubicacion'=>'CH_114','integrantes'=>['Delmira Agustini','Idea Vilariño','Mario Benedetti','Amanda Berenguer']],
    ['id'=>'CH_01','tipo'=>'cuadrilla','nombre'=>'Cuadrilla CH_01','responsable'=>'China Zorrilla','estado'=>'En servicio','turno'=>'Nocturno','ubicacion'=>'CH_109','integrantes'=>['Estela Medina','Antonio Larreta','Dahd Sfeir','Walter Reyno']],
    ['id'=>'CH_02','tipo'=>'cuadrilla','nombre'=>'Cuadrilla CH_02','responsable'=>'Natalia Oreiro','estado'=>'Esperando circuito','turno'=>'Nocturno','ubicacion'=>'CH_102','integrantes'=>['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez']]
];

$choferes = [
    ['id_trabajador'=>101,'nombre'=>'Albert','apellido'=>'Einstein','documento'=>'4.111.111-1','telefono'=>'099 111 111','email'=>'albert@sigeru.uy','rol'=>'chofer','licencia'=>'CAT-C-3265','estado'=>'activo','asignacion'=>'SBK-3265'],
    ['id_trabajador'=>102,'nombre'=>'Leonardo','apellido'=>'da Vinci','documento'=>'4.222.222-2','telefono'=>'099 222 222','email'=>'leonardo@sigeru.uy','rol'=>'chofer','licencia'=>'CAT-C-5268','estado'=>'activo','asignacion'=>'SAE-5268'],
    ['id_trabajador'=>103,'nombre'=>'Frida','apellido'=>'Kahlo','documento'=>'4.333.333-3','telefono'=>'099 333 333','email'=>'frida@sigeru.uy','rol'=>'chofer','licencia'=>'CAT-C-1235','estado'=>'activo','asignacion'=>'SCE-1235'],
    ['id_trabajador'=>104,'nombre'=>'Julio','apellido'=>'César','documento'=>'4.666.666-6','telefono'=>'099 666 666','email'=>'julio@sigeru.uy','rol'=>'chofer','licencia'=>'CAT-C-5632','estado'=>'activo','asignacion'=>'SDT-5632']
];

$operarios = [
    ['id_trabajador'=>201,'nombre'=>'María','apellido'=>'Pérez','documento'=>'4.444.444-4','telefono'=>'099 444 444','email'=>'maria@sigeru.uy','rol'=>'operario','estado'=>'activo','asignacion'=>'Centro de acopio Norte'],
    ['id_trabajador'=>202,'nombre'=>'Carlos','apellido'=>'Silva','documento'=>'4.555.555-5','telefono'=>'099 555 555','email'=>'carlos@sigeru.uy','rol'=>'operario','estado'=>'activo','asignacion'=>'Vertedero Oeste'],
    ['id_trabajador'=>203,'nombre'=>'Lucía','apellido'=>'Rodríguez','documento'=>'4.777.777-7','telefono'=>'099 777 777','email'=>'lucia@sigeru.uy','rol'=>'operario','estado'=>'activo','asignacion'=>'Centro de reciclaje Sur']
];

$barrenderos = json_decode(<<<'JSON'
[{"id_trabajador": 301, "nombre": "Edinson", "apellido": "Cavani", "documento": "5.101.201-1", "telefono": "098 301 401", "email": "edinson.cavani@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-02", "CH_02"], "turnos": ["Nocturno"], "ubicaciones": ["B_01", "CH_102"]}, {"id_trabajador": 302, "nombre": "Federico", "apellido": "Valverde", "documento": "5.102.202-2", "telefono": "098 302 402", "email": "federico.valverde@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-02", "CH_02"], "turnos": ["Nocturno"], "ubicaciones": ["B_01", "CH_102"]}, {"id_trabajador": 303, "nombre": "Valeria", "apellido": "Ripoll", "documento": "5.103.203-3", "telefono": "098 303 403", "email": "valeria.ripoll@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-02", "CH_02"], "turnos": ["Nocturno"], "ubicaciones": ["B_01", "CH_102"]}, {"id_trabajador": 304, "nombre": "Victoria", "apellido": "Rodríguez", "documento": "5.104.204-4", "telefono": "098 304 404", "email": "victoria.rodriguez@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-02", "CH_02"], "turnos": ["Nocturno"], "ubicaciones": ["B_01", "CH_102"]}, {"id_trabajador": 305, "nombre": "Rodrigo", "apellido": "Bentancur", "documento": "5.105.205-5", "telefono": "098 305 405", "email": "rodrigo.bentancur@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-03"], "turnos": ["Nocturno"], "ubicaciones": ["B_03"]}, {"id_trabajador": 306, "nombre": "José", "apellido": "María Giménez", "documento": "5.106.206-6", "telefono": "098 306 406", "email": "jose.maria.gimenez@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-03"], "turnos": ["Nocturno"], "ubicaciones": ["B_03"]}, {"id_trabajador": 307, "nombre": "Sergio", "apellido": "Rochet", "documento": "5.107.207-7", "telefono": "098 307 407", "email": "sergio.rochet@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-03"], "turnos": ["Nocturno"], "ubicaciones": ["B_03"]}, {"id_trabajador": 308, "nombre": "Nicolás", "apellido": "de la Cruz", "documento": "5.108.208-8", "telefono": "098 308 408", "email": "nicolas.de.la.cruz@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["B-03"], "turnos": ["Nocturno"], "ubicaciones": ["B_03"]}, {"id_trabajador": 309, "nombre": "Delmira", "apellido": "Agustini", "documento": "5.109.209-9", "telefono": "098 309 409", "email": "delmira.agustini@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_03"], "turnos": ["Nocturno"], "ubicaciones": ["CH_114"]}, {"id_trabajador": 310, "nombre": "Idea", "apellido": "Vilariño", "documento": "5.110.210-0", "telefono": "098 310 410", "email": "idea.vilarino@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_03"], "turnos": ["Nocturno"], "ubicaciones": ["CH_114"]}, {"id_trabajador": 311, "nombre": "Mario", "apellido": "Benedetti", "documento": "5.111.211-1", "telefono": "098 311 411", "email": "mario.benedetti@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_03"], "turnos": ["Nocturno"], "ubicaciones": ["CH_114"]}, {"id_trabajador": 312, "nombre": "Amanda", "apellido": "Berenguer", "documento": "5.112.212-2", "telefono": "098 312 412", "email": "amanda.berenguer@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_03"], "turnos": ["Nocturno"], "ubicaciones": ["CH_114"]}, {"id_trabajador": 313, "nombre": "Estela", "apellido": "Medina", "documento": "5.113.213-3", "telefono": "098 313 413", "email": "estela.medina@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_01"], "turnos": ["Nocturno"], "ubicaciones": ["CH_109"]}, {"id_trabajador": 314, "nombre": "Antonio", "apellido": "Larreta", "documento": "5.114.214-4", "telefono": "098 314 414", "email": "antonio.larreta@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_01"], "turnos": ["Nocturno"], "ubicaciones": ["CH_109"]}, {"id_trabajador": 315, "nombre": "Dahd", "apellido": "Sfeir", "documento": "5.115.215-5", "telefono": "098 315 415", "email": "dahd.sfeir@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_01"], "turnos": ["Nocturno"], "ubicaciones": ["CH_109"]}, {"id_trabajador": 316, "nombre": "Walter", "apellido": "Reyno", "documento": "5.116.216-6", "telefono": "098 316 416", "email": "walter.reyno@sigeru.uy", "rol": "barrendero", "estado": "activo", "cuadrillas": ["CH_01"], "turnos": ["Nocturno"], "ubicaciones": ["CH_109"]}]
JSON, true);

responder(true, 'Personal obtenido.', [
    'cuadrillas'=>$cuadrillas,
    'choferes'=>$choferes,
    'operarios'=>$operarios,
    'barrenderos'=>$barrenderos
]);

function responder(bool $success, string $message, mixed $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success'=>$success,'message'=>$message,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
