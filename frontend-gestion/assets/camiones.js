const defaultTrucks = [
  {
    id: 1, matricula: 'SBK-3265', imagen: '../resources/Camion1.png', fotoPosicion: 'center', fotoAjuste: 'cover',
    tipo: 'Mixto', marca: 'Scania', modelo: 'P250', chasis: 'CH-SBK-3265-001',
    chofer: 'Albert Einstein', acompanante: 'B-02', estado: 'Recolectando', gps: 'CH_102',
    ruta: 'R_B_105', turno: 'Nocturno', kmTotal: 134567, kmTurno: 65,
    ultimaCarga: '2026-07-23', tiempoActivo: '06:34', activo: true,
    capacidad: 8000, peso: 3502.56, asignados: 62, recolectados: 25,
    historial: [
      { id: 1, fecha: '18/07/2026', tipo: 'Mantenimiento', detalle: 'Cambio preventivo de filtros y revisión general.', kilometraje: 134210, estado: 'Resuelta' },
      { id: 2, fecha: '12/07/2026', tipo: 'Mecánica', detalle: 'Revisión del sistema de frenos.', kilometraje: 133780, estado: 'Resuelta' },
      { id: 3, fecha: '05/07/2026', tipo: 'Tránsito', detalle: 'Demora operativa registrada durante el recorrido.', kilometraje: 133115, estado: 'Resuelta' }
    ]
  },
  {
    id: 2, matricula: 'SAE-5268', imagen: '../resources/Camion2.png', fotoPosicion: 'center', fotoAjuste: 'cover',
    tipo: 'Reciclaje', marca: 'Iveco', modelo: 'Eurocargo', chasis: 'CH-SAE-5268-002',
    chofer: 'Leonardo da Vinci', acompanante: null, estado: 'En circuito', gps: 'C_102',
    ruta: 'R_C_102', turno: 'Nocturno', kmTotal: 98320, kmTurno: 76.4,
    ultimaCarga: '2026-07-23', tiempoActivo: '05:48', activo: true,
    capacidad: 7000, peso: 2100.10, asignados: 48, recolectados: 31,
    historial: [
      { id: 4, fecha: '24/07/2026', tipo: 'Mantenimiento', detalle: 'Revisión preventiva solicitada.', kilometraje: 98320, estado: 'Abierta' }
    ]
  },
  {
    id: 3, matricula: 'SCE-1235', imagen: '../resources/Camion3.png', fotoPosicion: 'left center', fotoAjuste: 'contain',
    tipo: 'Mixto', marca: 'Volkswagen', modelo: 'Constellation', chasis: 'CH-SCE-1235-003',
    chofer: 'Frida Kahlo', acompanante: null, estado: 'En base', gps: 'CH_114',
    ruta: 'Sin asignar', turno: 'Nocturno', kmTotal: 110845, kmTurno: 0,
    ultimaCarga: '2026-07-22', tiempoActivo: '00:00', activo: true,
    capacidad: 8000, peso: 0, asignados: 0, recolectados: 0,
    historial: [
      { id: 5, fecha: '24/07/2026', tipo: 'Mecánica', detalle: 'Falla detectada en el sistema hidráulico. El camión permanece en base para revisión.', kilometraje: 110845, estado: 'Abierta' }
    ]
  },
  {
    id: 4, matricula: 'SDT-5632', imagen: '../resources/Camion4.png', fotoPosicion: 'center', fotoAjuste: 'cover',
    tipo: 'General', marca: 'Scania', modelo: 'P280', chasis: 'CH-SDT-5632-004',
    chofer: 'Julio César', acompanante: 'CH_03', estado: 'Dirigiéndose a vertedero', gps: 'CH_102',
    ruta: 'R_D_104', turno: 'Nocturno', kmTotal: 145230, kmTurno: 128.1,
    ultimaCarga: '2026-07-23', tiempoActivo: '06:12', activo: true,
    capacidad: 8000, peso: 7250, asignados: 58, recolectados: 58,
    historial: []
  }
];

const STORAGE_KEY = 'sigeru-camiones-v2';

