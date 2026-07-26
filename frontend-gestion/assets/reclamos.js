const claims = [
  {
    id:'Jun26-B7483',
    reclamante:'Juana Castillos',
    contacto:'091 589 965',
    categoria:'Contenedor desbordado',
    ubicacion:'Mercedes esq. Río Branco',
    estado:'sin_asignar',
    prioridad:'Media',
    fecha:'2026-06-26',
    contenedor:'CONT-B0152',
    imagen:'../resources/Contenedor_Sin_Asignar.png',
    mapa:'../resources/Reclamo_Sin_Asignar.png',
    cuadrilla:null,
    cercanas:[
      {codigo:'B-02',distancia:'7 minutos',turno:'08:00 - 14:00',reclamos:3},
      {codigo:'B-01',distancia:'10 minutos',turno:'08:00 - 14:00',reclamos:4},
      {codigo:'B-03',distancia:'12 minutos',turno:'08:00 - 14:00',reclamos:5}
    ]
  },
  {
    id:'Jun26-C9753',
    reclamante:'María De María',
    contacto:'091 589 965',
    categoria:'Contenedor desbordado',
    ubicacion:'Av. Millán esq. Sitio Grande',
    estado:'asignado',
    prioridad:'Alta',
    fecha:'2026-06-26',
    contenedor:'CONT-CH0985',
    imagen:'../resources/Contenedor_Asignado.png',
    mapa:'../resources/Reclamo_Asignado.png',
    cuadrilla:'B-02',
    turno:'08:00 - 14:00',
    reclamosCuadrilla:[
      {id:'Jun26-C9753',fecha:'2026-06-26',estado:'Asignado'}
    ]
  },
  {
    id:'Jun26-1236',
    reclamante:'Juliet Lopez',
    contacto:'091 589 965',
    categoria:'Contenedor desbordado',
    ubicacion:'Av. Gral. Rivera esq. Santiago Rivas',
    estado:'completado',
    prioridad:'Baja',
    fecha:'2026-06-26',
    fechaResolucion:'2026-06-19 12:45',
    contenedor:'CONT-A0215',
    imagen:'../resources/Contenedor_Reclamo.png',
    mapa:'../resources/Reclamo_Completado.png',
    cuadrilla:'CH-03',
    resultado:'../resources/Contenedor_Reclamo_Completo.png',
    notificado:false
  }
];

const state={selectedId:null};
const lists={
  sin_asignar:document.getElementById('claimsUnassigned'),
  asignado:document.getElementById('claimsAssigned'),
  completado:document.getElementById('claimsCompleted')
};
const counters={
  sin_asignar:[document.getElementById('countUnassigned'),document.getElementById('badgeUnassigned')],
  asignado:[document.getElementById('countAssigned'),document.getElementById('badgeAssigned')],
  completado:[document.getElementById('countCompleted'),document.getElementById('badgeCompleted')]
};

const modal=bootstrap.Modal.getOrCreateInstance(document.getElementById('claimModal'));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
const field=(label,value)=>`<div class="truck-field"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`;

function statusLabel(claim){
  if(claim.estado==='sin_asignar')return 'Sin asignar';
  if(claim.estado==='asignado')return `Asignado a ${claim.cuadrilla}`;
  return `Completado por ${claim.cuadrilla}`;
}

function claimCard(claim){
  return `<button class="claim-card priority-${esc(claim.prioridad.toLowerCase())}" data-claim-id="${esc(claim.id)}" type="button">
    <div class="claim-card-top"><strong>${esc(claim.id)}</strong><span>${esc(statusLabel(claim))}</span></div>
    <p>${esc(claim.categoria)}</p>
    <small><i class="bi bi-geo-alt"></i>${esc(claim.ubicacion)}</small>
  </button>`;
}

