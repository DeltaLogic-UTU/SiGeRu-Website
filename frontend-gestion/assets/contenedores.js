const DEFAULT_CONTAINERS=[
{id:1,codigo:'CONT-CH0985',modelo:'Ecopunto',tipo:'reciclaje',capacidad:3,estado:'roto',diasSinRecoleccion:2,calle:'Villasboas',esquina:'Av. Gral. Rivera',municipio:'CH',barrio:'Buceo',circuito:'CH_115',ultimoRegistro:'2026-07-24',imagen:'../resources/contenedor1.png',mapa:'../resources/mapa-contenedor1.png',historial:[
{fecha:'2026-07-24',tipo:'Incidencia',detalle:'Daño detectado en la estructura lateral.',estado:'Abierta'},
{fecha:'2026-07-10',tipo:'Mantenimiento',detalle:'Revisión de tapa y sistema de apertura.',estado:'Completado'},
{fecha:'2026-06-15',tipo:'Alta',detalle:'Contenedor incorporado al circuito CH_115.',estado:'Registrado'}]},
{id:2,codigo:'CONT-B0152',modelo:'EASY',tipo:'mixto',capacidad:2.25,estado:'desbordado',diasSinRecoleccion:4,calle:'Sarandí',esquina:'Ituzaingó',municipio:'B',barrio:'Ciudad Vieja',circuito:'B_05',ultimoRegistro:'2026-07-21',imagen:'../resources/contenedor2.png',mapa:'../resources/mapa-contenedor2.png',historial:[
{fecha:'2026-07-19',tipo:'Incidencia',detalle:'Desborde reportado por acumulación de residuos.',estado:'En curso'},
{fecha:'2026-07-01',tipo:'Limpieza',detalle:'Lavado interior y exterior.',estado:'Completado'},
{fecha:'2026-06-17',tipo:'Reubicación',detalle:'Traslado a Sarandí e Ituzaingó.',estado:'Completado'}]},
{id:3,codigo:'CONT-F0056',modelo:'Metálico',tipo:'general',capacidad:3,estado:'roto',diasSinRecoleccion:6,calle:'Veracruz',esquina:'Capitán Videla',municipio:'E',barrio:'Maroñas',circuito:'E_103',ultimoRegistro:'2026-07-19',imagen:'../resources/contenedor3.png',mapa:'../resources/mapa-contenedor3.png',historial:[
{fecha:'2026-07-22',tipo:'Incidencia',detalle:'Falta de recolección en el circuito previsto.',estado:'En curso'},
{fecha:'2026-06-28',tipo:'Mantenimiento',detalle:'Ajuste de ruedas y soldadura menor.',estado:'Completado'},
{fecha:'2026-06-12',tipo:'Inspección',detalle:'Se detectó desgaste general.',estado:'Registrado'}]},
{id:4,codigo:'CONT-A0215',modelo:'Metálico',tipo:'general',capacidad:3,estado:'funcional',diasSinRecoleccion:1,calle:'Japón',esquina:'Egipto',municipio:'C',barrio:'Centro',circuito:'C_102',ultimoRegistro:'2026-07-24',imagen:'../resources/contenedor4.png',mapa:'../resources/mapa-contenedor4.png',historial:[
{fecha:'2026-07-20',tipo:'Mantenimiento',detalle:'Cambio de rueda y lubricación.',estado:'Completado'},
{fecha:'2026-06-25',tipo:'Limpieza',detalle:'Lavado programado.',estado:'Completado'},
{fecha:'2026-06-10',tipo:'Alta',detalle:'Contenedor incorporado al circuito C_102.',estado:'Registrado'}]}
]

const STORAGE_KEY='sigeru-contenedores-v3';
const $=id=>document.getElementById(id);
const clone=value=>structuredClone(value);

function loadContainers(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!Array.isArray(saved))return clone(DEFAULT_CONTAINERS);
    return saved.map(item=>{
      const base=DEFAULT_CONTAINERS.find(def=>def.codigo===item.codigo);
      return {
        ...item,
        diasSinRecoleccion:Number.isFinite(Number(item.diasSinRecoleccion))?Number(item.diasSinRecoleccion):(base?.diasSinRecoleccion??2),
        historial:Array.isArray(item.historial)?item.historial:clone(base?.historial||[])
      };
    });
  }catch(_){return clone(DEFAULT_CONTAINERS);}
}

let containers=loadContainers();
let selectedId=null;
let editingId=null;

const tableBody=$('containerTableBody');
const detailPanel=$('containerDetailPanel');
const historyPanel=$('containerHistoryPanel');
const historyBody=$('containerHistoryBody');
const circuitOverview=$('circuitOverview');
const dataGrid=$('containerDataGrid');
const photo=$('containerPhoto');
const map=$('containerMap');
const form=$('containerForm');
const containerModal=bootstrap.Modal.getOrCreateInstance($('containerModal'));
const removeContainerModal=bootstrap.Modal.getOrCreateInstance($('removeContainerModal'));
const historyModal=bootstrap.Modal.getOrCreateInstance($('containerHistoryModal'));