function loadTrucks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : structuredClone(defaultTrucks);
  } catch (_) {
    return structuredClone(defaultTrucks);
  }
}

function saveTrucks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks));
}

let trucks = loadTrucks();

trucks = trucks.map((truck) => {
  if (truck.matricula === 'SCE-1235') {
    return { ...truck, acompanante: truck.acompanante || null, imagen: '../resources/Camion3.png', fotoPosicion: 'left center', fotoAjuste: 'contain' };
  }
  return {
    ...truck,
    acompanante: truck.acompanante || null,
    fotoPosicion: truck.fotoPosicion || 'center',
    fotoAjuste: truck.fotoAjuste || 'cover'
  };
});

const $ = (id) => document.getElementById(id);
const tableBody = $('truckTableBody');
const detailPanel = $('truckDetailPanel');
const historyPanel = $('truckHistoryPanel');
const title = $('detalleCamionTitulo');
const truckPhoto = $('truckPhoto');
const truckMapCard = document.querySelector('.truck-map-card');
const status = $('truckStatus');
const mapDriver = $('truckMapDriver');
const assignDriverBtn = $('assignDriverBtn');
const assignCompanionBtn = $('assignCompanionBtn');
const driverModalTitle = $('asignarChoferTitulo');
const saveDriverBtn = $('guardarChoferBtn');
const dataGrid = $('truckDataGrid');
const operationGrid = $('truckOperationGrid');
const historyBody = $('truckHistoryBody');
const incidentCard = $('incidentCard');
const removeSelect = $('quitarCamionSelect');

const incidentModal = new bootstrap.Modal($('incidenciaModal'));
const driverModal = new bootstrap.Modal($('asignarChoferModal'));
const companionModal = new bootstrap.Modal($('asignarAcompananteModal'));
const addModal = bootstrap.Modal.getOrCreateInstance($('agregarCamionModal'));
const removeModal = bootstrap.Modal.getOrCreateInstance($('quitarCamionModal'));

let selectedTruckId = null;