function render(){
  Object.entries(lists).forEach(([status,container])=>{
    const rows=claims.filter(item=>item.estado===status);
    container.innerHTML=rows.length?rows.map(claimCard).join(''):'<div class="claims-empty">No hay reclamos en esta etapa.</div>';
    counters[status].forEach(counter=>counter.textContent=rows.length);
  });
  document.getElementById('claimsStatus').textContent='';
}

function ensureWorkflowData(claim){
  if(!Array.isArray(claim.cercanas)||!claim.cercanas.length){
    claim.cercanas=[
      {codigo:'B-02',distancia:'7 minutos',turno:'08:00 - 14:00',reclamos:3},
      {codigo:'B-01',distancia:'10 minutos',turno:'08:00 - 14:00',reclamos:4},
      {codigo:'B-03',distancia:'12 minutos',turno:'08:00 - 14:00',reclamos:5}
    ];
  }

  if(!claim.turno)claim.turno='08:00 - 14:00';

  if(!Array.isArray(claim.reclamosCuadrilla)||!claim.reclamosCuadrilla.length){
    claim.reclamosCuadrilla=[
      {id:claim.id,fecha:claim.fecha,estado:claim.estado==='completado'?'Completado':'Asignado'}
    ];
  }

  if(!claim.resultado)claim.resultado=claim.imagen;
  if(typeof claim.notificado!=='boolean')claim.notificado=false;
}

function nearbyCrews(claim){
  ensureWorkflowData(claim);
  return `<div class="claim-operation-card">
    <div class="claim-operation-head"><h3>Cuadrillas en turno cercanas</h3></div>
    <div class="table-responsive"><table class="table truck-table align-middle mb-0">
      <thead><tr><th>Cuadrilla</th><th>Distancia</th><th>Turno</th><th>Reclamos</th><th>Asignar</th></tr></thead>
      <tbody>${claim.cercanas.map(item=>`<tr>
        <td><strong>${esc(item.codigo)}</strong></td><td>${esc(item.distancia)}</td><td>${esc(item.turno)}</td><td>${item.reclamos}</td>
        <td><button class="btn btn-primary btn-sm" data-assign-crew="${esc(item.codigo)}" type="button">Asignar</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function assignedCrew(claim){
  ensureWorkflowData(claim);
  const assigned = claim.reclamosCuadrilla.find((item) => item.id === claim.id) || {
    id: claim.id,
    fecha: claim.fecha,
    estado: 'Asignado'
  };

  return `<div class="claim-operation-card">
    <div class="claim-operation-head"><h3>Cuadrilla ${esc(claim.cuadrilla)}</h3><span>Turno: ${esc(claim.turno)}</span></div>
    <div class="claim-assigned-list">
      <div>
        <span><strong>${esc(assigned.id)}</strong><small>${esc(assigned.fecha)}</small></span>
        <span>${esc(assigned.estado)}</span>
      </div>
    </div>
  </div>`;
}

function completedResult(claim){
  ensureWorkflowData(claim);
  return `<div class="claim-operation-card claim-result-card">
    <div class="claim-operation-head"><h3>Cuadrilla ${esc(claim.cuadrilla)}</h3><span>${esc(claim.fechaResolucion)}</span></div>
    <img src="${esc(claim.resultado)}" alt="Resultado del reclamo completado">
    <button class="btn btn-primary w-100" data-send-result type="button" ${claim.notificado?'disabled':''}>
      ${claim.notificado?'Resultado enviado':'Enviar resultado a '+esc(claim.reclamante)}
    </button>
  </div>`;
}

function openClaim(id){
  const claim=claims.find(item=>item.id===id);
  if(!claim)return;
  state.selectedId=id;
  ensureWorkflowData(claim);

  document.getElementById('claimModalTitle').textContent=claim.id;
  document.getElementById('claimModalKicker').textContent=statusLabel(claim);
  document.getElementById('claimDetail').innerHTML=[
    field('Reclamante',claim.reclamante),
    field('Contacto',claim.contacto),
    field('Categoría',claim.categoria),
    field('Contenedor',claim.contenedor),
    field('Ubicación',claim.ubicacion),
    field('Estado',statusLabel(claim))
  ].join('');
  document.getElementById('claimDescription').innerHTML=`<span>Descripción</span><p>${esc(claim.categoria)} en ${esc(claim.ubicacion)}.</p>`;
  const containerImage=document.getElementById('claimContainerImage');
  containerImage.src=claim.imagen;
  containerImage.alt=`Estado del contenedor ${claim.contenedor}`;
  const mapImage=document.getElementById('claimMapImage');
  mapImage.src=claim.mapa;
  mapImage.alt=`Mapa del reclamo ${claim.id}`;

  const operational=document.getElementById('claimOperationalPanel');
  operational.innerHTML=claim.estado==='sin_asignar'
    ?nearbyCrews(claim)
    :claim.estado==='asignado'
      ?assignedCrew(claim)
      :completedResult(claim);

  const actions=document.getElementById('claimActions');
  actions.innerHTML=claim.estado==='asignado'
    ?'<button class="btn btn-outline" data-unassign type="button">Quitar asignación</button><button class="btn btn-primary" data-complete type="button">Marcar completado</button>'
    :claim.estado==='completado'
      ?'<button class="btn btn-outline" data-reopen type="button">Reabrir reclamo</button>'
      :'';

  modal.show();
}

function selectedClaim(){return claims.find(item=>item.id===state.selectedId);}

async function syncClaim(action, claim, extra = {}) {
  if (location.protocol === 'file:') return;
  try {
    await fetch('../api-gestion/reclamos.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        accion: action,
        id_reclamo: claim.id,
        cuadrilla: claim.cuadrilla,
        estado: claim.estado,
        ...extra
      })
    });
  } catch (_) {}
}


