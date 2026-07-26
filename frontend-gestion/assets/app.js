const vehicleList = document.getElementById('vehicleList');
const crewList = document.getElementById('crewList');
const vehicleDetail = document.getElementById('vehicleDetail');
const crewDetail = document.getElementById('crewDetail');
const sidePanelTitle = document.getElementById('sidePanelTitle');
const crewCircuits = document.getElementById('crewCircuits');
const crewMembers = document.getElementById('crewMembers');

const detailFields = {
  vehicle: document.getElementById('detailVehicle'),
  driver: document.getElementById('detailDriver'),
  status: document.getElementById('detailStatus'),
  location: document.getElementById('detailLocation'),
  circuit: document.getElementById('detailCircuit'),
  weight: document.getElementById('detailWeight'),
  capacity: document.getElementById('detailCapacity'),
  km: document.getElementById('detailKm')
};

const crewFields = {
  crew: document.getElementById('crewCode'),
  chief: document.getElementById('crewChief'),
  location: document.getElementById('crewLocation'),
  status: document.getElementById('crewStatus'),
  turn: document.getElementById('crewTurn'),
  start: document.getElementById('crewStart'),
  end: document.getElementById('crewEnd')
};

const modalElement = document.getElementById('operacionModal');
const modal = modalElement ? new bootstrap.Modal(modalElement) : null;
const modalKicker = document.getElementById('operacionModalKicker');
const modalTitle = document.getElementById('operacionModalTitulo');
const modalBody = document.getElementById('operacionModalBody');
const modalForm = document.getElementById('operacionForm');
const modalSubmit = document.getElementById('operacionSubmit');

let currentOperation = null;

function setActiveItem(selector, current) {
  document.querySelectorAll(selector).forEach((item) => item.classList.remove('active'));
  current.classList.add('active');
}

function showVehicleView() {
  vehicleList.classList.remove('d-none');
  crewList.classList.add('d-none');
  vehicleDetail.classList.remove('d-none');
  crewDetail.classList.add('d-none');
  sidePanelTitle.textContent = 'Camiones en turno';
}

function showCrewView() {
  vehicleList.classList.add('d-none');
  crewList.classList.remove('d-none');
  vehicleDetail.classList.add('d-none');
  crewDetail.classList.remove('d-none');
  sidePanelTitle.textContent = 'Cuadrillas en turno';

  const selected = crewList.querySelector('.crew-item.active') || crewList.querySelector('.crew-item');
  if (selected) updateCrewDetail(selected);
}

function parseCircuits(item) {
  if (!item) return [];
  return (item.dataset.circuits || '')
    .split(';')
    .filter(Boolean)
    .map((entry) => {
      const [code, priority, state, time] = entry.split('|');
      return { code, priority, state, time };
    });
}

function saveCircuits(item, circuits) {
  item.dataset.circuits = circuits
    .map(({ code, priority, state, time }) => `${code}|${priority}|${state}|${time}`)
    .join(';');
}

function updateCrewDetail(item) {
  Object.entries(crewFields).forEach(([key, field]) => {
    if (field && item.dataset[key] !== undefined) field.value = item.dataset[key];
  });

  crewCircuits.innerHTML =
    '<div class="info-row info-head"><span>Circuito</span><span>Prioridad</span><span>Estado</span><span>Hora</span></div>';

  parseCircuits(item).forEach(({ code, priority, state, time }) => {
    crewCircuits.insertAdjacentHTML(
      'beforeend',
      `<div class="info-row"><span>${code}</span><span>${priority}</span><span>${state}</span><span>${time}</span></div>`
    );
  });

  crewMembers.innerHTML = '';
  (item.dataset.members || '')
    .split(';')
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name, index) => {
      const row = document.createElement('div');
      row.className = 'member-row';

      const number = document.createElement('span');
      number.className = 'member-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const fullName = document.createElement('strong');
      fullName.className = 'member-name';
      fullName.textContent = name
        .toLocaleLowerCase('es-UY')
        .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-UY'));

      row.append(number, fullName);
      crewMembers.appendChild(row);
    });
}

function selectedVehicle() {
  return vehicleList.querySelector('[data-vehicle].active');
}

function selectedCrew() {
  return crewList.querySelector('.crew-item.active');
}

function selectOptions(values, selected = '') {
  return values.map((value) =>
    `<option ${value === selected ? 'selected' : ''}>${value}</option>`
  ).join('');
}

const circuitsByMunicipality = Object.fromEntries(
  SiGeRUCircuitos.municipalities().map((municipality) => [
    municipality,
    SiGeRUCircuitos.circuits(municipality)
  ])
);