const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(containers));
const formatDate=value=>value?value.split('-').reverse().join('/'):'—';
const label=value=>value?value.charAt(0).toUpperCase()+value.slice(1):'—';
const field=(name,value)=>`<div class="truck-field"><span>${name}</span><strong>${value||'—'}</strong></div>`;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);


function collectionBadge(days){
  const level=SiGeRUCircuitos.levelFromDays(days);
  return `<span class="collection-age collection-${level}"><span class="collection-dot" aria-hidden="true"></span>${SiGeRUCircuitos.labelFromDays(days)}</span>`;
}

function collectionDetailLabel(days){
  const level=SiGeRUCircuitos.levelFromDays(days);
  return `<span class="collection-detail collection-${level}">${SiGeRUCircuitos.labelFromDays(days)}</span>`;
}

function renderCircuitOverview(){
  if(!circuitOverview)return;
  circuitOverview.innerHTML=SiGeRUCircuitos.municipalities().flatMap((municipality)=>
    SiGeRUCircuitos.circuits(municipality).map((circuit)=>{
      const summary=SiGeRUCircuitos.summary(circuit);
      return `<article class="circuit-overview-card circuit-${summary.level}">
        <div><span>Municipio ${municipality}</span><strong>${circuit}</strong></div>
        <span class="circuit-status-dot" aria-hidden="true"></span>
        <div class="circuit-counts"><span>${summary.counts.verde} verdes</span><span>${summary.counts.amarillo} amarillos</span><span>${summary.counts.rojo} rojos</span></div>
      </article>`;
    })
  ).join('');
}

function renderTable(){
  tableBody.innerHTML=containers.map(item=>`<tr class="${item.id===selectedId?'active':''}">
<td><strong>${escapeHtml(item.codigo)}</strong></td><td>${escapeHtml(item.municipio)}</td><td>${escapeHtml(item.barrio)}</td><td>${escapeHtml(item.calle)}</td>
<td>${label(item.tipo)}</td><td>${label(item.estado)}</td><td>${collectionBadge(item.diasSinRecoleccion)}</td><td>${formatDate(item.ultimoRegistro)}</td>
<td><button class="btn btn-outline btn-sm" type="button" data-open-container="${item.id}" aria-label="Ver ${escapeHtml(item.codigo)}"><i class="bi bi-search"></i></button></td></tr>`).join('');
}

function renderHistory(container){
  historyBody.innerHTML=container.historial.length
    ?container.historial.map((entry,index)=>`<tr><td>${formatDate(entry.fecha)}</td><td>${escapeHtml(entry.tipo)}</td><td>${escapeHtml(entry.detalle)}</td><td>${escapeHtml(entry.estado)}</td>
<td><button class="btn btn-outline btn-sm" type="button" data-history-entry="${index}" aria-label="Ver registro"><i class="bi bi-search"></i></button></td></tr>`).join('')
    :'<tr><td colspan="5" class="text-center py-4">No hay registros en el historial.</td></tr>';
}

function showContainer(id){
  const item=containers.find(container=>container.id===Number(id));
  if(!item)return;
  selectedId=item.id;
  renderTable();
  detailPanel.classList.remove('d-none');
  historyPanel.classList.remove('d-none');
  $('containerTitle').textContent=item.codigo;
  $('containerStatus').textContent=label(item.estado);
  dataGrid.innerHTML=[
    field('Último registro',formatDate(item.ultimoRegistro)),field('Calle',item.calle),field('Esquina',item.esquina),
    field('Tipo',label(item.tipo)),field('Municipio',item.municipio),field('Circuito',item.circuito),
    field('Barrio',item.barrio),field('Estado',label(item.estado)),
    `<div class="truck-field"><span>Sin recolectar</span><strong>${collectionDetailLabel(item.diasSinRecoleccion)}</strong></div>`,
    field('Capacidad',`${item.capacidad} m³`)
  ].join('');
  photo.src=item.imagen;photo.alt=`Contenedor ${item.codigo}`;
  map.src=item.mapa;map.alt=`Ubicación de ${item.codigo}`;
  renderHistory(item);
}

function fillForm(item=null){
  editingId=item?.id??null;
  $('containerModalTitle').textContent=item?'Editar contenedor':'Agregar contenedor';
  form.reset();
  if(!item)return;
  const values={codigo:item.codigo,modelo:item.modelo,tipo:item.tipo,estado:item.estado,capacidad:item.capacidad,municipio:item.municipio,
    barrio:item.barrio,calle:item.calle,esquina:item.esquina,circuito:item.circuito,dias_sin_recoleccion:item.diasSinRecoleccion,ultimo_registro:item.ultimoRegistro};
  Object.entries(values).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??'';});
}

