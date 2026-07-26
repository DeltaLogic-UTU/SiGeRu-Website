const crews=[
  {
    id:'B-02',responsable:'Diego Forlán',turno:'Nocturno',estado:'En servicio',ubicacion:'B_01',
    integrantes:[
      {nombre:'Edinson Cavani',estado:'Activo',fecha:'2026-05-10'},
      {nombre:'Federico Valverde',estado:'Activo',fecha:'2026-05-10'},
      {nombre:'Valeria Ripoll',estado:'Activo',fecha:'2026-05-12'},
      {nombre:'Victoria Rodríguez',estado:'Activo',fecha:'2026-05-12'}
    ],
    historiales:{
      limpieza:[
        {circuito:'B_01',asignacion:'2026-07-20',finalizacion:'2026-07-20'},
        {circuito:'B_02',asignacion:'2026-07-24',finalizacion:'Pendiente'}
      ],
      reclamos:[
        {reclamo:'Jun26-C9753',asignacion:'2026-06-26',finalizacion:'Pendiente'},
        {reclamo:'Jun26-B7483',asignacion:'2026-06-28',finalizacion:'2026-06-28'}
      ],
      incidencias:[
        {codigo:'INC-B02-01',tipo:'Contenedor desbordado',estado:'Resuelta',reporte:'2026-06-28',resolucion:'2026-06-28',descripcion:'Se retiraron residuos acumulados y se normalizó el punto.'}
      ]
    }
  },
  {
    id:'B-03',responsable:'Luis Suárez',turno:'Nocturno',estado:'Regresando',ubicacion:'B_03',
    integrantes:[
      {nombre:'Rodrigo Bentancur',estado:'Activo',fecha:'2026-05-18'},
      {nombre:'José María Giménez',estado:'Activo',fecha:'2026-05-18'},
      {nombre:'Sergio Rochet',estado:'Activo',fecha:'2026-05-20'},
      {nombre:'Nicolás de la Cruz',estado:'Activo',fecha:'2026-05-20'}
    ],
    historiales:{
      limpieza:[
        {circuito:'B_03',asignacion:'2026-07-21',finalizacion:'2026-07-21'},
        {circuito:'B_04',asignacion:'2026-07-24',finalizacion:'2026-07-24'}
      ],
      reclamos:[
        {reclamo:'Jun26-A1234',asignacion:'2026-06-27',finalizacion:'2026-06-27'}
      ],
      incidencias:[]
    }
  },
  {
    id:'CH_03',responsable:'Juana de Ibarbourou',turno:'Nocturno',estado:'En base',ubicacion:'CH_114',
    integrantes:[
      {nombre:'Delmira Agustini',estado:'Activo',fecha:'2026-06-01'},
      {nombre:'Idea Vilariño',estado:'Activo',fecha:'2026-06-01'},
      {nombre:'Mario Benedetti',estado:'Activo',fecha:'2026-06-02'},
      {nombre:'Amanda Berenguer',estado:'Activo',fecha:'2026-06-02'}
    ],
    historiales:{
      limpieza:[{circuito:'CH_114',asignacion:'2026-07-22',finalizacion:'2026-07-22'}],
      reclamos:[{reclamo:'Jun26-1236',asignacion:'2026-06-19',finalizacion:'2026-06-19'}],
      incidencias:[
        {codigo:'INC-CH03-01',tipo:'Rotura de contenedor',estado:'Resuelta',reporte:'2026-06-19',resolucion:'2026-06-19',descripcion:'Se informó la rotura y se dejó el contenedor fuera de servicio.'}
      ]
    }
  },
  {
    id:'CH_01',responsable:'China Zorrilla',turno:'Nocturno',estado:'En servicio',ubicacion:'CH_109',
    integrantes:[
      {nombre:'Estela Medina',estado:'Activo',fecha:'2026-06-04'},
      {nombre:'Antonio Larreta',estado:'Activo',fecha:'2026-06-04'},
      {nombre:'Dahd Sfeir',estado:'Activo',fecha:'2026-06-05'},
      {nombre:'Walter Reyno',estado:'Activo',fecha:'2026-06-05'}
    ],
    historiales:{
      limpieza:[
        {circuito:'CH_108',asignacion:'2026-07-23',finalizacion:'2026-07-23'},
        {circuito:'CH_109',asignacion:'2026-07-25',finalizacion:'Pendiente'}
      ],
      reclamos:[{reclamo:'Jun26-F0056',asignacion:'2026-07-22',finalizacion:'Pendiente'}],
      incidencias:[]
    }
  },
  {
    id:'CH_02',responsable:'Natalia Oreiro',turno:'Nocturno',estado:'Esperando circuito',ubicacion:'CH_102',
    integrantes:[
      {nombre:'Edinson Cavani',estado:'Activo',fecha:'2026-05-10'},
      {nombre:'Federico Valverde',estado:'Activo',fecha:'2026-05-10'},
      {nombre:'Valeria Ripoll',estado:'Activo',fecha:'2026-05-12'},
      {nombre:'Victoria Rodríguez',estado:'Activo',fecha:'2026-05-12'}
    ],
    historiales:{
      limpieza:[
        {circuito:'CH_105',asignacion:'2026-07-24',finalizacion:'2026-07-24'},
        {circuito:'CH_102',asignacion:'2026-07-25',finalizacion:'Pendiente'}
      ],
      reclamos:[],
      incidencias:[
        {codigo:'INC-CH02-01',tipo:'Falta de recolección',estado:'En curso',reporte:'2026-07-25',resolucion:'Pendiente',descripcion:'Circuito pendiente de completar por demora operativa.'}
      ]
    }
  }
];