function circuitOptions(municipality, selected = '') {
  return (circuitsByMunicipality[municipality] || []).map((circuit) => {
    const summary = SiGeRUCircuitos.summary(circuit);
    const counts = summary.counts;
    return `<option value="${circuit}" ${circuit === selected ? 'selected' : ''}>${circuit} · ${summary.level.toUpperCase()} · ${counts.verde}V ${counts.amarillo}A ${counts.rojo}R</option>`;
  }).join('');
}

function circuitStatusMarkup(circuit) {
  const summary = SiGeRUCircuitos.summary(circuit);
  return `<div class="circuit-status-preview circuit-${summary.level}" data-circuit-preview>
    <span class="circuit-status-dot" aria-hidden="true"></span>
    <strong>${circuit}</strong>
    <span>10 contenedores · ${summary.counts.verde} verdes · ${summary.counts.amarillo} amarillos · ${summary.counts.rojo} rojos</span>
  </div>`;
}

function updateCircuitPreview(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const summary = SiGeRUCircuitos.summary(select.value);
  select.classList.remove('circuit-select-verde','circuit-select-amarillo','circuit-select-rojo');
  select.classList.add(`circuit-select-${summary.level}`);
  const preview = select.closest('.modal-field')?.nextElementSibling;
  if (preview?.matches('[data-circuit-preview]')) {
    preview.outerHTML = circuitStatusMarkup(select.value);
  }
}

function municipalityOptions(selected = 'B') {
  return Object.keys(circuitsByMunicipality).map((municipality) =>
    `<option value="${municipality}" ${municipality === selected ? 'selected' : ''}>Municipio ${municipality}</option>`
  ).join('');
}

function openOperation({ kicker, title, submit = 'Guardar', body, operation }) {
  if (!modal) return;

  currentOperation = operation;
  modalKicker.textContent = kicker;
  modalTitle.textContent = title;
  modalSubmit.textContent = submit;
  modalBody.innerHTML = body;
  updateCircuitPreview('routeCircuit');
  updateCircuitPreview('crewCircuitCode');
  modal.show();
}

function inputField(label, id, value = '', type = 'text') {
  return `
    <label class="modal-field">
      <span>${label}</span>
      <input class="form-control" id="${id}" type="${type}" value="${value}" required>
    </label>`;
}

function openTruckAction(action) {
  const truck = selectedVehicle();
  if (!truck) return;

  if (action === 'crear_ruta') {
    const municipality = Object.keys(circuitsByMunicipality)[0];

    openOperation({
      kicker: truck.dataset.vehicle,
      title: 'Crear ruta nueva',
      submit: 'Crear ruta',
      operation: action,
      body: `
        <label class="modal-field">
          <span>Municipio</span>
          <select class="form-select" id="routeMunicipality">
            ${municipalityOptions(municipality)}
          </select>
        </label>
        <label class="modal-field">
          <span>Circuito</span>
          <select class="form-select" id="routeCircuit">
            ${circuitOptions(municipality)}
          </select>
        </label>
        ${circuitStatusMarkup(circuitsByMunicipality[municipality][0])}`
    });
  }

  if (action === 'editar_ruta') {
    if (!truck.dataset.circuit) {
      openOperation({
        kicker: truck.dataset.vehicle,
        title: 'Sin circuito asignado',
        submit: 'Cerrar',
        operation: 'solo_cerrar',
        body: '<div class="modal-confirm"><p>Este camión no tiene un circuito asignado para editar.</p></div>'
      });
      return;
    }

    openOperation({
      kicker: truck.dataset.vehicle,
      title: 'Editar estado del circuito',
      submit: 'Guardar estado',
      operation: action,
      body: `
        <div class="modal-confirm">
          <span class="modal-field-label">Circuito asignado</span>
          <strong>${truck.dataset.circuit}</strong>
        </div>
        <label class="modal-field">
          <span>Estado</span>
          <select class="form-select" id="routeState">
            ${selectOptions(['Asignada', 'En curso', 'Finalizada'], truck.dataset.circuitState || 'En curso')}
          </select>
        </label>`
    });
  }

  if (action === 'eliminar_ruta') {
    openOperation({
      kicker: truck.dataset.vehicle,
      title: 'Quitar circuito',
      submit: truck.dataset.circuit ? 'Eliminar' : 'Cerrar',
      operation: truck.dataset.circuit ? action : 'solo_cerrar',
      body: `
        <div class="modal-confirm">
          <strong>${truck.dataset.circuit || 'Sin ruta asignada'}</strong>
          <p>${truck.dataset.circuit ? 'El circuito dejará de estar asignado a este camión.' : 'Este camión no tiene un circuito asignado.'}</p>
        </div>`
    });
  }
}

