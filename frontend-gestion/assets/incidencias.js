const incidentData={
camiones:[
{id:1,recurso:'SBK-3265',tipo:'Mantenimiento',estado:'Resuelta',fecha_reporte:'2026-07-18',fecha_resolucion:'2026-07-18',descripcion:'Cambio preventivo de filtros y revisión general.',responsable:'Taller municipal',resolucion:'Filtros sustituidos y vehículo liberado.'},
{id:2,recurso:'SAE-5268',tipo:'Mecánica',estado:'En curso',fecha_reporte:'2026-07-24',fecha_resolucion:'',descripcion:'Revisión preventiva del sistema de frenos.',responsable:'Taller municipal',resolucion:'Diagnóstico en proceso.'},
{id:3,recurso:'SCE-1235',tipo:'Sistema hidráulico',estado:'Abierta',fecha_reporte:'2026-07-24',fecha_resolucion:'',descripcion:'Falla detectada en el sistema hidráulico. El camión permanece en base.',responsable:'',resolucion:''},
{id:4,recurso:'SDT-5632',tipo:'Neumático',estado:'Resuelta',fecha_reporte:'2026-07-20',fecha_resolucion:'2026-07-20',descripcion:'Daño en neumático trasero.',responsable:'Taller municipal',resolucion:'Neumático sustituido.'}
],
contenedores:[
{id:101,recurso:'CONT-CH0985',tipo:'Desborde',estado:'Abierta',fecha_reporte:'2026-07-19',fecha_resolucion:'',descripcion:'Contenedor desbordado en 8 de Octubre y Estero Bellaco.',responsable:'',resolucion:''},
{id:102,recurso:'CONT-B0152',tipo:'Rotura',estado:'Resuelta',fecha_reporte:'2026-07-18',fecha_resolucion:'2026-07-18',descripcion:'Tapa rota.',responsable:'Cuadrilla B-02',resolucion:'Tapa sustituida durante el turno.'},
{id:103,recurso:'CONT-F0056',tipo:'Falta de recolección',estado:'En curso',fecha_reporte:'2026-07-22',fecha_resolucion:'',descripcion:'El contenedor no fue atendido en la ruta prevista.',responsable:'Cuadrilla CH_01',resolucion:'Recolección reprogramada.'},
{id:104,recurso:'CONT-A0215',tipo:'Rotura',estado:'Abierta',fecha_reporte:'2026-07-24',fecha_resolucion:'',descripcion:'Daño en una rueda y dificultad para moverlo.',responsable:'',resolucion:''}
]};

const state={tab:'camiones'};
const body=document.getElementById('incidentBody');
const head=document.getElementById('incidentHead');
const form=document.getElementById('incidentForm');
const modal=bootstrap.Modal.getOrCreateInstance(document.getElementById('incidentModal'));

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
const formatDate=value=>value?value.split('-').reverse().join('/'):'Pendiente';

function summary(){
  const rows=incidentData[state.tab];
  return {
    abiertas:rows.filter(item=>item.estado==='Abierta').length,
    curso:rows.filter(item=>item.estado==='En curso').length,
    resueltas:rows.filter(item=>item.estado==='Resuelta').length
  };
}

function render(){
  const rows=incidentData[state.tab];
  const counts=summary();
  document.getElementById('incidentTitle').textContent=`Incidencias de ${state.tab}`;
  head.innerHTML='<tr><th>Recurso</th><th>Tipo</th><th>Estado</th><th>Fecha de reporte</th><th>Fecha de resolución</th><th>Responsable</th><th>Administrar</th></tr>';
  body.innerHTML=rows.length?rows.map(item=>`<tr>
<td><strong>${esc(item.recurso)}</strong></td><td>${esc(item.tipo)}</td><td>${esc(item.estado)}</td>
<td>${formatDate(item.fecha_reporte)}</td><td>${formatDate(item.fecha_resolucion)}</td><td>${esc(item.responsable||'Sin asignar')}</td>
<td><button class="btn btn-outline btn-sm" data-manage-incident="${item.id}" type="button"><i class="bi bi-clipboard-check"></i> Administrar</button></td></tr>`).join(''):
'<tr><td colspan="7" class="text-center py-4">No hay incidencias registradas.</td></tr>';
  document.querySelector('[data-incident-summary]')?.remove();
  const panel=document.querySelector('.incident-page .personnel-tabs');
  panel.insertAdjacentHTML('afterend',`<div class="incident-summary" data-incident-summary>
<div><span>Abiertas</span><strong>${counts.abiertas}</strong></div>
<div><span>En curso</span><strong>${counts.curso}</strong></div>
<div><span>Resueltas</span><strong>${counts.resueltas}</strong></div></div>`);
}

function openManagement(id){
  const item=incidentData[state.tab].find(row=>row.id===Number(id));
  if(!item)return;
  document.getElementById('incidentId').value=item.id;
  document.getElementById('incidentModalTitle').textContent=`${item.recurso} · ${item.tipo}`;
  document.getElementById('incidentResourceText').textContent=item.recurso;
  document.getElementById('incidentTypeText').textContent=item.tipo;
  document.getElementById('incidentDateText').textContent=formatDate(item.fecha_reporte);
  document.getElementById('incidentCurrentState').textContent=item.estado;
  document.getElementById('incidentDescriptionText').textContent=item.descripcion;
  document.getElementById('incidentState').value=item.estado;
  document.getElementById('incidentResponsible').value=item.responsable||'';
  document.getElementById('incidentResolution').value=item.resolucion||'';
  modal.show();
}

async function syncIncident(item){
  if(location.protocol==='file:')return;
  const endpoint=state.tab==='camiones'
    ?'../api-gestion/incidencias_camiones.php'
    :'../api-gestion/incidencias_contenedores.php';
  try{
    await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        accion:'administrar',
        id_incidencia:item.id,
        estado:item.estado,
        responsable:item.responsable,
        resolucion:item.resolucion
      })
    });
  }catch(_){}
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const item=incidentData[state.tab].find(row=>row.id===Number(document.getElementById('incidentId').value));
  if(!item)return;
  const newState=document.getElementById('incidentState').value;
  item.estado=newState;
  item.responsable=document.getElementById('incidentResponsible').value.trim();
  item.resolucion=document.getElementById('incidentResolution').value.trim();
  item.fecha_resolucion=newState==='Resuelta'?new Date().toISOString().slice(0,10):'';
  await syncIncident(item);
  modal.hide();
  render();
});

document.querySelectorAll('[data-incident-tab]').forEach(button=>button.addEventListener('click',()=>{
  state.tab=button.dataset.incidentTab;
  document.querySelectorAll('[data-incident-tab]').forEach(item=>{
    item.classList.toggle('btn-primary',item===button);
    item.classList.toggle('btn-outline',item!==button);
    item.classList.toggle('active',item===button);
  });
  render();
}));

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-manage-incident]');
  if(button)openManagement(button.dataset.manageIncident);
});

render();
