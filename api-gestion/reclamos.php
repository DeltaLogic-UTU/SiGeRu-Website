<?php
header('Content-Type: application/json; charset=utf-8');

$datos=json_decode(file_get_contents('php://input'),true)??[];
$accion=$datos['accion']??$_GET['accion']??'listar';

$reclamos=[
 ['id_reclamo'=>'Jun26-B7483','reclamante'=>'Juana Castillos','contacto'=>'091 589 965','categoria'=>'Contenedor desbordado','ubicacion'=>'Mercedes esq. Río Branco','estado'=>'sin_asignar','cuadrilla'=>null,'contenedor'=>'CONT-B0152'],
 ['id_reclamo'=>'Jun26-C9753','reclamante'=>'María De María','contacto'=>'091 589 965','categoria'=>'Contenedor desbordado','ubicacion'=>'Av. Millán esq. Sitio Grande','estado'=>'asignado','cuadrilla'=>'B-02','contenedor'=>'CONT-CH0985'],
 ['id_reclamo'=>'Jun26-1236','reclamante'=>'Juliet Lopez','contacto'=>'091 589 965','categoria'=>'Contenedor desbordado','ubicacion'=>'Av. Gral. Rivera esq. Santiago Rivas','estado'=>'completado','cuadrilla'=>'CH-03','contenedor'=>'CONT-A0215']
];

if($accion==='listar')responder(true,'Reclamos obtenidos.',$reclamos);

if(in_array($accion,['asignar','quitar_asignacion','completar','reabrir','notificar'],true)){
    validar($datos,['id_reclamo']);
    responder(true,'Reclamo actualizado en modo prototipo.',$datos);
}

responder(false,'Acción no válida.',null,400);

function validar(array $datos,array $campos):void{
    foreach($campos as $campo){
        if(trim((string)($datos[$campo]??''))==='')responder(false,"El campo $campo es obligatorio.",null,400);
    }
}
function responder(bool $success,string $message,mixed $data=null,int $status=200):void{
    http_response_code($status);
    echo json_encode(compact('success','message','data'),JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
    exit;
}