async function api(payload){
  if(location.protocol==='file:')return;
  try{await fetch('../api-gestion/contenedores.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch(_){}
}

$('addContainerBtn').addEventListener('click',()=>fillForm());
$('editContainerBtn').addEventListener('click',()=>{const item=containers.find(x=>x.id===selectedId);if(item){fillForm(item);containerModal.show();}});
$('removeContainerBtn').addEventListener('click',()=>{const item=containers.find(x=>x.id===selectedId);if(!item)return;$('removeContainerText').textContent=`¿Dar de baja ${item.codigo}?`;removeContainerModal.show();});

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(form));
  const duplicate=containers.some(item=>item.codigo.toUpperCase()===data.codigo.trim().toUpperCase()&&item.id!==editingId);
  if(duplicate){$('containerFormMessage').textContent='Ya existe un contenedor con ese código.';$('containerFormMessage').style.display='block';return;}

  if(editingId){
    const item=containers.find(x=>x.id===editingId);
    const previous={estado:item.estado,calle:item.calle,esquina:item.esquina,circuito:item.circuito,diasSinRecoleccion:item.diasSinRecoleccion};
    Object.assign(item,{codigo:data.codigo.trim().toUpperCase(),modelo:data.modelo.trim(),tipo:data.tipo,capacidad:Number(data.capacidad),estado:data.estado,
      calle:data.calle.trim(),esquina:data.esquina.trim(),municipio:data.municipio.trim().toUpperCase(),barrio:data.barrio.trim(),
      circuito:data.circuito.trim(),diasSinRecoleccion:Number(data.dias_sin_recoleccion),ultimoRegistro:data.ultimo_registro});
    const changes=[];
    if(previous.estado!==item.estado)changes.push(`Estado: ${label(previous.estado)} → ${label(item.estado)}`);
    if(previous.calle!==item.calle||previous.esquina!==item.esquina)changes.push(`Ubicación actualizada a ${item.calle} y ${item.esquina}`);
    if(previous.circuito!==item.circuito)changes.push(`Circuito: ${previous.circuito} → ${item.circuito}`);
    if(previous.diasSinRecoleccion!==item.diasSinRecoleccion)changes.push(`Sin recolectar: ${previous.diasSinRecoleccion} → ${item.diasSinRecoleccion} días`);
    if(previous.circuito===item.circuito){
      SiGeRUCircuitos.updateContainer(item.circuito,previous.diasSinRecoleccion,item.diasSinRecoleccion);
    }
    if(changes.length)item.historial.unshift({fecha:new Date().toISOString().slice(0,10),tipo:'Modificación',detalle:changes.join('. '),estado:'Registrado'});
    await api({accion:'modificar',id_contenedor:item.id,...item,ultimo_registro:item.ultimoRegistro});
    save();renderCircuitOverview();showContainer(item.id);
  }else{
    const id=Math.max(0,...containers.map(item=>item.id))+1;
    const item={id,codigo:data.codigo.trim().toUpperCase(),modelo:data.modelo.trim(),tipo:data.tipo,capacidad:Number(data.capacidad),estado:data.estado,
      calle:data.calle.trim(),esquina:data.esquina.trim(),municipio:data.municipio.trim().toUpperCase(),barrio:data.barrio.trim(),
      circuito:data.circuito.trim(),diasSinRecoleccion:Number(data.dias_sin_recoleccion),ultimoRegistro:data.ultimo_registro,imagen:'../resources/contenedor4.png',mapa:'../resources/mapa-contenedor4.png',
      historial:[{fecha:new Date().toISOString().slice(0,10),tipo:'Alta',detalle:'Contenedor agregado al sistema.',estado:'Registrado'}]};
    containers.push(item);
    await api({accion:'crear',...item,ultimo_registro:item.ultimoRegistro});
    save();renderCircuitOverview();showContainer(item.id);
  }
  $('containerFormMessage').style.display='none';
  containerModal.hide();
});

$('confirmRemoveContainer').addEventListener('click',async()=>{
  const id=selectedId;
  containers=containers.filter(item=>item.id!==id);
  save();await api({accion:'eliminar',id_contenedor:id});
  selectedId=null;detailPanel.classList.add('d-none');historyPanel.classList.add('d-none');renderTable();renderCircuitOverview();removeContainerModal.hide();
});

document.addEventListener('click',event=>{
  const open=event.target.closest('[data-open-container]');
  if(open)showContainer(open.dataset.openContainer);

  const historyButton=event.target.closest('[data-history-entry]');
  if(historyButton){
    const container=containers.find(item=>item.id===selectedId);
    const entry=container?.historial[Number(historyButton.dataset.historyEntry)];
    if(!entry)return;
    $('containerHistoryModalTitle').textContent=`${entry.tipo} · ${formatDate(entry.fecha)}`;
    $('containerHistoryCard').innerHTML=`<div class="incident-card-head"><div><span class="truck-kicker">${escapeHtml(container.codigo)}</span><h3>${escapeHtml(entry.tipo)}</h3></div><span class="truck-status">${escapeHtml(entry.estado)}</span></div>
<div class="incident-description"><span>Detalle</span><p>${escapeHtml(entry.detalle)}</p></div>`;
    historyModal.show();
  }
});

renderCircuitOverview();
renderTable();
