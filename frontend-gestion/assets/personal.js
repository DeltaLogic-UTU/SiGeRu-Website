const personnelState = {
  current: 'cuadrillas',
  editIndex: null,
  data: { cuadrillas: [], choferes: [], operarios: [], barrenderos: [] }
};

const personnelHead = document.getElementById('personnelTableHead');
const personnelBody = document.getElementById('personnelTableBody');
const personnelTitle = document.getElementById('personnelTableTitle');
const detailGrid = document.getElementById('personnelDetailGrid');
const membersBox = document.getElementById('personnelMembers');
const personnelModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('personnelModal'));
const personnelEditModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('personnelEditModal'));
const personnelEditForm = document.getElementById('personnelEditForm');
const personnelEditFields = document.getElementById('personnelEditFields');
const PERSONNEL_EDITS_KEY = 'sigeru-personal-ediciones';

const fallbackPersonnel = {
  cuadrillas: [
    {id:'B-02',tipo:'cuadrilla',nombre:'Cuadrilla B-02',responsable:'Diego Forlán',estado:'En servicio',turno:'Nocturno',ubicacion:'B_01',integrantes:['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez']},
    {id:'B-03',tipo:'cuadrilla',nombre:'Cuadrilla B-03',responsable:'Luis Suárez',estado:'Regresando',turno:'Nocturno',ubicacion:'B_03',integrantes:['Rodrigo Bentancur','José María Giménez','Sergio Rochet','Nicolás de la Cruz']},
    {id:'CH_03',tipo:'cuadrilla',nombre:'Cuadrilla CH_03',responsable:'Juana de Ibarbourou',estado:'En base',turno:'Nocturno',ubicacion:'CH_114',integrantes:['Delmira Agustini','Idea Vilariño','Mario Benedetti','Amanda Berenguer']},
    {id:'CH_01',tipo:'cuadrilla',nombre:'Cuadrilla CH_01',responsable:'China Zorrilla',estado:'En servicio',turno:'Nocturno',ubicacion:'CH_109',integrantes:['Estela Medina','Antonio Larreta','Dahd Sfeir','Walter Reyno']},
    {id:'CH_02',tipo:'cuadrilla',nombre:'Cuadrilla CH_02',responsable:'Natalia Oreiro',estado:'Esperando circuito',turno:'Nocturno',ubicacion:'CH_102',integrantes:['Edinson Cavani','Federico Valverde','Valeria Ripoll','Victoria Rodríguez']}
  ],
  choferes: [
    {id_trabajador:101,nombre:'Albert',apellido:'Einstein',documento:'4.111.111-1',telefono:'099 111 111',email:'albert@sigeru.uy',rol:'chofer',licencia:'CAT-C-3265',estado:'activo',asignacion:'SBK-3265'},
    {id_trabajador:102,nombre:'Leonardo',apellido:'da Vinci',documento:'4.222.222-2',telefono:'099 222 222',email:'leonardo@sigeru.uy',rol:'chofer',licencia:'CAT-C-5268',estado:'activo',asignacion:'SAE-5268'},
    {id_trabajador:103,nombre:'Frida',apellido:'Kahlo',documento:'4.333.333-3',telefono:'099 333 333',email:'frida@sigeru.uy',rol:'chofer',licencia:'CAT-C-1235',estado:'activo',asignacion:'SCE-1235'},
    {id_trabajador:104,nombre:'Julio',apellido:'César',documento:'4.666.666-6',telefono:'099 666 666',email:'julio@sigeru.uy',rol:'chofer',licencia:'CAT-C-5632',estado:'activo',asignacion:'SDT-5632'}
  ],
  barrenderos: [{"id_trabajador":301,"nombre":"Edinson","apellido":"Cavani","documento":"5.101.201-1","telefono":"098 301 401","email":"edinson.cavani@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-02","CH_02"],"turnos":["Nocturno"],"ubicaciones":["B_01","CH_102"]},{"id_trabajador":302,"nombre":"Federico","apellido":"Valverde","documento":"5.102.202-2","telefono":"098 302 402","email":"federico.valverde@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-02","CH_02"],"turnos":["Nocturno"],"ubicaciones":["B_01","CH_102"]},{"id_trabajador":303,"nombre":"Valeria","apellido":"Ripoll","documento":"5.103.203-3","telefono":"098 303 403","email":"valeria.ripoll@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-02","CH_02"],"turnos":["Nocturno"],"ubicaciones":["B_01","CH_102"]},{"id_trabajador":304,"nombre":"Victoria","apellido":"Rodríguez","documento":"5.104.204-4","telefono":"098 304 404","email":"victoria.rodriguez@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-02","CH_02"],"turnos":["Nocturno"],"ubicaciones":["B_01","CH_102"]},{"id_trabajador":305,"nombre":"Rodrigo","apellido":"Bentancur","documento":"5.105.205-5","telefono":"098 305 405","email":"rodrigo.bentancur@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-03"],"turnos":["Nocturno"],"ubicaciones":["B_03"]},{"id_trabajador":306,"nombre":"José","apellido":"María Giménez","documento":"5.106.206-6","telefono":"098 306 406","email":"jose.maria.gimenez@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-03"],"turnos":["Nocturno"],"ubicaciones":["B_03"]},{"id_trabajador":307,"nombre":"Sergio","apellido":"Rochet","documento":"5.107.207-7","telefono":"098 307 407","email":"sergio.rochet@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-03"],"turnos":["Nocturno"],"ubicaciones":["B_03"]},{"id_trabajador":308,"nombre":"Nicolás","apellido":"de la Cruz","documento":"5.108.208-8","telefono":"098 308 408","email":"nicolas.de.la.cruz@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["B-03"],"turnos":["Nocturno"],"ubicaciones":["B_03"]},{"id_trabajador":309,"nombre":"Delmira","apellido":"Agustini","documento":"5.109.209-9","telefono":"098 309 409","email":"delmira.agustini@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_03"],"turnos":["Nocturno"],"ubicaciones":["CH_114"]},{"id_trabajador":310,"nombre":"Idea","apellido":"Vilariño","documento":"5.110.210-0","telefono":"098 310 410","email":"idea.vilarino@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_03"],"turnos":["Nocturno"],"ubicaciones":["CH_114"]},{"id_trabajador":311,"nombre":"Mario","apellido":"Benedetti","documento":"5.111.211-1","telefono":"098 311 411","email":"mario.benedetti@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_03"],"turnos":["Nocturno"],"ubicaciones":["CH_114"]},{"id_trabajador":312,"nombre":"Amanda","apellido":"Berenguer","documento":"5.112.212-2","telefono":"098 312 412","email":"amanda.berenguer@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_03"],"turnos":["Nocturno"],"ubicaciones":["CH_114"]},{"id_trabajador":313,"nombre":"Estela","apellido":"Medina","documento":"5.113.213-3","telefono":"098 313 413","email":"estela.medina@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_01"],"turnos":["Nocturno"],"ubicaciones":["CH_109"]},{"id_trabajador":314,"nombre":"Antonio","apellido":"Larreta","documento":"5.114.214-4","telefono":"098 314 414","email":"antonio.larreta@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_01"],"turnos":["Nocturno"],"ubicaciones":["CH_109"]},{"id_trabajador":315,"nombre":"Dahd","apellido":"Sfeir","documento":"5.115.215-5","telefono":"098 315 415","email":"dahd.sfeir@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_01"],"turnos":["Nocturno"],"ubicaciones":["CH_109"]},{"id_trabajador":316,"nombre":"Walter","apellido":"Reyno","documento":"5.116.216-6","telefono":"098 316 416","email":"walter.reyno@sigeru.uy","rol":"barrendero","estado":"activo","cuadrillas":["CH_01"],"turnos":["Nocturno"],"ubicaciones":["CH_109"]}],
  operarios: [
    {id_trabajador:201,nombre:'María',apellido:'Pérez',documento:'4.444.444-4',telefono:'099 444 444',email:'maria@sigeru.uy',rol:'operario',estado:'activo',asignacion:'Centro de acopio Norte'},
    {id_trabajador:202,nombre:'Carlos',apellido:'Silva',documento:'4.555.555-5',telefono:'099 555 555',email:'carlos@sigeru.uy',rol:'operario',estado:'activo',asignacion:'Vertedero Oeste'},
    {id_trabajador:203,nombre:'Lucía',apellido:'Rodríguez',documento:'4.777.777-7',telefono:'099 777 777',email:'lucia@sigeru.uy',rol:'operario',estado:'activo',asignacion:'Centro de reciclaje Sur'}
  ]
};

