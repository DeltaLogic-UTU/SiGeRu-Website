<?php
header('Content-Type: application/json; charset=utf-8');

$datos=json_decode(file_get_contents('php://input'),true)??[];
$accion=$datos['accion']??$_GET['accion']??'listar';

$incidencias=[
 ['id_incidencia'=>101,'recurso'=>'CONT-CH0985','tipo'=>'Desborde','estado'=>'Abierta','fecha_reporte'=>'2026-07-19','fecha_resolucion'=>null,'descripcion'=>'Contenedor desbordado.','responsable'=>'','resolucion'=>''],
 ['id_incidencia'=>102,'recurso'=>'CONT-B0152','tipo'=>'Rotura','estado'=>'Resuelta','fecha_reporte'=>'2026-07-18','fecha_resolucion'=>'2026-07-18','descripcion'=>'Tapa rota.','responsable'=>'Cuadrilla B-02','resolucion'=>'Tapa sustituida durante el turno.'],
 ['id_incidencia'=>103,'recurso'=>'CONT-F0056','tipo'=>'Falta de recolección','estado'=>'En curso','fecha_reporte'=>'2026-07-22','fecha_resolucion'=>null,'descripcion'=>'No fue atendido en la ruta prevista.','responsable'=>'Cuadrilla CH_01','resolucion'=>'Recolección reprogramada.'],
 ['id_incidencia'=>104,'recurso'=>'CONT-A0215','tipo'=>'Rotura','estado'=>'Abierta','fecha_reporte'=>'2026-07-24','fecha_resolucion'=>null,'descripcion'=>'Daño en una rueda.','responsable'=>'','resolucion'=>'']
];

if($accion==='listar')responder(true,'Incidencias de contenedores obtenidas.',$incidencias);

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
