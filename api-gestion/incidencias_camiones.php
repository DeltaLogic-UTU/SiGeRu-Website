<?php
header('Content-Type: application/json; charset=utf-8');

$datos=json_decode(file_get_contents('php://input'),true)??[];
$accion=$datos['accion']??$_GET['accion']??'listar';

$incidencias=[
 ['id_incidencia'=>1,'recurso'=>'SBK-3265','tipo'=>'Mantenimiento','estado'=>'Resuelta','fecha_reporte'=>'2026-07-18','fecha_resolucion'=>'2026-07-18','descripcion'=>'Cambio preventivo de filtros y revisión general.','responsable'=>'Taller municipal','resolucion'=>'Filtros sustituidos y vehículo liberado.'],
 ['id_incidencia'=>2,'recurso'=>'SAE-5268','tipo'=>'Mecánica','estado'=>'En curso','fecha_reporte'=>'2026-07-24','fecha_resolucion'=>null,'descripcion'=>'Revisión preventiva del sistema de frenos.','responsable'=>'Taller municipal','resolucion'=>'Diagnóstico en proceso.'],
 ['id_incidencia'=>3,'recurso'=>'SCE-1235','tipo'=>'Sistema hidráulico','estado'=>'Abierta','fecha_reporte'=>'2026-07-24','fecha_resolucion'=>null,'descripcion'=>'Falla detectada en el sistema hidráulico.','responsable'=>'','resolucion'=>''],
 ['id_incidencia'=>4,'recurso'=>'SDT-5632','tipo'=>'Neumático','estado'=>'Resuelta','fecha_reporte'=>'2026-07-20','fecha_resolucion'=>'2026-07-20','descripcion'=>'Daño en neumático trasero.','responsable'=>'Taller municipal','resolucion'=>'Neumático sustituido.']
];

if($accion==='listar')responder(true,'Incidencias de camiones obtenidas.',$incidencias);

if($accion==='administrar'||$accion==='resolver'){
    validar($datos,['id_incidencia','estado']);
    if(!in_array($datos['estado'],['Abierta','En curso','Resuelta'],true)){
        responder(false,'Estado no válido.',null,400);
    }
    $resultado=[
        'id_incidencia'=>(int)$datos['id_incidencia'],
        'estado'=>$datos['estado'],
        'responsable'=>trim((string)($datos['responsable']??'')),
        'resolucion'=>trim((string)($datos['resolucion']??'')),
        'fecha_resolucion'=>$datos['estado']==='Resuelta'?date('Y-m-d'):null
    ];
    responder(true,'Incidencia administrada correctamente.',$resultado);
}

responder(false,'Acción no válida.',null,400);

function validar(array $datos,array $campos):void{foreach($campos as $campo)if(trim((string)($datos[$campo]??''))==='')responder(false,"El campo $campo es obligatorio.",null,400);}
function responder(bool $success,string $message,mixed $data=null,int $status=200):void{http_response_code($status);echo json_encode(compact('success','message','data'),JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);exit;}