function openCrewAction(action) {
  const crew = selectedCrew();
  if (!crew) return;

  const circuits = parseCircuits(crew);

  if (action === 'asignar_circuito') {
    openOperation({
      kicker: crew.dataset.crew,
      title: 'Asignar circuito',
      submit: 'Asignar',
      operation: action,
      body: `
        <label class="modal-field">
          <span>Municipio</span>
          <select class="form-select" id="crewCircuitMunicipality">
            ${municipalityOptions('B')}
          </select>
        </label>
        <label class="modal-field">
          <span>Circuito</span>
          <select class="form-select" id="crewCircuitCode">
            ${circuitOptions('B')}
          </select>
        </label>
        ${circuitStatusMarkup(circuitsByMunicipality.B[0])}`
    });
  }

  if (action === 'editar_circuito') {
    if (!circuits.length) {
      openOperation({
        kicker: crew.dataset.crew,
        title: 'Sin circuitos asignados',
        submit: 'Cerrar',
        operation: 'solo_cerrar',
        body: '<div class="modal-confirm"><p>La cuadrilla no tiene circuitos para editar.</p></div>'
      });
      return;
    }

    const options = circuits.map(({ code }) => `<option>${code}</option>`).join('');

    openOperation({
      kicker: crew.dataset.crew,
      title: 'Editar circuito',
      submit: 'Guardar cambios',
      operation: action,
      body: `
        <label class="modal-field">
          <span>Circuito</span>
          <select class="form-select" id="editCircuitCode">${options}</select>
        </label>
        <label class="modal-field">
          <span>Acción</span>
          <select class="form-select" id="editCircuitAction">
            <option value="editar">Editar asignación</option>
            <option value="quitar">Quitar de la cuadrilla</option>
          </select>
        </label>
        <label class="modal-field">
          <span>Prioridad</span>
          <select class="form-select" id="editCircuitPriority">
            ${selectOptions(['Baja', 'Media', 'Alta'], circuits[0].priority)}
          </select>
        </label>
        <label class="modal-field">
          <span>Estado</span>
          <select class="form-select" id="editCircuitState">
            ${selectOptions(['Pendiente', 'En curso', 'Completado', 'No completado'], circuits[0].state)}
          </select>
        </label>`
    });
  }

  if (action === 'asignar_reclamo') {
    openOperation({
      kicker: crew.dataset.crew,
      title: 'Asignar reclamo',
      submit: 'Asignar reclamo',
      operation: action,
      body: `
        ${inputField('ID del reclamo', 'claimId')}
        ${inputField('Ubicación', 'claimLocation', crew.dataset.location)}
        <label class="modal-field">
          <span>Tipo</span>
          <select class="form-select" id="claimType">
            <option>Residuos fuera de lugar</option>
            <option>Falta de recolección</option>
            <option>Contenedor desbordado</option>
            <option>Otro</option>
          </select>
        </label>
        <label class="modal-field">
          <span>Prioridad</span>
          <select class="form-select" id="claimPriority">
            ${selectOptions(['Baja', 'Media', 'Alta'], 'Media')}
          </select>
        </label>`
    });
  }
}

async function postJson(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch {
    return {
      success: true,
      localOnly: true,
      message: 'Cambio aplicado en el prototipo. La persistencia requiere ejecutar PHP.'
    };
  }
}

async function handleTruckOperation(action) {
  const truck = selectedVehicle();
  if (!truck) return;

  const payload = {
    accion: action,
    matricula: truck.dataset.vehicle,
    circuito_actual: truck.dataset.circuit || ''
  };

  if (action === 'crear_ruta') {
    payload.municipio = document.getElementById('routeMunicipality')?.value;
    payload.circuito = document.getElementById('routeCircuit')?.value;
  }

  if (action === 'editar_ruta') {
    payload.circuito = truck.dataset.circuit;
    payload.estado = document.getElementById('routeState')?.value;
  }

  const result = await postJson('../api-gestion/rutas.php', payload);
  if (!result.success) return;

  if (action === 'eliminar_ruta') {
    truck.dataset.circuit = '';
    truck.dataset.circuitState = '';
    detailFields.circuit.value = '';
  } else if (action === 'crear_ruta') {
    truck.dataset.circuit = payload.circuito;
    truck.dataset.circuitState = 'Asignada';
    truck.dataset.location = payload.circuito;
    detailFields.circuit.value = payload.circuito;
    if (detailFields.location) detailFields.location.value = payload.circuito;
  } else if (action === 'editar_ruta') {
    truck.dataset.circuitState = payload.estado;
  }

  modal.hide();
}