function detailField(label, value) {
  return `<div class="truck-field"><span>${label}</span><strong>${value || '—'}</strong></div>`;
}

function mergeWorkers(data) {
  let localWorkers = [];

  try {
    const saved = JSON.parse(localStorage.getItem('sigeru-trabajadores-local') || '[]');
    localWorkers = Array.isArray(saved) ? saved : [];
  } catch {
    localWorkers = [];
  }

  ['choferes', 'operarios'].forEach((group) => {
    const role = group === 'choferes' ? 'chofer' : 'operario';
    const current = data[group] || [];

    localWorkers
      .filter((worker) => worker.rol === role)
      .forEach((worker) => {
        if (!current.some((item) => item.email === worker.email)) current.push(worker);
      });

    data[group] = current;
  });

  return data;
}


function editKey(type,item){
  return type==='cuadrillas' ? item.id : String(item.id_trabajador ?? item.email);
}

function applyPersonnelEdits(data){
  let edits={};
  try{edits=JSON.parse(localStorage.getItem(PERSONNEL_EDITS_KEY)||'{}')||{};}catch(_){edits={};}

  Object.keys(data).forEach((type)=>{
    data[type]=(data[type]||[]).map((item)=>{
      const saved=edits[`${type}:${editKey(type,item)}`];
      return saved ? {...item,...saved} : item;
    });
  });
  return data;
}

