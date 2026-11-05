let truckDetailMapInstance = null;
let truckDetailMapMarker = null;

function renderTruckMap(truck, centrar = true) {
  const mapContainer = document.getElementById('truckDetailMap');
  if (!mapContainer || typeof window.L === 'undefined') return;

  if (!truckDetailMapInstance) {
    truckDetailMapInstance = window.L.map('truckDetailMap', {
      zoomControl: true,
      attributionControl: false
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(truckDetailMapInstance);

    window.L.polygon([
      [-34.897954, -56.130250],
      [-34.898171, -56.130496],
      [-34.899286, -56.129639],
      [-34.899260, -56.129350],
      [-34.899164, -56.129243]
    ], {
      color: '#1d4ed8',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 0.22
    }).bindPopup('<b>Base Operativa: Cantón del Buceo</b>').addTo(truckDetailMapInstance);
  }

  const BASE_BUCEO = [-34.899286, -56.129414];

  let lat = BASE_BUCEO[0];
  let lng = BASE_BUCEO[1];

  const apiLat = Number(truck.latitud);
  const apiLng = Number(truck.longitud);

  const gpsValido =
    truck.latitud != null &&
    truck.longitud != null &&
    Number.isFinite(apiLat) &&
    Number.isFinite(apiLng) &&
    apiLat >= -90 &&
    apiLat <= 90 &&
    apiLng >= -180 &&
    apiLng <= 180;

  if (gpsValido) {
    lat = apiLat;
    lng = apiLng;
  }

  const ubicacionNombre = gpsValido
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    : 'Sin ubicación GPS registrada';
  const icono = window.L.divIcon({
    className: 'leaflet-camion-circulo-wrap',
    html: `
      <div class="camion-marker-circulo activo" title="${escapeHtml(truck.matricula)}">
        <img src="assets/icono-camion.png" alt="Camión" />
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11]
  });

  if (truckDetailMapMarker) {
    truckDetailMapMarker.setLatLng([lat, lng]);
    truckDetailMapMarker.setIcon(icono);
  } else {
    truckDetailMapMarker = window.L.marker([lat, lng], {
      icon: icono,
      zIndexOffset: 1500
    }).addTo(truckDetailMapInstance);
  }

  truckDetailMapMarker.bindPopup(`
    <div style="font-size:0.85rem; line-height: 1.35;">
      <strong style="color: #0284c7;">${escapeHtml(truck.matricula)}</strong> (${escapeHtml(truck.modelo || truck.marca || 'Camión')})<br>
      <b>Chofer:</b> ${escapeHtml(truck.chofer || 'Sin asignar')}<br>
      <b>Ubicación:</b> ${escapeHtml(ubicacionNombre)}
    </div>
  `);

  if (centrar) {
    truckDetailMapInstance.setView([lat, lng], 16);

    setTimeout(() => {
      truckDetailMapInstance?.invalidateSize();
    }, 250);
  }
}

const API_GESTION = 'http://127.0.0.1:8001';

const $ = id => document.getElementById(id);

const TRUCK_VISUALS = {
  'SBK-3265': {
    imagen: '../resources/Camion1.png',
    fotoPosicion: 'center',
    fotoAjuste: 'cover'
  },
  'SAE-5268': {
    imagen: '../resources/Camion2.png',
    fotoPosicion: 'center',
    fotoAjuste: 'cover'
  },
  'SCE-1235': {
    imagen: '../resources/Camion3.png',
    fotoPosicion: 'left center',
    fotoAjuste: 'contain'
  },
  'SDT-5632': {
    imagen: '../resources/Camion4.png',
    fotoPosicion: 'center',
    fotoAjuste: 'cover'
  }
};

const DEFAULT_TRUCK_VISUAL = {
  imagen: '../resources/Camion1.png',
  fotoPosicion: 'center',
  fotoAjuste: 'cover'
};

let trucks = [];

let catalogos = {
  tipos: [
    'general',
    'reciclaje',
    'mixto'
  ],
  estados: [
    'En base',
    'En taller',
    'Disponible',
    'Recolectando',
    'En circuito',
    'Dirigiéndose a vertedero'
  ],
  turnos: [
    'Diurno',
    'Nocturno'
  ],
  choferes: [],
  cuadrillas: []
};

let selectedTruckId = null;
let selectedTruck = null;
let truckHistory = [];
let truckBusy = false;
let driverBusy = false;
let companionBusy = false;

const tableBody = $('truckTableBody');
const detailPanel = $('truckDetailPanel');
const historyPanel = $('truckHistoryPanel');

const title = $('detalleCamionTitulo');
const truckPhoto = $('truckPhoto');

const truckMapCard =
  document.querySelector('.truck-map-card');

const status = $('truckStatus');
const mapDriver = $('truckMapDriver');

const assignDriverBtn =
  $('assignDriverBtn');

const assignCompanionBtn =
  $('assignCompanionBtn');

const driverModalTitle =
  $('asignarChoferTitulo');

const saveDriverBtn =
  $('guardarChoferBtn');

const dataGrid =
  $('truckDataGrid');

const operationGrid =
  $('truckOperationGrid');

const historyBody =
  $('truckHistoryBody');

const incidentCard =
  $('incidentCard');

const removeSelect =
  $('quitarCamionSelect');

const addForm =
  $('agregarCamionForm');

const removeForm =
  $('quitarCamionForm');

const driverForm =
  $('asignarChoferForm');

const companionForm =
  $('asignarAcompananteForm');

const incidentModal =
  bootstrap.Modal.getOrCreateInstance(
    $('incidenciaModal')
  );

const driverModal =
  bootstrap.Modal.getOrCreateInstance(
    $('asignarChoferModal')
  );

const companionModal =
  bootstrap.Modal.getOrCreateInstance(
    $('asignarAcompananteModal')
  );

const addModal =
  bootstrap.Modal.getOrCreateInstance(
    $('agregarCamionModal')
  );

const removeModal =
  bootstrap.Modal.getOrCreateInstance(
    $('quitarCamionModal')
  );


function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]
  );
}


function validId(value) {
  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id < 1
  ) {
    throw new Error(
      'El identificador no es válido.'
    );
  }

  return id;
}


function showMessage(
  element,
  text = ''
) {
  if (!element) return;

  element.textContent = text;

  element.style.display =
    text ? 'block' : 'none';
}


function responseError(
  data,
  statusCode
) {
  const errors =
    data?.errors &&
      typeof data.errors === 'object'
      ? Object.values(data.errors)
        .flat()
        .filter(
          error =>
            typeof error === 'string'
        )
      : [];

  if (errors.length) {
    return errors.join('\n');
  }

  if (data?.message) {
    return data.message;
  }

  if (statusCode === 401) {
    return 'Tu sesión finalizó.';
  }

  if (statusCode === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }

  if (statusCode === 419) {
    return 'La sesión expiró. Recarga la página.';
  }

  return (
    `No se pudo completar la solicitud ` +
    `(HTTP ${statusCode}).`
  );
}

async function requestJson(
  url,
  {
    method = 'GET',
    body
  } = {}
) {
  const headers = {
    Accept: 'application/json'
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] =
      'application/json';
  }

  let response;

  try {
    response = await fetch(
      url,
      {
        method,
        headers,
        ...(body !== undefined
          ? {
            body:
              JSON.stringify(body)
          }
          : {})
      }
    );
  } catch {
    throw new Error(
      'No se pudo conectar con Laravel.'
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Laravel no devolvió una respuesta válida.'
    );
  }

  if (
    !response.ok ||
    data?.success === false
  ) {
    throw new Error(
      responseError(
        data,
        response.status
      )
    );
  }

  return data;
}


function listData(
  result,
  idField
) {
  if (!Array.isArray(result.data)) {
    throw new Error(
      'Laravel no devolvió una lista válida.'
    );
  }

  return result.data.map(item => ({
    ...item,

    [idField]:
      validId(item[idField])
  }));
}


function formatKm(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  return (
    `${Number(value).toLocaleString(
      'es-UY'
    )} km`
  );
}


function formatKg(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  return (
    `${Number(value).toLocaleString(
      'es-UY',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    )} kg`
  );
}


function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  return date
    ? `${date[3]}/${date[2]}/${date[1]}`
    : String(value);
}


function formatTime(value) {
  if (!value) {
    return '00:00';
  }

  const parts =
    String(value).split(':');

  return parts.length >= 2
    ? `${parts[0]}:${parts[1]}`
    : String(value);
}


function formatType(value) {
  if (!value) {
    return '—';
  }

  const text =
    String(value).trim();

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


function field(
  label,
  value
) {
  return `
    <div class="truck-field">
      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(value ?? '—')}
      </strong>
    </div>
  `;
}


function truckVisual(truck) {
  if (truck.foto && (truck.foto.startsWith('data:image') || truck.foto.startsWith('http') || truck.foto.startsWith('../resources'))) {
    return { imagen: truck.foto, fotoPosicion: 'center', fotoAjuste: 'cover' };
  }

  if (TRUCK_VISUALS[truck.matricula]) {
    return TRUCK_VISUALS[truck.matricula];
  }

  const marca = String(truck.marca || '').toLowerCase();
  const modelo = String(truck.modelo || '').toLowerCase();

  if (marca.includes('iveco') || modelo.includes('eurocargo')) {
    return { imagen: '../resources/Camion2.png', fotoPosicion: 'center', fotoAjuste: 'cover' };
  }
  if (marca.includes('volkswagen') || marca.includes('vw') || modelo.includes('constellation')) {
    return { imagen: '../resources/Camion3.png', fotoPosicion: 'left center', fotoAjuste: 'contain' };
  }
  if (marca.includes('mercedes') || modelo.includes('atego')) {
    return { imagen: '../resources/Camion2.png', fotoPosicion: 'center', fotoAjuste: 'cover' };
  }

  return DEFAULT_TRUCK_VISUAL;
}


function syncTruckVisualHeight() {
  if (
    !truckPhoto ||
    !truckMapCard
  ) {
    return;
  }

  if (
    window.innerWidth <= 991.98
  ) {
    truckMapCard.style.height = '';

    return;
  }

  const height =
    truckPhoto
      .getBoundingClientRect()
      .height;

  if (height > 0) {
    truckMapCard.style.height =
      `${Math.round(height)}px`;
  }
}


function setTruckPhoto(truck) {
  if (!truckPhoto) return;

  const visual =
    truckVisual(truck);

  truckPhoto.onload =
    syncTruckVisualHeight;

  truckPhoto.src =
    visual.imagen;

  truckPhoto.style.objectPosition =
    visual.fotoPosicion;

  truckPhoto.style.objectFit =
    visual.fotoAjuste;

  truckPhoto.alt =
    `Camión ${truck.marca} ${truck.modelo} - ${truck.matricula}`;

  if (truckPhoto.complete) {
    requestAnimationFrame(
      syncTruckVisualHeight
    );
  }
}


function fillSimpleSelect(
  select,
  values,
  emptyLabel = 'Seleccionar'
) {
  if (!select) return;

  select.innerHTML = `
    <option value="">
      ${escapeHtml(emptyLabel)}
    </option>
  ` +
    values.map(value => `
    <option value="${escapeHtml(value)}">
      ${escapeHtml(
      formatType(value)
    )}
    </option>
  `).join('');
}


function fillDriverSelect(
  select,
  selected = ''
) {
  if (!select) return;

  select.innerHTML = `
    <option value="">
      Sin asignar
    </option>
  ` +
    catalogos.choferes
      .map(driver => {
        const name = [
          driver.nombre,
          driver.apellido
        ]
          .filter(Boolean)
          .join(' ');

        const license =
          driver.licencia
            ? ` · ${driver.licencia}`
            : '';

        return `
        <option
          value="${driver.id_usuario}"
        >
          ${escapeHtml(
          name + license
        )}
        </option>
      `;
      })
      .join('');

  select.value =
    selected !== null &&
      selected !== undefined
      ? String(selected)
      : '';
}


function crewLabel(crew) {
  const responsable = [
    crew.responsable_nombre,
    crew.responsable_apellido
  ]
    .filter(Boolean)
    .join(' ');

  if (responsable) {
    return (
      `${crew.id_cuadrilla} · ` +
      responsable
    );
  }

  const details = [
    crew.turno,
    crew.estado
  ]
    .filter(Boolean)
    .join(' · ');

  return details
    ? `${crew.id_cuadrilla} · ${details}`
    : String(crew.id_cuadrilla);
}


function fillCrewSelect(
  select,
  selected = ''
) {
  if (!select) return;

  select.innerHTML = `
    <option value="">
      Sin asignar
    </option>
  ` +
    catalogos.cuadrillas
      .map(crew => `
      <option
        value="${escapeHtml(
        crew.id_cuadrilla
      )}"
      >
        ${escapeHtml(
        crewLabel(crew)
      )}
      </option>
    `)
      .join('');

  select.value =
    selected ?? '';
}


function fillCatalogControls() {
  fillSimpleSelect(
    addForm?.elements.tipo,
    catalogos.tipos
  );

  fillSimpleSelect(
    addForm?.elements.estado,
    catalogos.estados
  );

  fillSimpleSelect(
    addForm?.elements.turno,
    catalogos.turnos,
    'Sin turno'
  );

  fillDriverSelect(
    addForm?.elements.id_chofer
  );

  fillDriverSelect(
    $('asignarChoferNombre')
  );

  fillCrewSelect(
    $('asignarAcompananteCuadrilla')
  );
}


async function loadCatalogs() {
  const result =
    await requestJson(
      `${API_GESTION}/api/camiones/catalogos`
    );

  catalogos = {
    tipos:
      Array.isArray(
        result.data?.tipos
      )
        ? result.data.tipos
        : catalogos.tipos,

    estados:
      Array.isArray(
        result.data?.estados
      )
        ? result.data.estados
        : catalogos.estados,

    turnos:
      Array.isArray(
        result.data?.turnos
      )
        ? result.data.turnos
        : catalogos.turnos,

    choferes:
      Array.isArray(
        result.data?.choferes
      )
        ? result.data.choferes
        : [],

    cuadrillas:
      Array.isArray(
        result.data?.cuadrillas
      )
        ? result.data.cuadrillas
        : []
  };

  fillCatalogControls();
}


function renderTable() {
  if (!tableBody) return;

  tableBody.innerHTML =
    trucks.length
      ? trucks.map(truck => `
        <tr
          class="truck-row ${truck.id_camion ===
          selectedTruckId
          ? 'active'
          : ''
        }"
        >
          <td>
            <strong>
              ${escapeHtml(
          truck.matricula
        )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
          formatType(
            truck.tipo
          )
        )}
          </td>

          <td>
            ${escapeHtml(
          [
            truck.marca,
            truck.modelo
          ]
            .filter(Boolean)
            .join(' ')
        )}
          </td>

          <td>
            ${escapeHtml(
          truck.chofer ||
          'Sin asignar'
        )}
          </td>

          <td>
            ${escapeHtml(
          truck.estado || '—'
        )}
          </td>

          <td>
            ${escapeHtml(
          truck.ubicacion || truck.gps || '—'
        )}
          </td>

          <td>
            ${escapeHtml(
          formatKm(
            truck.km_en_turno
          )
        )}
          </td>

          <td>
            <button
              class="btn btn-outline btn-sm"
              type="button"
              data-open-truck="${truck.id_camion}"
              aria-label="Ver información de ${escapeHtml(
          truck.matricula
        )}"
              title="Ver información"
            >
              <i
                class="bi bi-search"
                aria-hidden="true"
              ></i>
            </button>
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td
            colspan="8"
            class="text-center text-muted-custom py-4"
          >
            No hay camiones registrados.
          </td>
        </tr>
      `;

  if (!removeSelect) return;

  removeSelect.innerHTML =
    trucks.length
      ? trucks.map(truck => `
        <option
          value="${truck.id_camion}"
        >
          ${escapeHtml(
        truck.matricula
      )}
          ·
          ${escapeHtml(
        [
          truck.marca,
          truck.modelo
        ]
          .filter(Boolean)
          .join(' ')
      )}
        </option>
      `).join('')
      : `
        <option value="">
          No hay camiones
        </option>
      `;

  removeSelect.disabled =
    !trucks.length;
}


async function loadTrucks() {
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td
        colspan="8"
        class="text-center text-muted-custom py-4"
      >
        Cargando camiones…
      </td>
    </tr>
  `;

  try {
    trucks = listData(
      await requestJson(
        `${API_GESTION}/api/camiones`
      ),
      'id_camion'
    );

    renderTable();

  } catch (error) {
    trucks = [];

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="text-center text-muted-custom py-4"
        >
          ${escapeHtml(
      error.message
    )}
        </td>
      </tr>
    `;

    if (removeSelect) {
      removeSelect.innerHTML = `
        <option value="">
          No hay camiones
        </option>
      `;

      removeSelect.disabled = true;
    }
  }
}


function renderTruck(truck) {
  selectedTruckId =
    validId(
      truck.id_camion
    );

  selectedTruck =
    truck;

  truckHistory =
    Array.isArray(
      truck.historial
    )
      ? truck.historial
      : [];

  renderTable();

  const modalEl = document.getElementById('detalleCamionModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  renderTruckMap(truck);

  if (title) {
    title.textContent =
      truck.matricula;
  }

  if (status) {
    status.textContent =
      truck.estado || '—';
  }

  if (mapDriver) {
    mapDriver.textContent =
      truck.chofer
        ? `Chofer asignado: ${truck.chofer}`
        : 'Chofer asignado: sin asignar';
  }

  if (assignDriverBtn) {
    assignDriverBtn.textContent =
      truck.id_chofer
        ? 'Editar chofer'
        : 'Asignar chofer';
  }

  if (assignCompanionBtn) {
    assignCompanionBtn.textContent =
      truck.id_cuadrilla
        ? 'Editar acompañante'
        : 'Agregar acompañante';
  }

  setTruckPhoto(truck);

  if (dataGrid) {
    dataGrid.innerHTML = [
      field(
        'Tipo',
        formatType(
          truck.tipo
        )
      ),

      field(
        'Marca',
        truck.marca
      ),

      field(
        'Modelo',
        truck.modelo
      ),

      field(
        'Chasis',
        truck.chasis
      ),

      field(
        'Km totales',
        formatKm(
          truck.km_total
        )
      ),

      field(
        'Última carga',
        formatDate(
          truck.ult_carga_combustible
        )
      ),

      field(
        'Activo',
        truck.activo
          ? 'Sí'
          : 'No'
      ),

      field(
        'GPS / ubicación',
        truck.ubicacion || truck.gps || '—'
      )
    ].join('');
  }

  const route =
    truck.ruta_circuito ||
    truck.ruta_nombre ||
    'Sin asignar';

  if (operationGrid) {
    operationGrid.innerHTML = [
      field(
        'Chofer asignado',
        truck.chofer || 'Sin asignar'
      ),

      field(
        'Ruta',
        route
      ),

      field(
        'Turno',
        truck.turno ||
        'Sin asignar'
      ),

      field(
        'Acompañante',
        truck.id_cuadrilla
          ? `Cuadrilla ${truck.id_cuadrilla}`
          : 'Sin asignar'
      ),

      field(
        'Km en turno',
        formatKm(
          truck.km_en_turno
        )
      ),

      field(
        'Tiempo activo',
        formatTime(
          truck.tiempo_activo
        )
      ),

      field(
        'Capacidad',
        formatKg(
          truck.capacidad_kg
        )
      ),

      field(
        'Peso recolectado',
        formatKg(
          truck.peso_recolectado_kg
        )
      ),

      field(
        'Contenedores',
        `${truck.contenedores_recolectados ?? 0} / ${truck.contenedores_asignados ?? 0}`
      )
    ].join('');
  }

  renderHistory();
}


async function openTruck(id) {
  try {
    const result =
      await requestJson(
        `${API_GESTION}/api/camiones/${validId(id)}`
      );

    renderTruck(
      result.data
    );

  } catch (error) {
    console.error(
      'Camiones:',
      error.message
    );
  }
}


function resolvedStatus(value) {
  const currentStatus =
    String(value || '')
      .toLowerCase();

  return (
    currentStatus.includes(
      'resuelta'
    ) ||
    currentStatus.includes(
      'resuelto'
    ) ||
    currentStatus.includes(
      'finalizada'
    ) ||
    currentStatus.includes(
      'finalizado'
    ) ||
    currentStatus.includes(
      'completada'
    ) ||
    currentStatus.includes(
      'completado'
    )
  );
}


function renderHistory() {
  if (!historyBody) return;

  historyBody.innerHTML =
    truckHistory.length
      ? truckHistory.map(item => `
        <tr>
          <td>
            ${escapeHtml(
        formatDate(
          item.fecha
        )
      )}
          </td>

          <td>
            ${escapeHtml(
        item.tipo || '—'
      )}
          </td>

          <td>
            ${escapeHtml(
        item.detalle || '—'
      )}
          </td>

          <td>
            <span
              class="history-status ${resolvedStatus(
        item.estado
      )
          ? 'resolved'
          : 'open'
        }"
            >
              ${escapeHtml(
          item.estado || '—'
        )}
            </span>
          </td>

          <td>
            <button
              class="btn btn-outline btn-sm"
              type="button"
              data-open-incident="${escapeHtml(
          item.id_historial
        )}"
              aria-label="Ver detalle del registro"
            >
              <i
                class="bi bi-search"
                aria-hidden="true"
              ></i>
            </button>
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td
            colspan="5"
            class="text-center text-muted-custom py-4"
          >
            No hay incidencias o mantenimientos registrados.
          </td>
        </tr>
      `;
}


function openIncident(id) {
  const item =
    truckHistory.find(
      entry =>
        String(
          entry.id_historial
        ) === String(id)
    );

  if (
    !selectedTruck ||
    !item ||
    !incidentCard
  ) {
    return;
  }

  incidentCard.innerHTML = `
    <div class="incident-card-head">
      <div>
        <span class="text-muted-custom">
          ${escapeHtml(
    selectedTruck.matricula
  )}
        </span>

        <h3>
          ${escapeHtml(
    item.tipo || 'Registro'
  )}
        </h3>
      </div>

      <span
        class="history-status ${resolvedStatus(
    item.estado
  )
      ? 'resolved'
      : 'open'
    }"
      >
        ${escapeHtml(
      item.estado || '—'
    )}
      </span>
    </div>

    <div class="incident-card-grid">
      ${field(
      'Fecha',
      formatDate(
        item.fecha
      )
    )}

      ${field(
      'Origen',
      item.origen ===
        'mantenimiento'
        ? 'Mantenimiento'
        : 'Incidencia'
    )}

      ${field(
      'Responsable',
      item.responsable ||
      '—'
    )}
    </div>

    <div class="incident-description">
      <span>
        Descripción
      </span>

      <p>
        ${escapeHtml(
      item.detalle || '—'
    )}
      </p>
    </div>

    ${item.resolucion
      ? `
          <div class="incident-description">
            <span>
              Resolución
            </span>

            <p>
              ${escapeHtml(
        item.resolucion
      )}
            </p>
          </div>
        `
      : ''
    }
  `;

  incidentModal.show();
}


addForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      truckBusy ||
      !addForm.reportValidity()
    ) {
      return;
    }

    showMessage(
      $('agregarCamionMensaje')
    );

    const data =
      Object.fromEntries(
        new FormData(
          addForm
        )
      );

    const body = {
      matricula:
        data.matricula.trim(),

      tipo:
        data.tipo,

      marca:
        data.marca.trim(),

      modelo:
        data.modelo.trim(),

      chasis:
        data.chasis.trim(),

      estado:
        data.estado,

      km_total:
        Number(
          data.km_total
        ),

      ult_carga_combustible:
        data.ult_carga_combustible ||
        null,

      gps:
        data.gps?.trim() ||
        null,

      capacidad_kg:
        data.capacidad_kg
          ? Number(
            data.capacidad_kg
          )
          : null,

      turno:
        data.turno ||
        null,

      id_chofer:
        data.id_chofer
          ? Number(
            data.id_chofer
          )
          : null,

      foto: fotoSeleccionadaDataUrl || null
    };

    try {
      truckBusy = true;

      const result =
        await requestJson(
          `${API_GESTION}/api/camiones`,
          {
            method: 'POST',
            body
          }
        );
      fotoSeleccionadaDataUrl = null;
      if ($('agregarCamionPreviewWrap')) $('agregarCamionPreviewWrap').classList.add('d-none');
      addForm.reset();

      fillCatalogControls();

      addModal.hide();

      await loadTrucks();

      await openTruck(
        result.data.id_camion
      );

    } catch (error) {
      showMessage(
        $('agregarCamionMensaje'),
        error.message
      );

    } finally {
      truckBusy = false;
    }
  }
);


removeForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      truckBusy ||
      !removeSelect?.value
    ) {
      return;
    }

    const id =
      validId(
        removeSelect.value
      );

    const truck =
      trucks.find(
        item =>
          item.id_camion === id
      );

    if (!truck) {
      return;
    }

    if (
      !confirm(
        `¿Dar de baja el camión ${truck.matricula}?`
      )
    ) {
      return;
    }

    showMessage(
      $('quitarCamionMensaje')
    );

    try {
      truckBusy = true;

      await requestJson(
        `${API_GESTION}/api/camiones/${id}`,
        {
          method: 'DELETE'
        }
      );

      removeModal.hide();

      if (
        selectedTruckId === id
      ) {
        selectedTruckId = null;
        selectedTruck = null;
        truckHistory = [];

        detailPanel?.classList.add(
          'd-none'
        );

        historyPanel?.classList.add(
          'd-none'
        );
      }

      await loadTrucks();

    } catch (error) {
      showMessage(
        $('quitarCamionMensaje'),
        error.message
      );

    } finally {
      truckBusy = false;
    }
  }
);


assignDriverBtn?.addEventListener(
  'click',
  () => {
    if (!selectedTruck) {
      return;
    }

    const truckLabel =
      $('asignarChoferCamion');

    if (truckLabel) {
      truckLabel.textContent =
        `${selectedTruck.matricula} · ${selectedTruck.marca} ${selectedTruck.modelo}`;
    }

    fillDriverSelect(
      $('asignarChoferNombre'),
      selectedTruck.id_chofer
    );

    showMessage(
      $('asignarChoferMensaje')
    );

    if (driverModalTitle) {
      driverModalTitle.textContent =
        selectedTruck.id_chofer
          ? 'Editar chofer'
          : 'Asignar chofer';
    }

    if (saveDriverBtn) {
      saveDriverBtn.textContent =
        selectedTruck.id_chofer
          ? 'Guardar cambios'
          : 'Asignar';
    }

    driverModal.show();
  }
);


driverForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      driverBusy ||
      !selectedTruck
    ) {
      return;
    }

    const value =
      $('asignarChoferNombre')
        ?.value || '';

    const idChofer =
      value
        ? validId(value)
        : null;

    showMessage(
      $('asignarChoferMensaje')
    );

    try {
      driverBusy = true;

      await requestJson(
        `${API_GESTION}/api/camiones/${selectedTruck.id_camion}/chofer`,
        {
          method: 'PUT',

          body: {
            id_chofer:
              idChofer
          }
        }
      );

      driverModal.hide();

      setTimeout(() => {
        if (document.getElementById('detalleCamionModal')?.classList.contains('show')) {
          document.body.classList.add('modal-open');
        }
      }, 350);

      await loadTrucks();

      await openTruck(
        selectedTruckId
      );

    } catch (error) {
      showMessage(
        $('asignarChoferMensaje'),
        error.message
      );

    } finally {
      driverBusy = false;
    }
  }
);


assignCompanionBtn?.addEventListener(
  'click',
  () => {
    if (!selectedTruck) {
      return;
    }

    const truckLabel =
      $('asignarAcompananteCamion');

    if (truckLabel) {
      truckLabel.textContent =
        `${selectedTruck.matricula} · ${selectedTruck.marca} ${selectedTruck.modelo}`;
    }

    fillCrewSelect(
      $('asignarAcompananteCuadrilla'),
      selectedTruck.id_cuadrilla
    );

    showMessage(
      $('asignarAcompananteMensaje')
    );

    companionModal.show();
  }
);


companionForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      companionBusy ||
      !selectedTruck
    ) {
      return;
    }

    const value =
      $('asignarAcompananteCuadrilla')
        ?.value || '';

    showMessage(
      $('asignarAcompananteMensaje')
    );

    try {
      companionBusy = true;

      await requestJson(
        `${API_GESTION}/api/camiones/${selectedTruck.id_camion}/cuadrilla`,
        {
          method: 'PUT',

          body: {
            id_cuadrilla:
              value || null
          }
        }
      );

      companionModal.hide();

      setTimeout(() => {
        if (document.getElementById('detalleCamionModal')?.classList.contains('show')) {
          document.body.classList.add('modal-open');
        }
      }, 350);

      await loadTrucks();

      await openTruck(
        selectedTruckId
      );

    } catch (error) {
      showMessage(
        $('asignarAcompananteMensaje'),
        error.message
      );

    } finally {
      companionBusy = false;
    }
  }
);


document.addEventListener(
  'click',
  event => {
    const target =
      event.target;

    if (
      !(target instanceof Element)
    ) {
      return;
    }

    const truckButton =
      target.closest(
        '[data-open-truck]'
      );

    if (truckButton) {
      void openTruck(
        truckButton.dataset
          .openTruck
      );

      return;
    }

    const incidentButton =
      target.closest(
        '[data-open-incident]'
      );

    if (incidentButton) {
      openIncident(
        incidentButton.dataset
          .openIncident
      );
    }
  }
);

async function init() {

  fillCatalogControls();

  try {
    await loadCatalogs();

  } catch (error) {
    console.error(
      'Catálogos de camiones:',
      error.message
    );
  }
  await loadTrucks();
}


window.addEventListener('resize', () => {
  syncTruckVisualHeight();

  if (truckDetailMapInstance) {
    truckDetailMapInstance.invalidateSize();
  }
});

document.getElementById('detalleCamionModal')
  ?.addEventListener('shown.bs.modal', () => {
    syncTruckVisualHeight();

    requestAnimationFrame(() => {
      if (truckDetailMapInstance) {
        truckDetailMapInstance.invalidateSize();
      }
    });
  });

void init();

let fotoSeleccionadaDataUrl = null;

const inputFotoAgregar = $('agregarCamionFoto');
const wrapPreviewFoto = $('agregarCamionPreviewWrap');
const imgPreviewFoto = $('agregarCamionPreviewImg');

inputFotoAgregar?.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) {
    fotoSeleccionadaDataUrl = null;
    wrapPreviewFoto?.classList.add('d-none');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    fotoSeleccionadaDataUrl = e.target?.result;
    if (imgPreviewFoto) imgPreviewFoto.src = fotoSeleccionadaDataUrl;
    wrapPreviewFoto?.classList.remove('d-none');
  };
  reader.readAsDataURL(file);
});

$('agregarCamionModal')?.addEventListener('hidden.bs.modal', () => {
  fotoSeleccionadaDataUrl = null;
  if (imgPreviewFoto) imgPreviewFoto.src = '';
  wrapPreviewFoto?.classList.add('d-none');
  if (inputFotoAgregar) inputFotoAgregar.value = '';
});

$('btnAsignarChoferModalFooter')?.addEventListener('click', () => {
  assignDriverBtn?.click();
});

$('btnAsignarCuadrillaModalFooter')?.addEventListener('click', () => {
  assignCompanionBtn?.click();
});

const btnCambiarFoto = $('btnCambiarFotoDetalle');
const inputCambiarFoto = $('cambiarFotoDetalleInput');

btnCambiarFoto?.addEventListener('click', () => {
  inputCambiarFoto?.click();
});

inputCambiarFoto?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file || !selectedTruck) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const dataUrl = e.target?.result;
    if (!dataUrl) return;

    try {
      await requestJson(`${API_GESTION}/api/camiones/${selectedTruck.id_camion}/foto`, {
        method: 'PUT',
        body: { foto: dataUrl }
      });

      selectedTruck.foto = dataUrl;
      const foundTruck = trucks.find(t => t.id_camion === selectedTruck.id_camion || t.matricula === selectedTruck.matricula);
      if (foundTruck) foundTruck.foto = dataUrl;
      if (truckPhoto) truckPhoto.src = dataUrl;
    } catch (err) {
      alert('No se pudo guardar la foto en la base de datos: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
});

let actualizandoGpsCamion = false;
let ultimoGpsCamion = null;

function obtenerCoordenadasCamion(camion) {
  if (!camion) return null;

  let lat = Number(camion.latitud);
  let lng = Number(camion.longitud);
  if (
    (camion.latitud == null || camion.longitud == null) &&
    typeof camion.gps === 'string'
  ) {
    const partes = camion.gps.split(',');

    if (partes.length === 2) {
      lat = Number(partes[0].trim());
      lng = Number(partes[1].trim());
    }
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

async function actualizarGpsCamionEnMapa() {
  const modal = document.getElementById('detalleCamionModal');

  if (
    !modal?.classList.contains('show') ||
    !selectedTruck?.id_camion ||
    actualizandoGpsCamion
  ) {
    return;
  }

  actualizandoGpsCamion = true;

  const idCamion = selectedTruck.id_camion;

  try {
    const respuesta = await requestJson(
      `${API_GESTION}/api/camiones/${idCamion}`
    );

    const camion = respuesta?.data;

    if (
      !camion ||
      Number(camion.id_camion) !== Number(idCamion)
    ) {
      return;
    }

    if (
      Number(selectedTruck?.id_camion) !== Number(idCamion)
    ) {
      return;
    }

    const coordenadas = obtenerCoordenadasCamion(camion);
    selectedTruck = {
      ...selectedTruck,
      ...camion
    };

    if (!coordenadas) {
      console.warn(
        'El camión todavía no tiene GPS válido:',
        camion.matricula
      );
      return;
    }

    const [lat, lng] = coordenadas;
    const gpsActual = `${lat},${lng}`;
    if (ultimoGpsCamion !== gpsActual) {
      if (truckDetailMapMarker) {
        truckDetailMapMarker.setLatLng([lat, lng]);

      } else {
        renderTruckMap(selectedTruck, false);
      }

      ultimoGpsCamion = gpsActual;
    }

  } catch (error) {
    console.warn(
      'Error actualizando GPS del camión:',
      error
    );
  } finally {
    actualizandoGpsCamion = false;
  }
}

setInterval(actualizarGpsCamionEnMapa, 2000);
document.getElementById('detalleCamionModal')
  ?.addEventListener('hidden.bs.modal', () => {
    ultimoGpsCamion = null;
  });