const formatKm = (value) => `${Number(value).toLocaleString('es-UY')} km`;
const formatKg = (value) => `${Number(value).toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
const formatDate = (value) => value ? value.split('-').reverse().join('/') : '—';

function syncTruckVisualHeight() {
  if (!truckPhoto || !truckMapCard) return;

  if (window.innerWidth <= 991.98) {
    truckMapCard.style.height = '';
    return;
  }

  const height = truckPhoto.getBoundingClientRect().height;
  if (height > 0) truckMapCard.style.height = `${Math.round(height)}px`;
}

function field(label, value) {
  return `<div class="truck-field"><span>${label}</span><strong>${value ?? '—'}</strong></div>`;
}

function renderTable() {
  tableBody.innerHTML = trucks.map((truck) => `
    <tr class="truck-row ${truck.id === selectedTruckId ? 'active' : ''}">
      <td><strong>${truck.matricula}</strong></td>
      <td>${truck.tipo}</td>
      <td>${truck.marca} ${truck.modelo}</td>
      <td>${truck.chofer || 'Sin asignar'}</td>
      <td>${truck.estado}</td>
      <td>${truck.gps || '—'}</td>
      <td>${formatKm(truck.kmTurno)}</td>
      <td>
        <button class="btn btn-outline btn-sm" type="button"
          data-open-truck="${truck.id}" aria-label="Ver información de ${truck.matricula}" title="Ver información">
          <i class="bi bi-search" aria-hidden="true"></i>
        </button>
      </td>
    </tr>
  `).join('');

  removeSelect.innerHTML = trucks.map((truck) =>
    `<option value="${truck.id}">${truck.matricula} · ${truck.marca} ${truck.modelo}</option>`
  ).join('');
}

function renderTruck(id) {
  const truck = trucks.find((item) => item.id === Number(id));
  if (!truck) return;

  selectedTruckId = truck.id;
  renderTable();
  detailPanel.classList.remove('d-none');
  historyPanel.classList.remove('d-none');

  title.textContent = truck.matricula;
  status.textContent = truck.estado;
  mapDriver.textContent = truck.chofer ? `Chofer: ${truck.chofer}` : 'Chofer: sin asignar';

  assignDriverBtn.textContent = truck.chofer ? 'Editar chofer' : 'Asignar chofer';
  assignDriverBtn.dataset.truckId = truck.id;

  truckPhoto.onload = syncTruckVisualHeight;
  truckPhoto.src = truck.imagen;
  if (truckPhoto.complete) requestAnimationFrame(syncTruckVisualHeight);

  truckPhoto.alt = `Camión ${truck.marca} ${truck.modelo} - ${truck.matricula}`;

  dataGrid.innerHTML = [
    field('Tipo', truck.tipo),
    field('Marca', truck.marca),
    field('Modelo', truck.modelo),
    field('Chasis', truck.chasis),
    field('Km totales', formatKm(truck.kmTotal)),
    field('Última carga', formatDate(truck.ultimaCarga)),
    field('Activo', truck.activo ? 'Sí' : 'No'),
    field('GPS / ubicación', truck.gps || '—')
  ].join('');

  operationGrid.innerHTML = [
    field('Ruta', truck.ruta || 'Sin asignar'),
    field('Turno', truck.turno),
    field('Acompañante', truck.acompanante ? `Cuadrilla ${truck.acompanante}` : 'Sin asignar'),
    field('Km en turno', formatKm(truck.kmTurno)),
    field('Tiempo activo', truck.tiempoActivo),
    field('Capacidad', formatKg(truck.capacidad)),
    field('Peso recolectado', formatKg(truck.peso)),
    field('Contenedores', `${truck.recolectados} / ${truck.asignados}`)
  ].join('');

  renderHistory(truck);
}

function renderHistory(truck) {
  historyBody.innerHTML = truck.historial.length
    ? truck.historial.map((item) => `
      <tr>
        <td>${item.fecha}</td>
        <td>${item.tipo}</td>
        <td>${item.detalle}</td>
        <td>${formatKm(item.kilometraje)}</td>
        <td><span class="history-status ${item.estado === 'Resuelta' ? 'resolved' : 'open'}">${item.estado}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" type="button"
            data-open-incident="${item.id}" aria-label="Ver detalle del registro del ${item.fecha}">
            <i class="bi bi-search" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" class="text-center text-muted-custom py-4">No hay incidencias o mantenimientos registrados.</td></tr>`;
}

function openIncident(id) {
  const truck = trucks.find((item) => item.id === selectedTruckId);
  const item = truck?.historial.find((entry) => entry.id === Number(id));
  if (!truck || !item) return;

  incidentCard.innerHTML = `
    <div class="incident-card-head">
      <div><span class="text-muted-custom">${truck.matricula}</span><h3>${item.tipo}</h3></div>
      <span class="history-status ${item.estado === 'Resuelta' ? 'resolved' : 'open'}">${item.estado}</span>
    </div>
    <div class="incident-card-grid">
      ${field('Fecha', item.fecha)}
      ${field('Kilometraje', formatKm(item.kilometraje))}
    </div>
    <div class="incident-description"><span>Descripción</span><p>${item.detalle}</p></div>
  `;
  incidentModal.show();
}

