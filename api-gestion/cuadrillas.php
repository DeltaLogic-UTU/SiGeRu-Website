<?php
header('Content-Type: application/json; charset=utf-8');

$datos=json_decode(file_get_contents('php://input'),true)??[];
$accion=$datos['accion']??$_GET['accion']??'listar';

$cuadrillas=[
 ['id_cuadrilla'=>'B-02','responsable'=>'Diego Forlán','turno'=>'Nocturno','estado'=>'En servicio','ubicacion'=>'B_01',
  'integrantes'=>['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez'],
  'historial_limpieza'=>[
    ['circuito'=>'B_01','fecha_asignacion'=>'2026-07-20','fecha_finalizacion'=>'2026-07-20'],
    ['circuito'=>'B_02','fecha_asignacion'=>'2026-07-24','fecha_finalizacion'=>'Pendiente']
  ],
  'historial_reclamos'=>[
    ['reclamo'=>'Jun26-C9753','fecha_asignacion'=>'2026-06-26','fecha_finalizacion'=>'Pendiente']
  ],
  'historial_incidencias'=>[
    ['codigo'=>'INC-B02-01','tipo'=>'Contenedor desbordado','estado'=>'Resuelta','fecha_reporte'=>'2026-06-28','fecha_resolucion'=>'2026-06-28','descripcion'=>'Punto normalizado.']
  ]],
 ['id_cuadrilla'=>'B-03','responsable'=>'Luis Suárez','turno'=>'Nocturno','estado'=>'Regresando','ubicacion'=>'B_03',
  'integrantes'=>['Rodrigo Bentancur','José María Giménez','Sergio Rochet','Nicolás de la Cruz'],
  'historial_limpieza'=>[['circuito'=>'B_03','fecha_asignacion'=>'2026-07-21','fecha_finalizacion'=>'2026-07-21']],
  'historial_reclamos'=>[['reclamo'=>'Jun26-A1234','fecha_asignacion'=>'2026-06-27','fecha_finalizacion'=>'2026-06-27']],
  'historial_incidencias'=>[]],
 ['id_cuadrilla'=>'CH_03','responsable'=>'Juana de Ibarbourou','turno'=>'Nocturno','estado'=>'En base','ubicacion'=>'CH_114',
  'integrantes'=>['Delmira Agustini','Idea Vilariño','Mario Benedetti','Amanda Berenguer'],
  'historial_limpieza'=>[['circuito'=>'CH_114','fecha_asignacion'=>'2026-07-22','fecha_finalizacion'=>'2026-07-22']],
  'historial_reclamos'=>[['reclamo'=>'Jun26-1236','fecha_asignacion'=>'2026-06-19','fecha_finalizacion'=>'2026-06-19']],
  'historial_incidencias'=>[['codigo'=>'INC-CH03-01','tipo'=>'Rotura de contenedor','estado'=>'Resuelta','fecha_reporte'=>'2026-06-19','fecha_resolucion'=>'2026-06-19','descripcion'=>'Contenedor fuera de servicio.']]],
 ['id_cuadrilla'=>'CH_01','responsable'=>'China Zorrilla','turno'=>'Nocturno','estado'=>'En servicio','ubicacion'=>'CH_109',
  'integrantes'=>['Estela Medina','Antonio Larreta','Dahd Sfeir','Walter Reyno'],
  'historial_limpieza'=>[['circuito'=>'CH_109','fecha_asignacion'=>'2026-07-25','fecha_finalizacion'=>'Pendiente']],
  'historial_reclamos'=>[['reclamo'=>'Jun26-F0056','fecha_asignacion'=>'2026-07-22','fecha_finalizacion'=>'Pendiente']],
  'historial_incidencias'=>[]],
 ['id_cuadrilla'=>'CH_02','responsable'=>'Natalia Oreiro','turno'=>'Nocturno','estado'=>'Esperando circuito','ubicacion'=>'CH_102',
  'integrantes'=>['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez'],
  'historial_limpieza'=>[['circuito'=>'CH_102','fecha_asignacion'=>'2026-07-25','fecha_finalizacion'=>'Pendiente']],
  'historial_reclamos'=>[],
  'historial_incidencias'=>[['codigo'=>'INC-CH02-01','tipo'=>'Falta de recolección','estado'=>'En curso','fecha_reporte'=>'2026-07-25','fecha_resolucion'=>'Pendiente','descripcion'=>'Demora operativa en el circuito.']]]
];

if($accion==='listar')responder(true,'Cuadrillas obtenidas.',$cuadrillas);
if($accion==='crear'||$accion==='modificar'){
 validar($datos,['id_cuadrilla','responsable','turno','estado','ubicacion']);
 responder(true,'Cuadrilla validada correctamente.',$datos,$accion==='crear'?201:200);
}
if(in_array($accion,['agregar_integrante','modificar_integrante','eliminar_integrante'],true)){
 validar($datos,['id_cuadrilla']);
 responder(true,'Operación de cuadrilla validada.',$datos);
}
if($accion==='asignar_circuito'){
 validar($datos,['id_cuadrilla','municipio','id_circuito']);
 $circuitos=[
  'B'=>['B_05','B_06','B_7'],
  'E'=>['E_102','E_103','E_106'],
  'CH'=>['CH_102','CH_109','CH_114','CH_115'],
  'C'=>['C_102']
 ];
 if(!isset($circuitos[$datos['municipio']])||!in_array($datos['id_circuito'],$circuitos[$datos['municipio']],true)){
  responder(false,'El circuito no corresponde al municipio seleccionado.',null,400);
 }
 responder(true,'Circuito asignado en modo prototipo.',$datos);
}
if($accion==='eliminar'){validar($datos,['id_cuadrilla']);responder(true,'Cuadrilla eliminada en modo prototipo.');}
responder(false,'Acción no válida.',null,400);

function validar(array $datos,array $campos):void{foreach($campos as $campo)if(trim((string)($datos[$campo]??''))==='')responder(false,"El campo $campo es obligatorio.",null,400);}
function responder(bool $success,string $message,mixed $data=null,int $status=200):void{http_response_code($status);echo json_encode(compact('success','message','data'),JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);exit;}