const crewState={selectedId:'B-02'};
const crewBody=document.getElementById('crewTableBody');
const membersBody=document.getElementById('crewMembersBody');
const cleaningHistoryBody=document.getElementById('crewCleaningHistoryBody');
const claimsHistoryBody=document.getElementById('crewClaimsHistoryBody');
const incidentsHistoryBody=document.getElementById('crewIncidentsHistoryBody');
const crewModal=bootstrap.Modal.getOrCreateInstance(document.getElementById('crewModal'));
const memberModal=bootstrap.Modal.getOrCreateInstance(document.getElementById('memberModal'));

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
const selectedCrew=()=>crews.find(item=>item.id===crewState.selectedId);
const emptyRow=(columns,message='Sin registros.')=>`<tr><td colspan="${columns}" class="text-center py-3 text-muted-custom">${message}</td></tr>`;

function historyCount(crew){
  return crew.historiales.limpieza.length+crew.historiales.reclamos.length+crew.historiales.incidencias.length;
}

function renderCrews(){
  crewBody.innerHTML=crews.map(item=>`<tr class="${item.id===crewState.selectedId?'table-active':''}" data-crew-select="${esc(item.id)}">
    <td><strong>${esc(item.id)}</strong></td>
    <td>${esc(item.responsable)}</td>
    <td>${esc(item.turno)}</td>
    <td>${esc(item.estado)}</td>
    <td>${esc(item.ubicacion)}</td>
    <td>${historyCount(item)}</td>
    <td>${item.integrantes.length}</td>
    <td><div class="d-flex gap-2">
      <button class="btn btn-outline btn-sm" data-crew-edit="${esc(item.id)}" type="button" aria-label="Editar ${esc(item.id)}"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-outline btn-sm" data-crew-delete="${esc(item.id)}" type="button" aria-label="Eliminar ${esc(item.id)}"><i class="bi bi-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function renderDetails(){
  const crew=selectedCrew();
  if(!crew){
    membersBody.innerHTML=emptyRow(4,'Seleccioná una cuadrilla.');
    cleaningHistoryBody.innerHTML=emptyRow(3);
    claimsHistoryBody.innerHTML=emptyRow(3);
    incidentsHistoryBody.innerHTML=emptyRow(6);
    return;
  }

  document.getElementById('crewMembersTitle').textContent=`Integrantes de ${crew.id}`;

  membersBody.innerHTML=crew.integrantes.length
    ?crew.integrantes.map((member,index)=>`<tr>
      <td><strong>${esc(member.nombre)}</strong></td>
      <td>${esc(member.estado)}</td>
      <td>${esc(member.fecha)}</td>
      <td><div class="d-flex gap-2">
        <button class="btn btn-outline btn-sm" data-member-edit="${index}" type="button" aria-label="Editar integrante"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline btn-sm" data-member-delete="${index}" type="button" aria-label="Eliminar integrante"><i class="bi bi-trash"></i></button>
      </div></td>
    </tr>`).join('')
    :emptyRow(4,'Sin integrantes.');

  cleaningHistoryBody.innerHTML=crew.historiales.limpieza.length
    ?crew.historiales.limpieza.map(item=>`<tr><td>${esc(item.circuito)}</td><td>${esc(item.asignacion)}</td><td>${esc(item.finalizacion)}</td></tr>`).join('')
    :emptyRow(3);

  claimsHistoryBody.innerHTML=crew.historiales.reclamos.length
    ?crew.historiales.reclamos.map(item=>`<tr><td>${esc(item.reclamo)}</td><td>${esc(item.asignacion)}</td><td>${esc(item.finalizacion)}</td></tr>`).join('')
    :emptyRow(3);

  incidentsHistoryBody.innerHTML=crew.historiales.incidencias.length
    ?crew.historiales.incidencias.map(item=>`<tr>
      <td><strong>${esc(item.codigo)}</strong></td>
      <td>${esc(item.tipo)}</td>
      <td>${esc(item.estado)}</td>
      <td>${esc(item.reporte)}</td>
      <td>${esc(item.resolucion)}</td>
      <td>${esc(item.descripcion)}</td>
    </tr>`).join('')
    :emptyRow(6);
}

function fillCrew(item={}){
  document.getElementById('crewOriginalId').value=item.id||'';
  document.getElementById('crewCodeInput').value=item.id||'';
  document.getElementById('crewChiefInput').value=item.responsable||'';
  document.getElementById('crewTurnInput').value=item.turno||'Nocturno';
  document.getElementById('crewStateInput').value=item.estado||'Disponible';
  document.getElementById('crewLocationInput').value=item.ubicacion||'';
  document.getElementById('crewModalTitle').textContent=item.id?'Editar cuadrilla':'Nueva cuadrilla';
}

document.getElementById('crewForm').addEventListener('submit',event=>{
  event.preventDefault();
  const original=document.getElementById('crewOriginalId').value;
  const previous=crews.find(item=>item.id===original);
  const item={
    id:document.getElementById('crewCodeInput').value.trim(),
    responsable:document.getElementById('crewChiefInput').value.trim(),
    turno:document.getElementById('crewTurnInput').value,
    estado:document.getElementById('crewStateInput').value.trim(),
    ubicacion:document.getElementById('crewLocationInput').value.trim(),
    integrantes:previous?.integrantes||[],
    historiales:previous?.historiales||{limpieza:[],reclamos:[],incidencias:[]}
  };

  const index=crews.findIndex(x=>x.id===original);
  if(index>=0)crews[index]=item;else crews.push(item);
  crewState.selectedId=item.id;
  crewModal.hide();
  renderCrews();
  renderDetails();
});

document.getElementById('memberForm').addEventListener('submit',event=>{
  event.preventDefault();
  const crew=selectedCrew();
  if(!crew)return;

  const rawIndex=document.getElementById('memberIndex').value;
  const item={
    nombre:document.getElementById('memberName').value.trim(),
    estado:document.getElementById('memberState').value,
    fecha:document.getElementById('memberDate').value
  };

  if(rawIndex!=='')crew.integrantes[Number(rawIndex)]=item;
  else crew.integrantes.push(item);

  memberModal.hide();
  renderCrews();
  renderDetails();
});

document.querySelector('[data-crew-new]').addEventListener('click',()=>{
  fillCrew();
  crewModal.show();
});

document.querySelector('[data-member-new]').addEventListener('click',()=>{
  if(!selectedCrew())return;
  document.getElementById('memberForm').reset();
  document.getElementById('memberIndex').value='';
  document.getElementById('memberDate').value=new Date().toISOString().slice(0,10);
  memberModal.show();
});

document.addEventListener('click',event=>{
  const row=event.target.closest('[data-crew-select]');
  const action=event.target.closest('button,a,input,select,textarea,label,[role="button"]');
  if(row&&!action){
    crewState.selectedId=row.dataset.crewSelect;
    renderCrews();
    renderDetails();
  }

  const edit=event.target.closest('[data-crew-edit]');
  if(edit){
    fillCrew(crews.find(item=>item.id===edit.dataset.crewEdit));
    crewModal.show();
  }

  const remove=event.target.closest('[data-crew-delete]');
  if(remove&&confirm('¿Eliminar la cuadrilla?')){
    const index=crews.findIndex(item=>item.id===remove.dataset.crewDelete);
    if(index>=0)crews.splice(index,1);
    crewState.selectedId=crews[0]?.id||null;
    renderCrews();
    renderDetails();
  }

  const memberEdit=event.target.closest('[data-member-edit]');
  if(memberEdit){
    const member=selectedCrew()?.integrantes[Number(memberEdit.dataset.memberEdit)];
    if(!member)return;
    document.getElementById('memberIndex').value=memberEdit.dataset.memberEdit;
    document.getElementById('memberName').value=member.nombre;
    document.getElementById('memberState').value=member.estado;
    document.getElementById('memberDate').value=member.fecha;
    document.getElementById('memberModalTitle').textContent='Editar integrante';
    memberModal.show();
  }

  const memberDelete=event.target.closest('[data-member-delete]');
  if(memberDelete&&selectedCrew()&&confirm('¿Eliminar el integrante?')){
    selectedCrew().integrantes.splice(Number(memberDelete.dataset.memberDelete),1);
    renderCrews();
    renderDetails();
  }
});

renderCrews();
renderDetails();