function persistPersonnelEdit(type,item){
  let edits={};
  try{edits=JSON.parse(localStorage.getItem(PERSONNEL_EDITS_KEY)||'{}')||{};}catch(_){edits={};}
  edits[`${type}:${editKey(type,item)}`]=item;
  localStorage.setItem(PERSONNEL_EDITS_KEY,JSON.stringify(edits));
}

async function syncPersonnelEdit(type,item){
  if(location.protocol==='file:')return;
  const endpoint=type==='cuadrillas'?'../api-gestion/cuadrillas.php':'../api-gestion/trabajadores.php';
  const payload=type==='cuadrillas'
    ? {accion:'modificar',id_cuadrilla:item.id,responsable:item.responsable,turno:item.turno,estado:item.estado,ubicacion:item.ubicacion}
    : {accion:'modificar',...item};
  try{
    await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
  }catch(_){}
}

function inputField(name,label,value,type='text'){
  return `<label class="form-label">${label}<input class="form-control" name="${name}" type="${type}" value="${String(value??'').replace(/"/g,'&quot;')}"></label>`;
}

function selectField(name,label,value,options){
  return `<label class="form-label">${label}<select class="form-select" name="${name}">${options.map(option=>`<option ${option===value?'selected':''}>${option}</option>`).join('')}</select></label>`;
}

function openPersonnelEdit(index){
  const type=personnelState.current;
  const item=(personnelState.data[type]||[])[Number(index)];
  if(!item)return;

  personnelState.editIndex=Number(index);
  document.getElementById('personnelEditModalTitle').textContent=
    type==='cuadrillas' ? `Editar ${item.id}` : `Editar ${item.nombre} ${item.apellido}`;

  if(type==='cuadrillas'){
    personnelEditFields.innerHTML=[
      inputField('responsable','Responsable',item.responsable),
      selectField('turno','Turno',item.turno,['Diurno','Nocturno']),
      inputField('estado','Estado',item.estado),
      inputField('ubicacion','Ubicación',item.ubicacion)
    ].join('');
  }else{
    const baseFields=[
      inputField('nombre','Nombre',item.nombre),
      inputField('apellido','Apellido',item.apellido),
      inputField('documento','Documento',item.documento),
      inputField('telefono','Teléfono',item.telefono),
      inputField('email','Correo',item.email,'email'),
      selectField('estado','Estado',item.estado||'activo',['activo','inactivo'])
    ];

    if(type==='choferes'){
      baseFields.push(inputField('licencia','Licencia',item.licencia));
      baseFields.push(inputField('asignacion','Camión asignado',item.asignacion));
    }else if(type==='operarios'){
      baseFields.push(inputField('asignacion','Asignación',item.asignacion));
    }else if(type==='barrenderos'){
      baseFields.push(inputField('cuadrillas','Cuadrillas',(item.cuadrillas||[]).join(', ')));
      baseFields.push(inputField('turnos','Turnos',(item.turnos||[]).join(', ')));
      baseFields.push(inputField('ubicaciones','Ubicaciones',(item.ubicaciones||[]).join(', ')));
    }

    personnelEditFields.innerHTML=baseFields.join('');
  }

  document.getElementById('personnelEditMessage').textContent='';
  personnelEditModal.show();
}