async function handleCrewOperation(action) {
  const crew = selectedCrew();
  if (!crew) return;

  const circuits = parseCircuits(crew);
  const payload = { accion: action, id_cuadrilla: crew.dataset.crew };

  if (action === 'asignar_circuito') {
    payload.id_circuito = document.getElementById('crewCircuitCode').value;
    payload.municipio = document.getElementById('crewCircuitMunicipality').value;
    const circuitSummary = SiGeRUCircuitos.summary(payload.id_circuito);
    payload.prioridad = circuitSummary.level === 'rojo' ? 'Alta' : circuitSummary.level === 'amarillo' ? 'Media' : 'Baja';
    payload.estado = 'Pendiente';

    if (circuits.some(({ code }) => code === payload.id_circuito)) return;

    circuits.push({
      code: payload.id_circuito,
      priority: payload.prioridad,
      state: 'Pendiente',
      time: '--'
    });
  }

  if (action === 'editar_circuito') {
    payload.id_circuito = document.getElementById('editCircuitCode').value;
    const mode = document.getElementById('editCircuitAction').value;
    const index = circuits.findIndex(({ code }) => code === payload.id_circuito);
    if (index < 0) return;

    if (mode === 'quitar') {
      payload.accion = 'borrar_circuito';
      circuits.splice(index, 1);
    } else {
      payload.accion = 'editar_circuito';
      payload.prioridad = document.getElementById('editCircuitPriority').value;
      payload.estado = document.getElementById('editCircuitState').value;
      circuits[index].priority = payload.prioridad;
      circuits[index].state = payload.estado;
    }
  }

  if (action === 'asignar_reclamo') {
    payload.id_reclamo = document.getElementById('claimId').value.trim();
    payload.ubicacion = document.getElementById('claimLocation').value.trim();
    payload.tipo = document.getElementById('claimType').value;
    payload.prioridad = document.getElementById('claimPriority').value;
  }

  const result = await postJson('../api-gestion/cuadrillas.php', payload);
  if (!result.success) return;

  if (action !== 'asignar_reclamo') {
    saveCircuits(crew, circuits);
    updateCrewDetail(crew);
  }

  modal.hide();
}

modalBody?.addEventListener('change', (event) => {
  if (event.target.id === 'routeMunicipality') {
    const circuitSelect = document.getElementById('routeCircuit');
    if (circuitSelect) {
      circuitSelect.innerHTML = circuitOptions(event.target.value);
      updateCircuitPreview('routeCircuit');
    }
    return;
  }

  if (event.target.id === 'routeCircuit') {
    updateCircuitPreview('routeCircuit');
    return;
  }

  if (event.target.id === 'crewCircuitMunicipality') {
    const circuitSelect = document.getElementById('crewCircuitCode');
    if (circuitSelect) {
      circuitSelect.innerHTML = circuitOptions(event.target.value);
      updateCircuitPreview('crewCircuitCode');
    }
    return;
  }

  if (event.target.id === 'crewCircuitCode') {
    updateCircuitPreview('crewCircuitCode');
    return;
  }

  if (event.target.id !== 'editCircuitCode') return;

  const circuit = parseCircuits(selectedCrew()).find(({ code }) => code === event.target.value);
  if (!circuit) return;

  const priority = document.getElementById('editCircuitPriority');
  const state = document.getElementById('editCircuitState');

  if (priority) priority.value = circuit.priority;
  if (state) state.value = circuit.state;
});

modalForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (currentOperation === 'solo_cerrar') {
    modal.hide();
    return;
  }

  if (currentOperation?.includes('ruta')) {
    await handleTruckOperation(currentOperation);
  } else if (currentOperation) {
    await handleCrewOperation(currentOperation);
  }
});

document.querySelectorAll('[data-vehicle]').forEach((item) => {
  item.addEventListener('click', () => {
    setActiveItem('[data-vehicle]', item);
    Object.entries(detailFields).forEach(([key, field]) => {
      if (field && item.dataset[key] !== undefined) field.value = item.dataset[key];
    });
  });
});

document.querySelectorAll('.crew-item').forEach((item) => {
  item.addEventListener('click', () => {
    setActiveItem('.crew-item', item);
    updateCrewDetail(item);
  });
});

document.querySelectorAll('[data-panel-view]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-panel-view]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    button.dataset.panelView === 'cuadrillas' ? showCrewView() : showVehicleView();
  });
});

document.querySelectorAll('[data-truck-action]').forEach((button) => {
  button.addEventListener('click', () => openTruckAction(button.dataset.truckAction));
});

document.querySelectorAll('[data-crew-action]').forEach((button) => {
  button.addEventListener('click', () => openCrewAction(button.dataset.crewAction));
});

document.querySelector('[data-map-focus]')?.addEventListener('click', () => {
  document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