async function api(payload) {
  if (location.protocol === 'file:') return;
  try {
    await fetch('../api-gestion/camiones.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (_) {
    // El prototipo local sigue funcionando aunque PHP no esté disponible.
  }
}

$('agregarCamionForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));

  if (trucks.some((truck) => truck.matricula.toUpperCase() === data.matricula.trim().toUpperCase())) {
    $('agregarCamionMensaje').textContent = 'Ya existe un camión con esa matrícula.';
    $('agregarCamionMensaje').style.display = 'block';
    return;
  }

  const truck = {
    id: Math.max(0, ...trucks.map((item) => item.id)) + 1,
    matricula: data.matricula.trim().toUpperCase(),
    imagen: '../resources/Camion1.png',
    fotoPosicion: 'center',
    fotoAjuste: 'cover',
    tipo: data.tipo,
    marca: data.marca.trim(),
    modelo: data.modelo.trim(),
    chasis: data.chasis.trim(),
    chofer: data.chofer.trim() || null,
    acompanante: null,
    estado: data.estado,
    gps: data.gps.trim(),
    ruta: 'Sin asignar',
    turno: data.turno,
    kmTotal: Number(data.km_total),
    kmTurno: 0,
    ultimaCarga: data.ultima_carga,
    tiempoActivo: '00:00',
    activo: true,
    capacidad: Number(data.capacidad || 8000),
    peso: 0,
    asignados: 0,
    recolectados: 0,
    historial: []
  };

  trucks.push(truck);
  saveTrucks();
  renderTable();
  renderTruck(truck.id);
  await api({
    accion: 'crear',
    matricula: truck.matricula, tipo: truck.tipo, marca: truck.marca, modelo: truck.modelo,
    chasis: truck.chasis, estado: truck.estado, km_total: truck.kmTotal,
    ult_carga_combustible: truck.ultimaCarga || null, gps: truck.gps,
    capacidad_kg: truck.capacidad, turno: truck.turno, chofer_asignado: truck.chofer
  });

  event.currentTarget.reset();
  $('agregarCamionMensaje').style.display = 'none';
  addModal.hide();
});

$('quitarCamionForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = Number(removeSelect.value);
  const index = trucks.findIndex((truck) => truck.id === id);
  if (index < 0) return;

  trucks.splice(index, 1);
  saveTrucks();
  await api({ accion: 'eliminar', id_camion: id });

  if (selectedTruckId === id) {
    selectedTruckId = null;
    detailPanel.classList.add('d-none');
    historyPanel.classList.add('d-none');
  }

  renderTable();
  removeModal.hide();
});

assignDriverBtn.addEventListener('click', () => {
  const truck = trucks.find((item) => item.id === selectedTruckId);
  if (!truck) return;

  $('asignarChoferCamion').textContent = `${truck.matricula} · ${truck.marca} ${truck.modelo}`;
  $('asignarChoferNombre').value = truck.chofer || '';
  $('asignarChoferMensaje').style.display = 'none';
  driverModalTitle.textContent = truck.chofer ? 'Editar chofer' : 'Asignar chofer';
  saveDriverBtn.textContent = truck.chofer ? 'Guardar cambios' : 'Asignar';
  driverModal.show();
});

$('asignarChoferForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const truck = trucks.find((item) => item.id === selectedTruckId);
  const nombre = $('asignarChoferNombre').value.trim();
  if (!truck || !nombre) return;

  truck.chofer = nombre;
  saveTrucks();
  await api({ accion: 'asignar_chofer', id_camion: truck.id, chofer_asignado: nombre });
  renderTruck(truck.id);
  driverModal.hide();
});

assignCompanionBtn.addEventListener('click', () => {
  const truck = trucks.find((item) => item.id === selectedTruckId);
  if (!truck) return;

  $('asignarAcompananteCamion').textContent = `${truck.matricula} · ${truck.marca} ${truck.modelo}`;
  $('asignarAcompananteCuadrilla').value = truck.acompanante || '';
  $('asignarAcompananteMensaje').style.display = 'none';
  companionModal.show();
});

$('asignarAcompananteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const truck = trucks.find((item) => item.id === selectedTruckId);
  const cuadrilla = $('asignarAcompananteCuadrilla').value;
  if (!truck || !cuadrilla) return;

  truck.acompanante = cuadrilla;
  saveTrucks();
  await api({
    accion: 'asignar_acompanante',
    id_camion: truck.id,
    cuadrilla_acompanante: cuadrilla
  });
  renderTruck(truck.id);
  companionModal.hide();
});

document.addEventListener('click', (event) => {
  const truckButton = event.target.closest('[data-open-truck]');
  if (truckButton) return renderTruck(truckButton.dataset.openTruck);

  const incidentButton = event.target.closest('[data-open-incident]');
  if (incidentButton) openIncident(incidentButton.dataset.openIncident);
});

renderTable();

window.addEventListener('resize', syncTruckVisualHeight);