async function loadPersonnel() {
  try {
    const response = await fetch('../api-gestion/personal.php?accion=listar');
    if (!response.ok) throw new Error('Servidor no disponible.');

    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    personnelState.data = applyPersonnelEdits(mergeWorkers(result.data));
  } catch {
    personnelState.data = applyPersonnelEdits(mergeWorkers(structuredClone(fallbackPersonnel)));
  }

  renderPersonnel();
}

function renderPersonnel() {
  const type = personnelState.current;
  const rows = personnelState.data[type] || [];
  personnelTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);

  if (type === 'cuadrillas') {
    personnelHead.innerHTML = '<tr><th>Código</th><th>Responsable</th><th>Turno</th><th>Estado</th><th>Ubicación</th><th>Acciones</th></tr>';
    personnelBody.innerHTML = rows.map((item, index) => `
      <tr>
        <td><strong>${item.id}</strong></td>
        <td>${item.responsable}</td>
        <td>${item.turno}</td>
        <td>${item.estado}</td>
        <td>${item.ubicacion}</td>
        <td><div class="d-flex gap-2"><button class="btn btn-outline btn-sm" data-personnel-index="${index}" type="button" aria-label="Ver ${item.nombre}"><i class="bi bi-search"></i></button><button class="btn btn-outline btn-sm" data-personnel-edit="${index}" type="button" aria-label="Editar ${item.nombre}"><i class="bi bi-pencil"></i></button></div></td>
      </tr>`).join('');
    return;
  }

  if (type === 'barrenderos') {
    personnelHead.innerHTML = '<tr><th>Nombre</th><th>Documento</th><th>Estado</th><th>Cuadrilla</th><th>Turno</th><th>Acciones</th></tr>';
    personnelBody.innerHTML = rows.map((item, index) => `
      <tr>
        <td><strong>${item.nombre} ${item.apellido}</strong></td>
        <td>${item.documento || '—'}</td>
        <td>${item.estado || 'activo'}</td>
        <td>${(item.cuadrillas || []).join(' / ') || 'Sin asignar'}</td>
        <td>${(item.turnos || []).join(' / ') || '—'}</td>
        <td><div class="d-flex gap-2"><button class="btn btn-outline btn-sm" data-personnel-index="${index}" type="button" aria-label="Ver ${item.nombre} ${item.apellido}"><i class="bi bi-search"></i></button><button class="btn btn-outline btn-sm" data-personnel-edit="${index}" type="button" aria-label="Editar ${item.nombre} ${item.apellido}"><i class="bi bi-pencil"></i></button></div></td>
      </tr>`).join('');
    return;
  }

  const isDriver = type === 'choferes';
  personnelHead.innerHTML = `<tr><th>Nombre</th><th>Documento</th><th>Estado</th><th>${isDriver ? 'Camión' : 'Asignación'}</th>${isDriver ? '<th>Licencia</th>' : ''}<th>Acciones</th></tr>`;
  personnelBody.innerHTML = rows.map((item, index) => `
    <tr>
      <td><strong>${item.nombre} ${item.apellido}</strong></td>
      <td>${item.documento || '—'}</td>
      <td>${item.estado || 'activo'}</td>
      <td>${item.asignacion || 'Sin asignar'}</td>
      ${isDriver ? `<td>${item.licencia || 'Sin registrar'}</td>` : ''}
      <td><div class="d-flex gap-2"><button class="btn btn-outline btn-sm" data-personnel-index="${index}" type="button" aria-label="Ver ${item.nombre} ${item.apellido}"><i class="bi bi-search"></i></button><button class="btn btn-outline btn-sm" data-personnel-edit="${index}" type="button" aria-label="Editar ${item.nombre} ${item.apellido}"><i class="bi bi-pencil"></i></button></div></td>
    </tr>`).join('');
}