document.addEventListener('click',event=>{
  const card=event.target.closest('[data-claim-id]');
  if(card){
    openClaim(card.dataset.claimId);
    return;
  }

  const claim=selectedClaim();
  if(!claim)return;

  const assign=event.target.closest('[data-assign-crew]');
  if(assign){
    claim.estado='asignado';
    claim.cuadrilla=assign.dataset.assignCrew;
    claim.turno='08:00 - 14:00';
    claim.reclamosCuadrilla=[{id:claim.id,fecha:claim.fecha,estado:'Asignado'}];
    ensureWorkflowData(claim);
    syncClaim('asignar',claim);
    modal.hide();
    render();
    return;
  }

  if(event.target.closest('[data-complete]')){
    claim.estado='completado';
    claim.fechaResolucion=new Date().toLocaleString('es-UY');
    claim.reclamosCuadrilla=[
      ...(claim.reclamosCuadrilla||[]).filter(item=>item.id!==claim.id),
      {id:claim.id,fecha:claim.fecha,estado:'Completado'}
    ];
    ensureWorkflowData(claim);
    syncClaim('completar',claim);
    modal.hide();
    render();
    return;
  }

  if(event.target.closest('[data-unassign]')){
    claim.estado='sin_asignar';
    claim.cuadrilla=null;
    claim.turno='';
    ensureWorkflowData(claim);
    syncClaim('quitar_asignacion',claim);
    modal.hide();
    render();
    return;
  }

  if(event.target.closest('[data-reopen]')){
    claim.estado='asignado';
    claim.cuadrilla=claim.cuadrilla||'CH-03';
    claim.turno=claim.turno||'08:00 - 14:00';
    claim.reclamosCuadrilla=[
      ...(claim.reclamosCuadrilla||[]).filter(item=>item.id!==claim.id),
      {id:claim.id,fecha:claim.fecha,estado:'Asignado'}
    ];
    ensureWorkflowData(claim);
    syncClaim('reabrir',claim);
    modal.hide();
    render();
    return;
  }

  if(event.target.closest('[data-send-result]')){
    claim.notificado=true;
    syncClaim('notificar',claim,{reclamante:claim.reclamante});
    openClaim(claim.id);
  }
});
render();