function openPersonnel(index) {
  const type = personnelState.current;
  const item = (personnelState.data[type] || [])[Number(index)];
  if (!item) return;

  document.getElementById('personnelModalKicker').textContent =
    type === 'cuadrillas' ? 'Cuadrilla' : item.rol;
  document.getElementById('personnelModalTitle').textContent =
    type === 'cuadrillas' ? item.nombre : `${item.nombre} ${item.apellido}`;

  if (type === 'cuadrillas') {
    detailGrid.innerHTML = [
      detailField('Código', item.id),
      detailField('Responsable', item.responsable),
      detailField('Turno', item.turno),
      detailField('Estado', item.estado),
      detailField('Ubicación', item.ubicacion),
      detailField('Integrantes', item.integrantes?.length || 0)
    ].join('');

    membersBox.classList.remove('d-none');
    membersBox.innerHTML = `
      <h3>Integrantes</h3>
      <div class="personnel-member-list">
        ${(item.integrantes || []).map((name) => `<span>${name}</span>`).join('')}
      </div>`;
  } else if (type === 'barrenderos') {
    detailGrid.innerHTML = [
      detailField('Documento', item.documento),
      detailField('Teléfono', item.telefono),
      detailField('Correo', item.email),
      detailField('Rol', 'Barrendero'),
      detailField('Estado', item.estado),
      detailField('Cuadrilla asignada', (item.cuadrillas || []).join(' / ')),
      detailField('Turno', (item.turnos || []).join(' / ')),
      detailField('Ubicación operativa', (item.ubicaciones || []).join(' / '))
    ].join('');
    membersBox.classList.add('d-none');
    membersBox.innerHTML = '';
  } else {
    detailGrid.innerHTML = [
      detailField('Documento', item.documento),
      detailField('Teléfono', item.telefono),
      detailField('Correo', item.email),
      detailField('Rol', item.rol),
      detailField('Estado', item.estado),
      detailField(type === 'choferes' ? 'Camión asignado' : 'Asignación', item.asignacion),
      ...(type === 'choferes' ? [detailField('Licencia', item.licencia)] : [])
    ].join('');
    membersBox.classList.add('d-none');
    membersBox.innerHTML = '';
  }

  personnelModal.show();
}

document.querySelectorAll('[data-personnel-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    personnelState.current = button.dataset.personnelTab;
    document.querySelectorAll('[data-personnel-tab]').forEach((item) => {
      item.classList.toggle('btn-primary', item === button);
      item.classList.toggle('btn-outline', item !== button);
      item.classList.toggle('active', item === button);
    });
    renderPersonnel();
  });
});

personnelBody.addEventListener('click', (event) => {
  const viewButton=event.target.closest('[data-personnel-index]');
  if(viewButton)openPersonnel(viewButton.dataset.personnelIndex);

  const editButton=event.target.closest('[data-personnel-edit]');
  if(editButton)openPersonnelEdit(editButton.dataset.personnelEdit);
});

personnelEditForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const type=personnelState.current;
  const item=(personnelState.data[type]||[])[personnelState.editIndex];
  if(!item)return;

  const data=Object.fromEntries(new FormData(event.currentTarget));
  if(type==='cuadrillas'){
    Object.assign(item,{
      responsable:data.responsable.trim(),
      turno:data.turno,
      estado:data.estado.trim(),
      ubicacion:data.ubicacion.trim()
    });
  }else{
    Object.assign(item,{
      nombre:data.nombre.trim(),
      apellido:data.apellido.trim(),
      documento:data.documento.trim(),
      telefono:data.telefono.trim(),
      email:data.email.trim(),
      estado:data.estado
    });
    if(type==='choferes'){
      item.licencia=data.licencia.trim();
      item.asignacion=data.asignacion.trim();
    }else if(type==='operarios'){
      item.asignacion=data.asignacion.trim();
    }else if(type==='barrenderos'){
      const toList=value=>value.split(',').map(part=>part.trim()).filter(Boolean);
      item.cuadrillas=toList(data.cuadrillas||'');
      item.turnos=toList(data.turnos||'');
      item.ubicaciones=toList(data.ubicaciones||'');
    }
  }

  persistPersonnelEdit(type,item);
  await syncPersonnelEdit(type,item);
  renderPersonnel();
  personnelEditModal.hide();
});

loadPersonnel();
