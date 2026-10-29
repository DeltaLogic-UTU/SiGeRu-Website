const API_GESTION = 'http://127.0.0.1:8001';

const $ = id => document.getElementById(id);

const vehicleList = $('vehicleList');
const crewList = $('crewList');
const vehicleDetail = $('vehicleDetail');
const crewDetail = $('crewDetail');
const sidePanelTitle = $('sidePanelTitle');
const crewCircuits = $('crewCircuits');
const crewMembers = $('crewMembers');

const detailFields = {
  vehicle: $('detailVehicle'),
  driver: $('detailDriver'),
  status: $('detailStatus'),
  location: $('detailLocation'),
  circuit: $('detailCircuit'),
  weight: $('detailWeight'),
  capacity: $('detailCapacity'),
  km: $('detailKm')
};

const crewFields = {
  crew: $('crewCode'),
  chief: $('crewChief'),
  location: $('crewLocation'),
  status: $('crewStatus'),
  turn: $('crewTurn'),
  start: $('crewStart'),
  end: $('crewEnd')
};

// Referencias a los campos adicionales del camión por su ID en las columnas de 3 filas
const vehicleExtraFields = {
  turn: $('detailTurn'),
  assigned: $('detailAssigned'),
  collected: $('detailCollected'),
  pending: $('detailPending'),
  start: $('detailStart'),
  end: $('detailEnd'),
  companions:
    vehicleDetail?.querySelector('.companions ul') || null
};

const modalElement = $('operacionModal');

const modal = modalElement
  ? bootstrap.Modal.getOrCreateInstance(modalElement)
  : null;

const modalKicker = $('operacionModalKicker');
const modalTitle = $('operacionModalTitulo');
const modalBody = $('operacionModalBody');
const modalForm = $('operacionForm');
const modalSubmit = $('operacionSubmit');

let camiones = [];

// Configuración de los 4 camiones y choferes principales de SiGeRU
const CAMIONES_DEFECTO = [
  { id_camion: 5, matricula: 'SBK-3265', chofer: 'Albert Einstein', marca: 'Scania', modelo: 'P250', capacidad_kg: 8000, peso_recolectado_kg: 0, estado: 'En base', turno: 'Nocturno', ruta_circuito: null },
  { id_camion: 6, matricula: 'SAE-5268', chofer: 'Leonardo da Vinci', marca: 'Iveco', modelo: 'Eurocargo', capacidad_kg: 7000, peso_recolectado_kg: 0, estado: 'En base', turno: 'Nocturno', ruta_circuito: null },
  { id_camion: 7, matricula: 'SCE-1235', chofer: 'Frida Kahlo', marca: 'Volkswagen', modelo: 'Constellation', capacidad_kg: 8000, peso_recolectado_kg: 0, estado: 'En base', turno: 'Nocturno', ruta_circuito: null },
  { id_camion: 8, matricula: 'SDT-5632', chofer: 'Julio Cortázar', marca: 'Scania', modelo: 'P280', capacidad_kg: 8000, peso_recolectado_kg: 0, estado: 'En base', turno: 'Nocturno', ruta_circuito: null },
  { id_camion: 9, matricula: 'STB-4819', chofer: 'Chofer Demo', marca: 'Mercedes-Benz', modelo: 'Atego 1729', capacidad_kg: 8000, peso_recolectado_kg: 0, estado: 'En base', turno: 'Nocturno', ruta_circuito: null }
];

// Estacionamientos individuales asignados dentro de la Base: Cantón del Buceo
const POSICIONES_BASE_CAMIONES = {
  5: [-34.899180, -56.129520], // Albert Einstein (Scania P250)
  6: [-34.899220, -56.129420], // Leonardo da Vinci (Iveco Eurocargo)
  7: [-34.899260, -56.129320], // Frida Kahlo (VW Constellation)
  8: [-34.899300, -56.129220], // Julio Cortázar (Scania P280)
  9: [-34.899340, -56.129120]  // Chofer Demo (Mercedes-Benz Atego 1729)
};

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Devuelve la ubicación actual del camión (por defecto en Base: Cantón del Buceo)
function obtenerUbicacionActualCamion(camion) {
  if (!camion) return 'Base (Cantón del Buceo)';

  try {
    const gpsGlobal = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');
    const camionGps = gpsGlobal[camion.id_camion] || gpsGlobal[camion.matricula];
    if (camionGps) {
      if (camionGps.ubicacion && camionGps.ubicacion.trim() !== '') {
        return camionGps.ubicacion;
      }
      if (camionGps.lat && camionGps.lng) {
        const dist = calcularDistanciaMetros(camionGps.lat, camionGps.lng, -34.899286, -56.129414);
        if (dist < 150) {
          return 'Base (Cantón del Buceo)';
        }
        return 'Lat: ' + Number(camionGps.lat).toFixed(4) + ', Lng: ' + Number(camionGps.lng).toFixed(4);
      }
    }
  } catch (_) {}

  return 'Base (Cantón del Buceo)';
}
let cuadrillas = [];
let rutasCatalogo = [];
let resumenCircuitos = [];
let reclamos = [];

let currentOperation = null;
// Se eliminó la variable csrfToken porque ya no se usa CSRF.

const escapeHtml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]
  );

function responseError(data, status) {
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

  if (status === 401) {
    return 'Tu sesión finalizó.';
  }

  if (status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }

  if (status === 419) {
    return 'La sesión expiró. Recarga la página.';
  }

  return `No se pudo completar la solicitud (HTTP ${status}).`;
}

// Se envía el token JWT en el header Authorization: Bearer en cada petición a la API de Gestión.
async function requestGestion(
  path,
  {
    method = 'GET',
    body
  } = {}
) {
  method = method.toUpperCase();

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
      `${API_GESTION}${path}`,
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

  let data = {};

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

function listData(result) {
  return Array.isArray(result?.data)
    ? result.data
    : [];
}

function formatNumber(
  value,
  decimals = 2
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return new Intl.NumberFormat(
    'es-UY',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }
  ).format(number);
}

function formatKg(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? `${formatNumber(number)} kg`
    : '—';
}

function formatKm(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? `${formatNumber(number)} km`
    : '—';
}

function formatTime(value) {
  if (!value) {
    return '--';
  }

  const text = String(value);

  const match = text.match(
    /(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/
  );

  return match
    ? match[1]
    : '--';
}

function setInput(field, value) {
  if (field) {
    field.value =
      value ?? '—';
  }
}

function selectedVehicleId() {
  const item =
    vehicleList?.querySelector(
      '[data-vehicle-id].active'
    );

  return item
    ? Number(
        item.dataset.vehicleId
      )
    : null;
}

function selectedCrewId() {
  return (
    crewList
      ?.querySelector(
        '[data-crew-id].active'
      )
      ?.dataset
      .crewId
    || null
  );
}

function listaCamionesActual() {
  return (camiones && camiones.length > 0) ? camiones : CAMIONES_DEFECTO;
}

function selectedVehicle() {
  const id = selectedVehicleId();
  const lista = listaCamionesActual();

  return (
    lista.find(
      item =>
        Number(item.id_camion) ===
        id
    ) || lista[0] || null
  );
}

function selectedCrew() {
  const id = selectedCrewId();

  return (
    cuadrillas.find(
      item =>
        item.id_cuadrilla === id
    ) || null
  );
}

function showVehicleView() {
  vehicleList?.classList.remove(
    'd-none'
  );

  crewList?.classList.add(
    'd-none'
  );

  vehicleDetail?.classList.remove(
    'd-none'
  );

  crewDetail?.classList.add(
    'd-none'
  );

  if (sidePanelTitle) {
    sidePanelTitle.textContent =
      'Camiones en turno';
  }

  const selected =
    selectedVehicle() ||
    camiones[0];

  if (selected) {
    selectVehicle(
      selected.id_camion
    );
  }
}

function showCrewView() {
  vehicleList?.classList.add(
    'd-none'
  );

  crewList?.classList.remove(
    'd-none'
  );

  vehicleDetail?.classList.add(
    'd-none'
  );

  crewDetail?.classList.remove(
    'd-none'
  );

  if (sidePanelTitle) {
    sidePanelTitle.textContent =
      'Cuadrillas en turno';
  }

  const selected =
    selectedCrew() ||
    cuadrillas[0];

  if (selected) {
    selectCrew(
      selected.id_cuadrilla
    );
  }
}

function renderVehicleList(selectedId = null) {
  if (!vehicleList) return;

  const listaACargar = (camiones && camiones.length > 0) ? camiones : CAMIONES_DEFECTO;

  const activeId = Number(
    selectedId ||
    listaACargar[0].id_camion
  );

  vehicleList.innerHTML = listaACargar.map(camion => {
    const ubicacionActual = obtenerUbicacionActualCamion(camion);

    return `
      <button
        class="vehicle-item${Number(camion.id_camion) === activeId ? ' active' : ''}"
        data-vehicle-id="${Number(camion.id_camion)}"
        type="button"
      >
        <strong>${escapeHtml(camion.matricula)}</strong>
        <span>Chofer: ${escapeHtml(camion.chofer || 'Sin asignar')}</span>
        <small class="vehicle-location">
          <i class="bi bi-geo-alt-fill"></i>
          ${escapeHtml(ubicacionActual)}
        </small>
      </button>
    `;
  }).join('');

  const active = listaACargar.find(
    item => Number(item.id_camion) === activeId
  ) || listaACargar[0];

  updateVehicleDetail(active);
}

function clearVehicleDetail() {
  Object.values(
    detailFields
  ).forEach(
    field =>
      setInput(
        field,
        '—'
      )
  );

  Object.entries(
    vehicleExtraFields
  ).forEach(
    ([key, field]) => {
      if (
        field &&
        key !== 'companions'
      ) {
        setInput(
          field,
          '—'
        );
      }
    }
  );

  if (
    vehicleExtraFields
      .companions
  ) {
    vehicleExtraFields
      .companions
      .innerHTML =
        '<li>Sin integrantes asignados</li>';
  }
}

function updateVehicleDetail(camion) {
  if (!camion) {
    return;
  }

  setInput(
    detailFields.vehicle,
    camion.matricula || '—'
  );

  setInput(
    detailFields.driver,
    camion.chofer ||
    'Sin asignar'
  );

  setInput(
    detailFields.status,
    camion.estado || '—'
  );

  setInput(
    detailFields.location,
    obtenerUbicacionActualCamion(camion)
  );

  setInput(
    detailFields.circuit,
    camion.ruta_circuito ||
    'Sin asignar'
  );

  setInput(
    detailFields.weight,
    formatKg(
      camion
        .peso_recolectado_kg
    )
  );

  setInput(
    detailFields.capacity,
    formatKg(
      camion.capacidad_kg
    )
  );

  setInput(
    detailFields.km,
    formatKm(
      camion.km_en_turno
    )
  );

  const assigned =
    Number(
      camion
        .contenedores_asignados ||
      0
    );

  const collected =
    Number(
      camion
        .contenedores_recolectados ||
      0
    );

  setInput(
    vehicleExtraFields.turn,
    camion.turno || '—'
  );

  setInput(
    vehicleExtraFields.assigned,
    formatNumber(
      assigned,
      0
    )
  );

  setInput(
    vehicleExtraFields.collected,
    formatNumber(
      collected,
      0
    )
  );

  setInput(
    vehicleExtraFields.pending,
    formatNumber(
      Math.max(
        assigned -
        collected,
        0
      ),
      0
    )
  );

  /*
   * Camiones no tiene campos
   * hora_inicio / hora_fin.
   * No inventamos esos datos.
   */
  setInput(
    vehicleExtraFields.start,
    '—'
  );

  setInput(
    vehicleExtraFields.end,
    '—'
  );

  if (
    vehicleExtraFields
      .companions
  ) {
    const crew =
      cuadrillas.find(
        item =>
          item.id_cuadrilla ===
          camion.id_cuadrilla
      );

    const members =
      crew?.integrantes ||
      [];

    vehicleExtraFields
      .companions
      .innerHTML =
        members.length
          ? members
              .map(member => `
                <li>
                  ${escapeHtml(
                    `${member.nombre} ${member.apellido}`.trim()
                  )}
                </li>
              `)
              .join('')
          : '<li>Sin integrantes asignados</li>';
  }
      // Buscar ruta en memoria o en las rutas enviadas activas
  const rutasDespachadas = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
  const rutaActiva = rutasPorCamion[camion.id_camion] || rutasDespachadas[camion.matricula] || rutasDespachadas[camion.id_camion];

  if (btnAsignarRutaMapa) {
    btnAsignarRutaMapa.textContent = rutaActiva
      ? 'Editar / Agregar circuitos'
      : 'Asignar ruta';
  }

  // Si la ruta sigue activa, la dibuja; si finalizó, limpia el mapa
  if (typeof dibujarRutaDeCamionEnMapa === 'function') {
    dibujarRutaDeCamionEnMapa(rutaActiva || null);
  }
}

function selectVehicle(id) {
  vehicleList
    ?.querySelectorAll(
      '[data-vehicle-id]'
    )
    .forEach(item => {
      item.classList.toggle(
        'active',
        Number(
          item.dataset
            .vehicleId
        ) ===
        Number(id)
      );
    });

  const camion =
    listaCamionesActual().find(
      item =>
        Number(item.id_camion) ===
        Number(id)
    );

  if (camion) {
    updateVehicleDetail(
      camion
    );
  }

  // Lleva el mapa hasta el GPS del camión seleccionado
  irACamionEnMapa(id);
}

function renderCrewList(
  selectedId = null
) {
  if (!crewList) {
    return;
  }

  if (!cuadrillas.length) {
    crewList.innerHTML = `
      <p class="p-3 mb-0 text-muted">
        No hay cuadrillas.
      </p>
    `;

    clearCrewDetail();

    return;
  }

  const activeId =
    selectedId ||
    cuadrillas[0]
      .id_cuadrilla;

  crewList.innerHTML =
    cuadrillas
      .map(cuadrilla => {
        const location =
          cuadrilla
            .ubicacion_actual
            ? ` · ${escapeHtml(
                cuadrilla
                  .ubicacion_actual
              )}`
            : '';

        return `
          <button
            class="vehicle-item crew-item${
              cuadrilla
                .id_cuadrilla ===
              activeId
                ? ' active'
                : ''
            }"
            data-crew-id="${escapeHtml(
              cuadrilla.id_cuadrilla
            )}"
            type="button"
          >
            <strong>
              ${escapeHtml(
                cuadrilla
                  .id_cuadrilla
              )}
            </strong>

            <span>
              Jefe:
              ${escapeHtml(
                cuadrilla
                  .responsable ||
                'Sin asignar'
              )}
            </span>

            <small>
              ${escapeHtml(
                cuadrilla.estado ||
                'Sin estado'
              )}
              ${location}
            </small>
          </button>
        `;
      })
      .join('');

  const active =
    cuadrillas.find(
      item =>
        item.id_cuadrilla ===
        activeId
    ) ||
    cuadrillas[0];

  updateCrewDetail(active);
}

function clearCrewDetail() {
  Object.values(
    crewFields
  ).forEach(
    field =>
      setInput(
        field,
        '—'
      )
  );

  if (crewCircuits) {
    crewCircuits.innerHTML = '';
  }

  if (crewMembers) {
    crewMembers.innerHTML = '';
  }
}

function updateCrewDetail(
  cuadrilla
) {
  if (!cuadrilla) {
    return;
  }

  setInput(
    crewFields.crew,
    cuadrilla
      .id_cuadrilla ||
    '—'
  );

  setInput(
    crewFields.chief,
    cuadrilla
      .responsable ||
    'Sin asignar'
  );

  setInput(
    crewFields.location,
    cuadrilla
      .ubicacion_actual ||
    '—'
  );

  setInput(
    crewFields.status,
    cuadrilla.estado ||
    '—'
  );

  setInput(
    crewFields.turn,
    cuadrilla.turno ||
    '—'
  );

  setInput(
    crewFields.start,
    '—'
  );

  setInput(
    crewFields.end,
    '—'
  );

  if (crewCircuits) {
    crewCircuits.innerHTML = `
      <div class="info-row info-head">
        <span>Circuito</span>
        <span>Prioridad</span>
        <span>Estado</span>
        <span>Hora</span>
      </div>
    `;

    if (
      !(
        cuadrilla.rutas ||
        []
      ).length
    ) {
      crewCircuits
        .insertAdjacentHTML(
          'beforeend',
          `
            <div class="info-row">
              <span>Sin circuitos</span>
              <span>—</span>
              <span>—</span>
              <span>—</span>
            </div>
          `
        );
    } else {
      cuadrilla
        .rutas
        .forEach(ruta => {
          crewCircuits
            .insertAdjacentHTML(
              'beforeend',
              `
                <div class="info-row">
                  <span>
                    ${escapeHtml(
                      ruta.circuito
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      ruta.prioridad ||
                      '—'
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      ruta.estado ||
                      '—'
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      formatTime(
                        ruta
                          .fecha_asignacion
                      )
                    )}
                  </span>
                </div>
              `
            );
        });
    }
  }

  if (crewMembers) {
    crewMembers.innerHTML = '';

    const members =
      cuadrilla
        .integrantes ||
      [];

    if (!members.length) {
      crewMembers.innerHTML = `
        <div class="member-row">
          <strong class="member-name">
            Sin integrantes
          </strong>
        </div>
      `;
    } else {
      members.forEach(
        (
          member,
          index
        ) => {
          crewMembers
            .insertAdjacentHTML(
              'beforeend',
              `
                <div class="member-row">
                  <span class="member-number">
                    ${String(
                      index + 1
                    ).padStart(
                      2,
                      '0'
                    )}
                  </span>

                  <strong class="member-name">
                    ${escapeHtml(
                      `${member.nombre} ${member.apellido}`.trim()
                    )}
                  </strong>
                </div>
              `
            );
        }
      );
    }
  }
}

function selectCrew(id) {
  crewList
    ?.querySelectorAll(
      '[data-crew-id]'
    )
    .forEach(item => {
      item.classList.toggle(
        'active',
        item.dataset
          .crewId ===
        id
      );
    });

  const cuadrilla =
    cuadrillas.find(
      item =>
        item
          .id_cuadrilla ===
        id
    );

  if (cuadrilla) {
    updateCrewDetail(
      cuadrilla
    );
  }
}

function routeById(idRuta) {
  return (
    rutasCatalogo.find(
      item =>
        Number(
          item.id_ruta
        ) ===
        Number(idRuta)
    ) || null
  );
}

function summaryForRoute(route) {
  if (!route) {
    return null;
  }

  return (
    resumenCircuitos.find(
      item =>
        Number(
          item.id_ruta
        ) ===
        Number(
          route.id_ruta
        )
    ) ||

    resumenCircuitos.find(
      item =>
        item.circuito ===
        route.circuito
    ) ||

    null
  );
}

function municipalities() {
  return [
    ...new Set(
      rutasCatalogo
        .map(
          item =>
            item.municipio
        )
        .filter(Boolean)
    )
  ].sort(
    (
      a,
      b
    ) =>
      String(a)
        .localeCompare(
          String(b),
          'es'
        )
  );
}

function routesForMunicipality(
  municipio
) {
  return rutasCatalogo.filter(
    item =>
      item.municipio ===
      municipio
  );
}

function municipalityOptions(
  selected = ''
) {
  return municipalities()
    .map(
      municipio => `
        <option
          value="${escapeHtml(
            municipio
          )}"
          ${
            municipio ===
            selected
              ? 'selected'
              : ''
          }
        >
          Municipio
          ${escapeHtml(
            municipio
          )}
        </option>
      `
    )
    .join('');
}

function circuitOptions(
  municipio,
  selectedId = null
) {
  return routesForMunicipality(
    municipio
  )
    .map(route => {
      const summary =
        summaryForRoute(
          route
        );

      const counts =
        summary?.counts || {
          verde: 0,
          amarillo: 0,
          rojo: 0
        };

      const level =
        summary?.nivel ||
        'verde';

      return `
        <option
          value="${
            Number(
              route.id_ruta
            )
          }"
          ${
            Number(
              route.id_ruta
            ) ===
            Number(
              selectedId
            )
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(
            route.circuito
          )}
          ·
          ${escapeHtml(
            level
              .toUpperCase()
          )}
          ·
          ${counts.verde}V
          ${counts.amarillo}A
          ${counts.rojo}R
        </option>
      `;
    })
    .join('');
}

function circuitStatusMarkup(
  idRuta
) {
  const route =
    routeById(
      idRuta
    );

  if (!route) {
    return `
      <div
        class="circuit-status-preview"
        data-circuit-preview
      >
        <span>
          Sin circuito seleccionado.
        </span>
      </div>
    `;
  }

  const summary =
    summaryForRoute(
      route
    );

  const counts =
    summary?.counts || {
      verde: 0,
      amarillo: 0,
      rojo: 0
    };

  const level =
    summary?.nivel ||
    'verde';

  const total =
    Number(
      summary?.total ||
      0
    );

  return `
    <div
      class="circuit-status-preview circuit-${escapeHtml(
        level
      )}"
      data-circuit-preview
    >
      <span
        class="circuit-status-dot"
        aria-hidden="true"
      ></span>

      <strong>
        ${escapeHtml(
          route.circuito
        )}
      </strong>

      <span>
        ${total} contenedores
        · ${counts.verde} verdes
        · ${counts.amarillo} amarillos
        · ${counts.rojo} rojos
      </span>
    </div>
  `;
}

function updateCircuitPreview(
  selectId
) {
  const select =
    $(selectId);

  if (!select) {
    return;
  }

  const idRuta =
    Number(
      select.value
    );

  const route =
    routeById(
      idRuta
    );

  const summary =
    summaryForRoute(
      route
    );

  const level =
    summary?.nivel ||
    'verde';

  select.classList.remove(
    'circuit-select-verde',
    'circuit-select-amarillo',
    'circuit-select-rojo'
  );

  if (route) {
    select.classList.add(
      `circuit-select-${level}`
    );
  }

  const preview =
    select
      .closest(
        '.modal-field'
      )
      ?.nextElementSibling;

  if (
    preview?.matches(
      '[data-circuit-preview]'
    )
  ) {
    preview.outerHTML =
      circuitStatusMarkup(
        idRuta
      );
  }
}

function selectOptions(
  values,
  selected = ''
) {
  return values
    .map(
      value => `
        <option
          value="${escapeHtml(
            value
          )}"
          ${
            value ===
            selected
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(
            value
          )}
        </option>
      `
    )
    .join('');
}

function showModalError(
  message
) {
  if (!modalBody) {
    return;
  }

  let alert =
    $('operacionError');

  if (!alert) {
    alert =
      document
        .createElement(
          'div'
        );

    alert.id =
      'operacionError';

    alert.className =
      'alert alert-danger';

    alert.setAttribute(
      'role',
      'alert'
    );

    modalBody.prepend(
      alert
    );
  }

  alert.textContent =
    message;
}

function openOperation({
  kicker,
  title,
  submit = 'Guardar',
  body,
  operation
}) {
  if (!modal) {
    return;
  }

  currentOperation =
    operation;

  if (modalKicker) {
    modalKicker.textContent =
      kicker;
  }

  if (modalTitle) {
    modalTitle.textContent =
      title;
  }

  if (modalSubmit) {
    modalSubmit.textContent =
      submit;
  }

  if (modalBody) {
    modalBody.innerHTML =
      body;
  }

  updateCircuitPreview(
    'routeCircuit'
  );

  updateCircuitPreview(
    'crewCircuitCode'
  );

  modal.show();
}

function priorityFromRoute(
  idRuta
) {
  const route =
    routeById(
      idRuta
    );

  const level =
    summaryForRoute(
      route
    )?.nivel;

  if (level === 'rojo') {
    return 'Alta';
  }

  if (
    level ===
    'amarillo'
  ) {
    return 'Media';
  }

  return 'Baja';
}

function openTruckAction(action) {
  const truck =
    selectedVehicle();

  if (!truck) {
    return;
  }

  if (
    action ===
    'crear_ruta'
  ) {
    const municipios =
      municipalities();

    if (!municipios.length) {
      openOperation({
        kicker:
          truck.matricula,

        title:
          'Sin rutas disponibles',

        submit:
          'Cerrar',

        operation:
          'solo_cerrar',

        body: `
          <div class="modal-confirm">
            <p>
              No hay rutas disponibles
              en el catálogo.
            </p>
          </div>
        `
      });

      return;
    }

    const municipio =
      municipios[0];

    const routes =
      routesForMunicipality(
        municipio
      );

    const firstRoute =
      routes[0] ||
      null;

    openOperation({
      kicker:
        truck.matricula,

      title:
        'Asignar ruta al camión',

      submit:
        'Asignar ruta',

      operation:
        action,

      body: `
        <label class="modal-field">
          <span>
            Municipio
          </span>

          <select
            class="form-select"
            id="routeMunicipality"
          >
            ${municipalityOptions(
              municipio
            )}
          </select>
        </label>

        <label class="modal-field">
          <span>
            Circuito
          </span>

          <select
            class="form-select"
            id="routeCircuit"
          >
            ${circuitOptions(
              municipio,
              firstRoute
                ?.id_ruta
            )}
          </select>
        </label>

        ${circuitStatusMarkup(
          firstRoute
            ?.id_ruta
        )}
      `
    });

    return;
  }

  if (
    action ===
    'editar_ruta'
  ) {
    if (!truck.id_ruta) {
      openOperation({
        kicker:
          truck.matricula,

        title:
          'Sin circuito asignado',

        submit:
          'Cerrar',

        operation:
          'solo_cerrar',

        body: `
          <div class="modal-confirm">
            <p>
              Este camión no tiene un
              circuito asignado para editar.
            </p>
          </div>
        `
      });

      return;
    }

    openOperation({
      kicker:
        truck.matricula,

      title:
        'Editar estado del circuito',

      submit:
        'Guardar estado',

      operation:
        action,

      body: `
        <div class="modal-confirm">
          <span class="modal-field-label">
            Circuito asignado
          </span>

          <strong>
            ${escapeHtml(
              truck
                .ruta_circuito ||
              '—'
            )}
          </strong>
        </div>

        <label class="modal-field">
          <span>
            Estado
          </span>

          <select
            class="form-select"
            id="routeState"
          >
            ${selectOptions(
              [
                'Asignada',
                'En curso',
                'Finalizada'
              ],
              truck
                .ruta_estado ||
              'Asignada'
            )}
          </select>
        </label>
      `
    });

    return;
  }

  if (
    action ===
    'eliminar_ruta'
  ) {
    openOperation({
      kicker:
        truck.matricula,

      title:
        'Quitar circuito',

      submit:
        truck.id_ruta
          ? 'Quitar'
          : 'Cerrar',

      operation:
        truck.id_ruta
          ? action
          : 'solo_cerrar',

      body: `
        <div class="modal-confirm">
          <strong>
            ${escapeHtml(
              truck
                .ruta_circuito ||
              'Sin ruta asignada'
            )}
          </strong>

          <p>
            ${
              truck.id_ruta
                ? 'El circuito dejará de estar asignado a este camión.'
                : 'Este camión no tiene un circuito asignado.'
            }
          </p>
        </div>
      `
    });
  }
}

async function openCrewAction(
  action
) {
  const crew =
    selectedCrew();

  if (!crew) {
    return;
  }

  if (
    action ===
    'asignar_circuito'
  ) {
    const municipios =
      municipalities();

    if (!municipios.length) {
      openOperation({
        kicker:
          crew.id_cuadrilla,

        title:
          'Sin rutas disponibles',

        submit:
          'Cerrar',

        operation:
          'solo_cerrar',

        body: `
          <div class="modal-confirm">
            <p>
              No hay rutas disponibles
              en el catálogo.
            </p>
          </div>
        `
      });

      return;
    }

    const municipio =
      municipios[0];

    const routes =
      routesForMunicipality(
        municipio
      );

    const firstRoute =
      routes[0] ||
      null;

    openOperation({
      kicker:
        crew.id_cuadrilla,

      title:
        'Asignar circuito',

      submit:
        'Asignar',

      operation:
        action,

      body: `
        <label class="modal-field">
          <span>
            Municipio
          </span>

          <select
            class="form-select"
            id="crewCircuitMunicipality"
          >
            ${municipalityOptions(
              municipio
            )}
          </select>
        </label>

        <label class="modal-field">
          <span>
            Circuito
          </span>

          <select
            class="form-select"
            id="crewCircuitCode"
          >
            ${circuitOptions(
              municipio,
              firstRoute
                ?.id_ruta
            )}
          </select>
        </label>

        ${circuitStatusMarkup(
          firstRoute
            ?.id_ruta
        )}
      `
    });

    return;
  }

  if (
    action ===
    'editar_circuito'
  ) {
    const routes =
      crew.rutas || [];

    if (!routes.length) {
      openOperation({
        kicker:
          crew.id_cuadrilla,

        title:
          'Sin circuitos asignados',

        submit:
          'Cerrar',

        operation:
          'solo_cerrar',

        body: `
          <div class="modal-confirm">
            <p>
              La cuadrilla no tiene
              circuitos activos para editar.
            </p>
          </div>
        `
      });

      return;
    }

    const first =
      routes[0];

    const options =
      routes
        .map(
          route => `
            <option
              value="${
                Number(
                  route
                    .id_asignacion
                )
              }"
            >
              ${escapeHtml(
                route.circuito
              )}
            </option>
          `
        )
        .join('');

    openOperation({
      kicker:
        crew.id_cuadrilla,

      title:
        'Editar circuito',

      submit:
        'Guardar cambios',

      operation:
        action,

      body: `
        <label class="modal-field">
          <span>
            Circuito
          </span>

          <select
            class="form-select"
            id="editCircuitAssignment"
          >
            ${options}
          </select>
        </label>

        <label class="modal-field">
          <span>
            Acción
          </span>

          <select
            class="form-select"
            id="editCircuitAction"
          >
            <option value="editar">
              Editar asignación
            </option>

            <option value="quitar">
              Quitar de la cuadrilla
            </option>
          </select>
        </label>

        <label class="modal-field">
          <span>
            Prioridad
          </span>

          <select
            class="form-select"
            id="editCircuitPriority"
          >
            ${selectOptions(
              [
                'Baja',
                'Media',
                'Alta'
              ],
              first.prioridad ||
              'Media'
            )}
          </select>
        </label>

        <label class="modal-field">
          <span>
            Estado
          </span>

          <select
            class="form-select"
            id="editCircuitState"
          >
            ${selectOptions(
              [
                'Asignada',
                'En curso',
                'Finalizada'
              ],
              first.estado ||
              'Asignada'
            )}
          </select>
        </label>
      `
    });

    return;
  }

  if (
    action ===
    'asignar_reclamo'
  ) {
    try {
      const result =
        await requestGestion(
          '/api/reclamos?estado=sin_asignar'
        );

      const pendientes =
        listData(
          result
        );

      if (!pendientes.length) {
        openOperation({
          kicker:
            crew.id_cuadrilla,

          title:
            'Sin reclamos pendientes',

          submit:
            'Cerrar',

          operation:
            'solo_cerrar',

          body: `
            <div class="modal-confirm">
              <p>
                No hay reclamos sin asignar.
              </p>
            </div>
          `
        });

        return;
      }

      const first =
        pendientes[0];

      const options =
        pendientes
          .map(
            reclamo => `
              <option
                value="${escapeHtml(
                  reclamo
                    .id_reclamo
                )}"
              >
                ${escapeHtml(
                  reclamo
                    .id_reclamo
                )}
                ·
                ${escapeHtml(
                  reclamo.tipo ||
                  reclamo.categoria ||
                  'Reclamo'
                )}
                ·
                ${escapeHtml(
                  reclamo.ubicacion ||
                  reclamo.zona ||
                  'Sin ubicación'
                )}
              </option>
            `
          )
          .join('');

      openOperation({
        kicker:
          crew.id_cuadrilla,

        title:
          'Asignar reclamo',

        submit:
          'Asignar reclamo',

        operation:
          action,

        body: `
          <label class="modal-field">
            <span>
              Reclamo
            </span>

            <select
              class="form-select"
              id="claimId"
            >
              ${options}
            </select>
          </label>

          <label class="modal-field">
            <span>
              Prioridad
            </span>

            <select
              class="form-select"
              id="claimPriority"
            >
              ${selectOptions(
                [
                  'Baja',
                  'Media',
                  'Alta'
                ],
                first.prioridad ||
                'Media'
              )}
            </select>
          </label>
        `
      });
    } catch (error) {
      window.alert(
        error.message
      );
    }
  }
}

async function refreshCamiones(
  selectedId = null
) {
  const result =
    await requestGestion(
      '/api/camiones'
    );

  camiones =
    listData(
      result
    );

  renderVehicleList(
    selectedId
  );

  updateDashboardSummary();
}

async function loadCrewDetails(
  cuadrilla
) {
  const [
    routesResult,
    membersResult
  ] = await Promise.all([
    requestGestion(
      `/api/cuadrillas/${encodeURIComponent(
        cuadrilla.id_cuadrilla
      )}/rutas`
    ),

    requestGestion(
      `/api/cuadrillas/${encodeURIComponent(
        cuadrilla.id_cuadrilla
      )}/integrantes`
    )
  ]);

  cuadrilla.rutas =
    listData(
      routesResult
    );

  cuadrilla.integrantes =
    listData(
      membersResult
    );

  return cuadrilla;
}

async function refreshCrew(id) {
  const index =
    cuadrillas.findIndex(
      item =>
        item.id_cuadrilla ===
        id
    );

  if (index < 0) {
    return;
  }

  cuadrillas[index] =
    await loadCrewDetails(
      cuadrillas[index]
    );

  renderCrewList(id);
}

async function refreshReclamos() {
  const result =
    await requestGestion(
      '/api/reclamos'
    );

  reclamos =
    listData(
      result
    );

  updateDashboardSummary();
}

async function handleTruckOperation(
  action
) {
  const truck =
    selectedVehicle();

  if (!truck) {
    return;
  }

  if (
    action ===
    'crear_ruta'
  ) {
    const idRuta =
      Number(
        $('routeCircuit')
          ?.value
      );

    if (!idRuta) {
      throw new Error(
        'Selecciona un circuito.'
      );
    }

    await requestGestion(
      `/api/camiones/${truck.id_camion}/ruta`,
      {
        method: 'PUT',
        body: {
          id_ruta:
            idRuta
        }
      }
    );
  }

  if (
    action ===
    'editar_ruta'
  ) {
    const estado =
      $('routeState')
        ?.value;

    await requestGestion(
      `/api/camiones/${truck.id_camion}/ruta/estado`,
      {
        method: 'PUT',
        body: {
          estado
        }
      }
    );
  }

  if (
    action ===
    'eliminar_ruta'
  ) {
    await requestGestion(
      `/api/camiones/${truck.id_camion}/ruta`,
      {
        method: 'PUT',
        body: {
          id_ruta:
            null
        }
      }
    );
  }

  await refreshCamiones(
    truck.id_camion
  );

  modal?.hide();
}

async function handleCrewOperation(
  action
) {
  const crew =
    selectedCrew();

  if (!crew) {
    return;
  }

  if (
    action ===
    'asignar_circuito'
  ) {
    const idRuta =
      Number(
        $('crewCircuitCode')
          ?.value
      );

    if (!idRuta) {
      throw new Error(
        'Selecciona un circuito.'
      );
    }

    await requestGestion(
      `/api/cuadrillas/${encodeURIComponent(
        crew.id_cuadrilla
      )}/rutas`,
      {
        method: 'POST',

        body: {
          id_ruta:
            idRuta,

          prioridad:
            priorityFromRoute(
              idRuta
            )
        }
      }
    );

    await refreshCrew(
      crew.id_cuadrilla
    );

    modal?.hide();

    return;
  }

  if (
    action ===
    'editar_circuito'
  ) {
    const idAsignacion =
      Number(
        $('editCircuitAssignment')
          ?.value
      );

    const mode =
      $('editCircuitAction')
        ?.value;

    if (!idAsignacion) {
      throw new Error(
        'Selecciona un circuito.'
      );
    }

    if (
      mode ===
      'quitar'
    ) {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(
          crew.id_cuadrilla
        )}/rutas/${idAsignacion}`,
        {
          method:
            'DELETE'
        }
      );
    } else {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(
          crew.id_cuadrilla
        )}/rutas/${idAsignacion}`,
        {
          method:
            'PUT',

          body: {
            prioridad:
              $('editCircuitPriority')
                ?.value,

            estado:
              $('editCircuitState')
                ?.value
          }
        }
      );
    }

    await refreshCrew(
      crew.id_cuadrilla
    );

    modal?.hide();

    return;
  }

  if (
    action ===
    'asignar_reclamo'
  ) {
    const idReclamo =
      $('claimId')
        ?.value;

    const prioridad =
      $('claimPriority')
        ?.value;

    if (!idReclamo) {
      throw new Error(
        'Selecciona un reclamo.'
      );
    }

    await requestGestion(
      `/api/reclamos/${encodeURIComponent(
        idReclamo
      )}/asignar`,
      {
        method:
          'PUT',

        body: {
          id_cuadrilla:
            crew.id_cuadrilla,

          prioridad
        }
      }
    );

    await refreshReclamos();

    modal?.hide();
  }
}

function updateDashboardSummary() {
  const statusItems =
    document.querySelectorAll(
      '.status-grid .status-item strong'
    );

  if (statusItems[0]) {
    const totalRecolectados =
      camiones.reduce(
        (
          total,
          camion
        ) =>
          total +
          Number(
            camion
              .contenedores_recolectados ||
            0
          ),
        0
      );

    statusItems[0].textContent =
      formatNumber(
        totalRecolectados,
        0
      );
  }

  if (statusItems[1]) {
    statusItems[1].textContent =
      String(
        reclamos.filter(
          item =>
            item.estado ===
            'sin_asignar'
        ).length
      );
  }

  if (statusItems[2]) {
    statusItems[2].textContent =
      String(
        reclamos.filter(
          item =>
            item.estado ===
            'completado'
        ).length
      );
  }
}

function updateDateTime() {
  const dateInput =
    document.querySelector(
      '.status-grid input[type="date"]'
    );

  const timeInput =
    document.querySelector(
      '.status-grid input[type="time"]'
    );

  const now =
    new Date();

  if (dateInput) {
    const yyyy =
      now.getFullYear();

    const mm =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dd =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      );

    dateInput.value =
      `${yyyy}-${mm}-${dd}`;
  }

  if (timeInput) {
    timeInput.value =
      `${String(
        now.getHours()
      ).padStart(
        2,
        '0'
      )}:${String(
        now.getMinutes()
      ).padStart(
        2,
        '0'
      )}`;
  }
}

async function init() {
  updateDateTime();

  try {
    const [
      camionesResult,
      cuadrillasResult,
      catalogosResult,
      resumenResult,
      reclamosResult
    ] = await Promise.all([
      requestGestion(
        '/api/camiones'
      ),

      requestGestion(
        '/api/cuadrillas'
      ),

      requestGestion(
        '/api/contenedores/catalogos'
      ),

      requestGestion(
        '/api/contenedores/resumen-circuitos'
      ),

      requestGestion(
        '/api/reclamos'
      )
    ]);

    camiones =
      listData(
        camionesResult
      );

    rutasCatalogo =
      Array.isArray(
        catalogosResult
          ?.data
          ?.rutas
      )
        ? catalogosResult
            .data
            .rutas
        : [];

    resumenCircuitos =
      listData(
        resumenResult
      );

    reclamos =
      listData(
        reclamosResult
      );

    const crewBase =
      listData(
        cuadrillasResult
      );

    cuadrillas =
      await Promise.all(
        crewBase.map(
          loadCrewDetails
        )
      );

    renderVehicleList();
    renderCrewList();
    cargarCamionesEnMapa();

    updateDashboardSummary();

    showVehicleView();
  } catch (error) {
    console.error(
      error
    );

    // Sin API: mostramos igual los 4 camiones de respaldo en la Base
    renderVehicleList();
    cargarCamionesEnMapa();

    if (crewList) {
      crewList.innerHTML = `
        <div class="alert alert-danger m-2">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }
}

vehicleList?.addEventListener(
  'click',
  event => {
    const item =
      event.target.closest(
        '[data-vehicle-id]'
      );

    if (!item) {
      return;
    }

    selectVehicle(
      Number(
        item.dataset
          .vehicleId
      )
    );
  }
);

crewList?.addEventListener(
  'click',
  event => {
    const item =
      event.target.closest(
        '[data-crew-id]'
      );

    if (!item) {
      return;
    }

    selectCrew(
      item.dataset
        .crewId
    );
  }
);

document
  .querySelectorAll(
    '[data-panel-view]'
  )
  .forEach(button => {
    button.addEventListener(
      'click',
      () => {
        document
          .querySelectorAll(
            '[data-panel-view]'
          )
          .forEach(
            item =>
              item.classList.remove(
                'active'
              )
          );

        button.classList.add(
          'active'
        );

        if (
          button.dataset
            .panelView ===
          'cuadrillas'
        ) {
          showCrewView();
        } else {
          showVehicleView();
        }
      }
    );
  });

document
  .querySelectorAll(
    '[data-truck-action]'
  )
  .forEach(button => {
    button.addEventListener(
      'click',
      () =>
        openTruckAction(
          button.dataset
            .truckAction
        )
    );
  });

document
  .querySelectorAll(
    '[data-crew-action]'
  )
  .forEach(button => {
    button.addEventListener(
      'click',
      () =>
        openCrewAction(
          button.dataset
            .crewAction
        )
    );
  });

modalBody?.addEventListener(
  'change',
  event => {
    if (
      event.target.id ===
      'routeMunicipality'
    ) {
      const circuitSelect =
        $('routeCircuit');

      const routes =
        routesForMunicipality(
          event.target.value
        );

      if (circuitSelect) {
        circuitSelect.innerHTML =
          circuitOptions(
            event.target.value,
            routes[0]
              ?.id_ruta
          );

        updateCircuitPreview(
          'routeCircuit'
        );
      }

      return;
    }

    if (
      event.target.id ===
      'routeCircuit'
    ) {
      updateCircuitPreview(
        'routeCircuit'
      );

      return;
    }

    if (
      event.target.id ===
      'crewCircuitMunicipality'
    ) {
      const circuitSelect =
        $('crewCircuitCode');

      const routes =
        routesForMunicipality(
          event.target.value
        );

      if (circuitSelect) {
        circuitSelect.innerHTML =
          circuitOptions(
            event.target.value,
            routes[0]
              ?.id_ruta
          );

        updateCircuitPreview(
          'crewCircuitCode'
        );
      }

      return;
    }

    if (
      event.target.id ===
      'crewCircuitCode'
    ) {
      updateCircuitPreview(
        'crewCircuitCode'
      );

      return;
    }

    if (
      event.target.id ===
      'editCircuitAssignment'
    ) {
      const crew =
        selectedCrew();

      const route =
        crew
          ?.rutas
          ?.find(
            item =>
              Number(
                item
                  .id_asignacion
              ) ===
              Number(
                event.target.value
              )
          );

      if (!route) {
        return;
      }

      const priority =
        $('editCircuitPriority');

      const state =
        $('editCircuitState');

      if (priority) {
        priority.value =
          route.prioridad ||
          'Media';
      }

      if (state) {
        state.value =
          route.estado ||
          'Asignada';
      }

      return;
    }

    if (
      event.target.id ===
      'claimId'
    ) {
      const claim =
        reclamos.find(
          item =>
            item.id_reclamo ===
            event.target.value
        );

      const priority =
        $('claimPriority');

      if (
        priority &&
        claim?.prioridad
      ) {
        priority.value =
          claim.prioridad;
      }
    }
  }
);

modalForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      currentOperation ===
      'solo_cerrar'
    ) {
      modal?.hide();

      return;
    }

    if (modalSubmit) {
      modalSubmit.disabled =
        true;
    }

    try {
      if (
        currentOperation ===
          'crear_ruta' ||
        currentOperation ===
          'editar_ruta' ||
        currentOperation ===
          'eliminar_ruta'
      ) {
        await handleTruckOperation(
          currentOperation
        );
      } else if (
        currentOperation
      ) {
        await handleCrewOperation(
          currentOperation
        );
      }
    } catch (error) {
      showModalError(
        error.message
      );
    } finally {
      if (modalSubmit) {
        modalSubmit.disabled =
          false;
      }
    }
  }
);

document
  .querySelector(
    '[data-map-focus]'
  )
  ?.addEventListener(
    'click',
    () => {
      $('mapa')
        ?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'start'
        });
    }
  );


/* ==========================================================================
   MAPA OPERATIVO: CONTENEDORES Y CIRCUITOS
   ========================================================================== */

// Variables principales para manejar las capas del mapa
let adminMapInstance = null;
let capaCircuitosMapa = null;
let capaContenedoresMapa = null;
let capaCamionesMapa = null;
let marcadoresCamionesMapa = {};

// Variables para la creación de contenedores
let modoEdicionContenedor = false;
let puntoTemporalMapa = null;
let latitudElegida = null;
let longitudElegida = null;
let listaContenedoresMapa = [];
let poligonosMunicipios = [];
let contenedorEditandoId = null;

// Variables para la delimitación y creación de circuitos por puntos
let modoEdicionCircuito = false;
let puntosCircuitoEnDibujo = [];
let marcadoresPuntosCircuito = [];
let poligonoPreviewCircuito = null;
let listaCircuitosCargados = [];
let circuitoEditandoId = null;

// Elementos del HTML para contenedores
const btnCrearContenedorMapa = $('btnCrearContenedorMapa');
const formContenedorMapaWrap = $('formContenedorMapaWrap');
const formContenedorMapa = $('formContenedorMapa');
const btnCancelarContMapa = $('btnCancelarContMapa');
const mapContCircuitoBadge = $('mapContCircuitoBadge');
const mapContAviso = $('mapContAviso');

// Elementos del HTML para circuitos
const btnCrearCircuitoMapa = $('btnCrearCircuitoMapa');
const circuitoDrawingBar = $('circuitoDrawingBar');
const circuitoPuntosCount = $('circuitoPuntosCount');
const btnFinalizarPoligono = $('btnFinalizarPoligono');
const btnDeshacerPunto = $('btnDeshacerPunto');
const btnCancelarCircuito = $('btnCancelarCircuito');
const formCircuitoMapaWrap = $('formCircuitoMapaWrap');
const formCircuitoMapa = $('formCircuitoMapa');
const mapCircuitoTitulo = $('mapCircuitoTitulo');
const mapCircuitoCodigo = $('mapCircuitoCodigo');
const mapCircuitoZona = $('mapCircuitoZona');
const mapCircuitoDesc = $('mapCircuitoDesc');
const btnRedibujarCircuitoMapa = $('btnRedibujarCircuitoMapa');
const btnCancelarCircuitoMapa = $('btnCancelarCircuitoMapa');

// Variables y elementos para armar y editar rutas de camiones
let modoSeleccionRuta = false;
let circuitosSeleccionadosRuta = [];
let poligonosCircuitosMapa = {};
let capaRutaGenerada = null;
let rutasPorCamion = {};

const btnAsignarRutaMapa = $('btnAsignarRutaMapa');
const btnEnviarRutaChofer = $('btnEnviarRutaChofer');
const btnQuitarRutaMapa = $('btnQuitarRutaMapa');
const rutaBuilderBar = $('rutaBuilderBar');
const rutaCircuitosSeleccionados = $('rutaCircuitosSeleccionados');
const btnGenerarRutaMapa = $('btnGenerarRutaMapa');
const btnCerrarBuilderRuta = $('btnCerrarBuilderRuta');

// Devuelve el color del contenedor según los días sin recolección (escala de 5 colores)
function obtenerColorContenedor(dias) {
  const cantidadDias = Number(dias || 1);

  if (cantidadDias <= 2) {
    return '#22c55e'; // Verde: hasta 2 días
  }
  if (cantidadDias === 3) {
    return '#eab308'; // Amarillo: 3er día
  }
  if (cantidadDias === 4) {
    return '#f97316'; // Naranja: 4to día
  }
  if (cantidadDias === 5) {
    return '#ef4444'; // Rojo: 5to día
  }
  return '#18181b'; // Negro: 6 o más días
}

// Dibuja un circuito delimitado en el mapa con bordes bien oscuros
function dibujarCircuitoEnMapa(circuito) {
  if (!capaCircuitosMapa || !Array.isArray(circuito.coordenadas) || circuito.coordenadas.length < 3) {
    return;
  }

  // Polígono con bordes bien oscuros y marcados como solicitó el usuario
  const poligono = window.L.polygon(circuito.coordenadas, {
    color: '#0f172a', // Borde bien oscuro (azul marino casi negro)
    weight: 3,        // Borde grueso y visible
    fillColor: '#0284c7', // Relleno azul
    fillOpacity: 0.28  
  });

  //cuando e seleciona un circuito cambia de color
  poligonosCircuitosMapa[circuito.id_circuito] = poligono;


  const totalCont = Number(circuito.total_contenedores || 0);

  // Popup con los datos del circuito al hacer clic
  poligono.bindPopup(
    `<strong>Circuito ${escapeHtml(circuito.id_circuito)}</strong><br>` +
    (circuito.zona ? `Zona: ${escapeHtml(circuito.zona)}<br>` : '') +
    `Contenedores en el circuito: <b>${totalCont}</b>`
  );

  // Si estamos en modo de dibujo o creación de contenedor, procesamos el clic sobre el circuito
  poligono.on('click', evento => {
    //para selecionar el cicuito para el evento de crear ruta para el camion
    if (modoSeleccionRuta) {
      poligono.closePopup();
      window.L.DomEvent.stopPropagation(evento);
      alternarCircuitoEnRuta(circuito.id_circuito);
      return;
    }

    if (modoEdicionContenedor) {
      poligono.closePopup();
      window.L.DomEvent.stopPropagation(evento);
      procesarClicEnMapa(evento.latlng);
      return;
    }

    if (modoEdicionCircuito) {
      poligono.closePopup();
      window.L.DomEvent.stopPropagation(evento);

      // Si no empezó a dibujar un circuito nuevo (o ya estaba editando uno), seleccionamos este circuito para editarlo
      if (puntosCircuitoEnDibujo.length === 0 || circuitoEditandoId !== null) {
        seleccionarCircuitoParaEditar(circuito);
      } else {
        procesarClicEnMapa(evento.latlng);
      }
    }
  });

  poligono.addTo(capaCircuitosMapa);

  // Colocamos una etiqueta en el centro del circuito con su código (ej: CH_102)
  let sumaLat = 0;
  let sumaLng = 0;
  circuito.coordenadas.forEach(p => {
    sumaLat += Number(p[0]);
    sumaLng += Number(p[1]);
  });
  const centroLat = sumaLat / circuito.coordenadas.length;
  const centroLng = sumaLng / circuito.coordenadas.length;

  const iconoEtiqueta = window.L.divIcon({
    className: 'circuito-map-label',
    html: `<span>${escapeHtml(circuito.id_circuito)}</span>`,
    iconSize: [56, 22],
    iconAnchor: [28, 11]
  });

  const marcadorEtiqueta = window.L.marker([centroLat, centroLng], {
    icon: iconoEtiqueta,
    interactive: false
  }).addTo(capaCircuitosMapa);

  // Si el mapa está alejado (zoom < 14), ocultamos la etiqueta para no saturar la vista
  if (adminMapInstance && adminMapInstance.getZoom() < 14) {
    setTimeout(() => {
      const el = marcadorEtiqueta.getElement();
      if (el) el.style.display = 'none';
    }, 0);
  }
}

// Carga los circuitos desde la API de Gestión y los dibuja en el mapa
async function cargarCircuitosEnMapa() {
  if (!capaCircuitosMapa) {
    return;
  }

  try {
    const respuesta = await requestGestion('/api/circuitos');
    listaCircuitosCargados = listData(respuesta);

    capaCircuitosMapa.clearLayers();

    listaCircuitosCargados.forEach(c => {
      dibujarCircuitoEnMapa(c);
    });
  } catch (error) {
    console.error('No se pudieron cargar los circuitos en el mapa:', error);
  }
}

// Dibuja un contenedor guardado como un punto de color en el mapa
function dibujarContenedorEnMapa(contenedor) {
  if (!capaContenedoresMapa || contenedor.latitud === null || contenedor.longitud === null) {
    return;
  }

  const colorPunto = obtenerColorContenedor(contenedor.dias_sin_recoleccion);
  const textoEstado = contenedor.estado === 'funcional' ? 'Funcionando' : contenedor.estado;

  const marcador = window.L.circleMarker(
    [Number(contenedor.latitud), Number(contenedor.longitud)],
    {
      radius: 8,
      fillColor: colorPunto,
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.95
    }
  );
  // Al hacer clic sobre el punto, muestra los datos del contenedor
  marcador.bindPopup(
    `<strong>Contenedor #${escapeHtml(contenedor.id_contenedor)}</strong><br>` +
    `Código: <b>${escapeHtml(contenedor.codigo)}</b><br>` +
    `Tipo: ${escapeHtml(contenedor.tipo)}<br>` +
    `Capacidad: ${escapeHtml(contenedor.capacidad)} L<br>` +
    `Estado: ${escapeHtml(textoEstado)}<br>` +
    `Circuito: ${escapeHtml(contenedor.circuito)}<br>` +
    `Días sin recolección: ${escapeHtml(contenedor.dias_sin_recoleccion)}`
  );

  // Si estamos en modo edición y tocamos este contenedor, abrimos sus datos para cambiar estado o reubicarlo
  marcador.on('click', evento => {
    if (!modoEdicionContenedor) return;

    marcador.closePopup();
    window.L.DomEvent.stopPropagation(evento);

    contenedorEditandoId = contenedor.id_contenedor;
    latitudElegida = Number(contenedor.latitud);
    longitudElegida = Number(contenedor.longitud);

    if ($('mapContCodigo')) $('mapContCodigo').value = contenedor.codigo || '';
    if ($('mapContTipo')) $('mapContTipo').value = contenedor.tipo || 'general';
    if ($('mapContCapacidad')) $('mapContCapacidad').value = String(contenedor.capacidad || '2000');
    if ($('mapContEstado')) $('mapContEstado').value = contenedor.estado || 'funcional';

    if (mapContCircuitoBadge) {
      mapContCircuitoBadge.textContent = `Editando #${contenedor.id_contenedor}`;
    }
    if (mapContAviso) {
      mapContAviso.textContent = 'Cambiá el estado o hacé clic en el mapa para reubicarlo';
    }

    formContenedorMapaWrap?.classList.remove('d-none');
  });

  marcador.addTo(capaContenedoresMapa);
}

// Pide los contenedores a la API de Gestión y dibuja los que tienen coordenadas en el mapa
async function cargarContenedoresEnMapa() {
  if (!capaContenedoresMapa) {
    return;
  }

  try {
    const respuesta = await requestGestion('/api/contenedores');
    const lista = listData(respuesta);
    listaContenedoresMapa = lista;

    capaContenedoresMapa.clearLayers();

    lista.forEach(contenedor => {
      if (contenedor.latitud !== null && contenedor.longitud !== null) {
        dibujarContenedorEnMapa(contenedor);
      }
    });
  } catch (error) {
    console.error('No se pudieron cargar los contenedores en el mapa:', error);
  }
}

// Cierra el modo de creación de contenedor y limpia formulario
function cerrarEdicionContenedor() {
  const mapCanvas = $('adminMapCanvas');

  modoEdicionContenedor = false;
  latitudElegida = null;
  longitudElegida = null;
  contenedorEditandoId = null;

  if (btnCrearContenedorMapa) {
    btnCrearContenedorMapa.classList.remove('btn-map-red');
    btnCrearContenedorMapa.classList.add('btn-map-green');
    btnCrearContenedorMapa.innerHTML = '<i class="bi bi-plus-circle"></i> <span>Crear contenedor</span>';
  }

  mapCanvas?.classList.remove('modo-crear-contenedor');
  formContenedorMapaWrap?.classList.add('d-none');
  formContenedorMapa?.reset();

  if (puntoTemporalMapa && adminMapInstance) {
    adminMapInstance.removeLayer(puntoTemporalMapa);
    puntoTemporalMapa = null;
  }
}

// Limpia únicamente el dibujo o selección actual de circuito, pero mantiene el modo de edición abierto
function limpiarDibujoActualCircuito() {
  puntosCircuitoEnDibujo = [];
  circuitoEditandoId = null;

  formCircuitoMapaWrap?.classList.add('d-none');
  formCircuitoMapa?.reset();
  btnRedibujarCircuitoMapa?.classList.add('d-none');

  if (mapCircuitoTitulo) {
    mapCircuitoTitulo.textContent = 'Nuevo circuito';
  }
  const aviso = $('mapCircuitoAviso');
  if (aviso) {
    aviso.textContent = 'Se creará la zona y se vinculará a los contenedores que queden dentro.';
  }

  marcadoresPuntosCircuito.forEach(marcador => {
    if (adminMapInstance) {
      adminMapInstance.removeLayer(marcador);
    }
  });
  marcadoresPuntosCircuito = [];

  if (poligonoPreviewCircuito && adminMapInstance) {
    adminMapInstance.removeLayer(poligonoPreviewCircuito);
    poligonoPreviewCircuito = null;
  }

  if (modoEdicionCircuito) {
    circuitoDrawingBar?.classList.remove('d-none');
    actualizarPreviewCircuito();
  } else {
    circuitoDrawingBar?.classList.add('d-none');
  }
}

// Selecciona un circuito existente al hacerle clic en modo edición para modificar sus datos o redibujarlo
function seleccionarCircuitoParaEditar(circuito) {
  if (!circuito || !Array.isArray(circuito.coordenadas)) return;

  limpiarDibujoActualCircuito();
  circuitoEditandoId = circuito.id_circuito;
  puntosCircuitoEnDibujo = circuito.coordenadas.map(p => [Number(p[0]), Number(p[1])]);

  // Dibujamos los vértices del circuito seleccionado en el mapa
  puntosCircuitoEnDibujo.forEach((punto, idx) => {
    const marcador = window.L.circleMarker(punto, {
      radius: idx === 0 ? 8 : 5,
      fillColor: idx === 0 ? '#22c55e' : '#f59e0b',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(adminMapInstance);
    marcadoresPuntosCircuito.push(marcador);
  });

  actualizarPreviewCircuito();

  if (mapCircuitoTitulo) {
    mapCircuitoTitulo.textContent = `Editar circuito ${circuito.id_circuito}`;
  }
  if (mapCircuitoCodigo) {
    mapCircuitoCodigo.value = circuito.id_circuito || '';
  }
  if (mapCircuitoZona) {
    mapCircuitoZona.value = circuito.zona || '';
  }
  if (mapCircuitoDesc) {
    mapCircuitoDesc.value = circuito.descripcion || '';
  }
  const aviso = $('mapCircuitoAviso');
  if (aviso) {
    aviso.textContent = 'Editá los datos o tocá Redibujar para marcar nuevos puntos.';
  }

  btnRedibujarCircuitoMapa?.classList.remove('d-none');
  circuitoDrawingBar?.classList.add('d-none');
  formCircuitoMapaWrap?.classList.remove('d-none');
  mapCircuitoCodigo?.focus();
}

// Cierra el modo de dibujo de circuito y limpia los puntos y líneas temporales
function cerrarEdicionCircuito() {
  const mapCanvas = $('adminMapCanvas');
  const mapPanel = document.querySelector('.map-panel');

  modoEdicionCircuito = false;

  // Volvemos el botón a su estado azul original
  if (btnCrearCircuitoMapa) {
    btnCrearCircuitoMapa.classList.remove('btn-map-red');
    btnCrearCircuitoMapa.classList.add('btn-map-blue');
    btnCrearCircuitoMapa.innerHTML = '<i class="bi bi-bounding-box"></i> <span>Crear circuito</span>';
  }

  // Quitamos la clase y el cursor de dibujo
  mapCanvas?.classList.remove('modo-crear-circuito');
  mapPanel?.classList.remove('modo-crear-circuito');
  if (mapCanvas) {
    mapCanvas.style.cursor = '';
  }

  limpiarDibujoActualCircuito();
}

// Abre la ventana flotante para completar el código y la zona del circuito cerrado
function abrirVentanaGuardarCircuito() {
  if (puntosCircuitoEnDibujo.length < 3) {
    return;
  }

  // Si estamos creando un circuito nuevo, sugerimos automáticamente el código según el municipio (ej: CH_101, A_101)
  if (!circuitoEditandoId && mapCircuitoCodigo) {
    mapCircuitoCodigo.value = sugerirCodigoCircuito();
  }

  // Ocultamos la barra de dibujo y mostramos la ventana flotante para guardar
  circuitoDrawingBar?.classList.add('d-none');
  formCircuitoMapaWrap?.classList.remove('d-none');
  mapCircuitoCodigo?.focus();
}

// Actualiza las líneas o el polígono en tiempo real mientras el usuario marca puntos
function actualizarPreviewCircuito() {
  if (!adminMapInstance) return;

  const cantidad = puntosCircuitoEnDibujo.length;
  if (circuitoPuntosCount) {
    circuitoPuntosCount.textContent = cantidad;
  }

  // Texto explicativo que va guiando al usuario
  const guia = $('circuitoGuiaTexto');
  if (guia) {
    if (cantidad === 0) {
      if (circuitoEditandoId) {
        guia.innerHTML = `Redibujando <strong>${escapeHtml(circuitoEditandoId)}</strong>: haz clic en el mapa para marcar el inicio`;
      } else {
        guia.innerHTML = 'Haz clic en el mapa para crear un circuito o toca uno existente para editarlo';
      }
    } else if (cantidad < 3) {
      guia.innerHTML = `Marcando circuito: <strong>${cantidad}</strong> puntos (marca al menos 3)`;
    } else {
      guia.innerHTML = `Marcando circuito: <strong>${cantidad}</strong> puntos <span class="text-warning">· Clic en el punto verde para cerrar</span>`;
    }
  }

  // Botón directo para cerrar el circuito si ya tiene 3 o más puntos
  if (btnFinalizarPoligono) {
    if (cantidad >= 3) {
      btnFinalizarPoligono.classList.remove('d-none');
      btnFinalizarPoligono.disabled = false;
    } else {
      btnFinalizarPoligono.classList.add('d-none');
      btnFinalizarPoligono.disabled = true;
    }
  }

  if (btnDeshacerPunto) {
    btnDeshacerPunto.disabled = cantidad === 0;
  }

  // Si había una línea o polígono previo, lo quitamos para volver a dibujarlo
  if (poligonoPreviewCircuito) {
    adminMapInstance.removeLayer(poligonoPreviewCircuito);
    poligonoPreviewCircuito = null;
  }

  // Si tenemos 3 o más puntos dibujamos el polígono con bordes oscuros
  if (cantidad >= 3) {
    poligonoPreviewCircuito = window.L.polygon(puntosCircuitoEnDibujo, {
      color: '#0f172a',    // Borde bien oscuro
      weight: 3,           // Borde grueso
      fillColor: '#0284c7', // Relleno azul
      fillOpacity: 0.32
    }).addTo(adminMapInstance);
  } else if (cantidad === 2) {
    // Si tenemos solo 2 puntos dibujamos una línea que los une
    poligonoPreviewCircuito = window.L.polyline(puntosCircuitoEnDibujo, {
      color: '#0f172a',
      weight: 3,
      dashArray: '5, 5'
    }).addTo(adminMapInstance);
  }
}

// Detecta en qué municipio (A, B, C, CH, D, E, F, G) cae una coordenada [lat, lng]
function detectarMunicipioPorCoordenadas(lat, lng) {
  for (const m of poligonosMunicipios) {
    if (puntoDentroDePoligono(lat, lng, m.puntos)) {
      return m.letra;
    }
  }
  return 'CH';
}

// Obtiene el municipio donde cae el centro de un polígono de puntos
function obtenerMunicipioDePuntos(puntos) {
  if (!Array.isArray(puntos) || puntos.length === 0) {
    return 'CH';
  }
  let sumaLat = 0;
  let sumaLng = 0;
  puntos.forEach(p => {
    sumaLat += Number(p[0]);
    sumaLng += Number(p[1]);
  });
  return detectarMunicipioPorCoordenadas(sumaLat / puntos.length, sumaLng / puntos.length);
}

// Genera el código automático de circuito según el municipio empezando desde el 101 (ej: CH_101, A_101, B_101)
function sugerirCodigoCircuito(lat = null, lng = null) {
  let municipio = 'CH';
  if (lat !== null && lng !== null) {
    municipio = detectarMunicipioPorCoordenadas(lat, lng);
  } else if (puntosCircuitoEnDibujo.length > 0) {
    municipio = obtenerMunicipioDePuntos(puntosCircuitoEnDibujo);
  }

  const existentes = listaCircuitosCargados.map(c => String(c.id_circuito || '').toUpperCase());
  let num = 101;
  while (existentes.includes(`${municipio}_${num}`)) {
    num++;
  }
  return `${municipio}_${num}`;
}

// Comprueba si un punto [lat, lng] está dentro de un polígono
function puntoDentroDePoligono(lat, lng, puntos) {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const latI = puntos[i][0], lngI = puntos[i][1];
    const latJ = puntos[j][0], lngJ = puntos[j][1];
    const cruza = ((lngI > lng) !== (lngJ > lng)) &&
      (lat < (latJ - latI) * (lng - lngI) / ((lngJ - lngI) || 0.0000001) + latI);
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

// Genera el código automático según el municipio donde se hizo clic y el último número (ej: CH-CONT-111)
function sugerirCodigoContenedor(lat, lng) {
  const municipio = detectarMunicipioPorCoordenadas(lat, lng);

  let maxNum = 100;
  listaContenedoresMapa.forEach(c => {
    const partes = String(c.codigo || '').match(/(\d+)$/);
    if (partes) {
      const n = Number(partes[1]);
      if (n > maxNum) maxNum = n;
    }
  });

  return `${municipio}-CONT-${maxNum + 1}`;
}

// Procesa clics del usuario sobre el mapa o sobre elementos existentes
function procesarClicEnMapa(latlng) {
  if (!latlng) return;

  const lat = Number(latlng.lat.toFixed(6));
  const lng = Number(latlng.lng.toFixed(6));

  // Modo 1: Creación de contenedor
  if (modoEdicionContenedor) {
    latitudElegida = lat;
    longitudElegida = lng;

    if (puntoTemporalMapa) {
      adminMapInstance.removeLayer(puntoTemporalMapa);
    }

    puntoTemporalMapa = window.L.circleMarker([latitudElegida, longitudElegida], {
      radius: 9,
      fillColor: '#22c55e',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(adminMapInstance);

    if (contenedorEditandoId !== null) {
      if (mapContAviso) {
        mapContAviso.textContent = 'Nueva ubicación marcada · Tocá Guardar para confirmar';
      }
    } else {
      // Buscamos si cae dentro de un circuito existente, o sugerimos el del municipio
      let circuitoDetectado = null;
      for (const c of listaCircuitosCargados) {
        if (Array.isArray(c.coordenadas) && c.coordenadas.length >= 3 && puntoDentroDePoligono(lat, lng, c.coordenadas)) {
          circuitoDetectado = c.id_circuito;
          break;
        }
      }
      const circuitoAuto = circuitoDetectado || sugerirCodigoCircuito(lat, lng);
      if (mapContCircuitoBadge) {
        mapContCircuitoBadge.textContent = `Circuito: ${circuitoAuto}`;
      }
      if (mapContAviso) {
        mapContAviso.textContent = 'ID automático · Día 1 (Verde)';
      }
      if ($('mapContCodigo')) {
        $('mapContCodigo').value = sugerirCodigoContenedor(lat, lng);
      }
    }

    formContenedorMapaWrap?.classList.remove('d-none');
    $('mapContCodigo')?.focus();
    return;
  }

  // Modo 2: Creación o redibujo de circuito por puntos
  if (modoEdicionCircuito) {
    // Si estaba viendo el formulario de un circuito, al hacer clic afuera no agregamos puntos hasta que toque Redibujar o Descartar
    if (formCircuitoMapaWrap && !formCircuitoMapaWrap.classList.contains('d-none')) {
      return;
    }

    // Si ya tenemos al menos 3 puntos, verificamos si el usuario hizo clic cerca del inicio para cerrar el circuito
    if (puntosCircuitoEnDibujo.length >= 3) {
      const pInicio = adminMapInstance.latLngToContainerPoint(puntosCircuitoEnDibujo[0]);
      const pActual = adminMapInstance.latLngToContainerPoint([lat, lng]);
      const distanciaPx = Math.hypot(pActual.x - pInicio.x, pActual.y - pInicio.y);

      // Si el clic fue a menos de 30 píxeles del punto de inicio, cerramos el círculo
      if (distanciaPx <= 30) {
        abrirVentanaGuardarCircuito();
        return;
      }
    }

    // Agregamos el nuevo punto a la lista
    puntosCircuitoEnDibujo.push([lat, lng]);

    // Si es el primer punto, le colocamos un estilo verde especial de inicio
    if (puntosCircuitoEnDibujo.length === 1) {
      const puntoInicio = window.L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#22c55e', // Verde para identificar el inicio
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
      }).addTo(adminMapInstance);

      puntoInicio.bindTooltip('Inicio (haz clic aquí para cerrar)', {
        permanent: false,
        direction: 'top'
      });

      // Al hacer clic directo sobre el punto de inicio con 3 o más puntos, cierra el circuito
      puntoInicio.on('click', evento => {
        if (modoEdicionCircuito && puntosCircuitoEnDibujo.length >= 3) {
          window.L.DomEvent.stopPropagation(evento);
          abrirVentanaGuardarCircuito();
        }
      });

      marcadoresPuntosCircuito.push(puntoInicio);
    } else {
      // Puntos normales del polígono
      const puntoMarcador = window.L.circleMarker([lat, lng], {
        radius: 5,
        fillColor: '#38bdf8',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(adminMapInstance);

      marcadoresPuntosCircuito.push(puntoMarcador);
    }

    actualizarPreviewCircuito();
  }
}

// Inicializa el mapa base de Leaflet dentro de #adminMapCanvas centrado en Montevideo

// Crea el ícono circular del camión exactamente del mismo tamaño que los contenedores (20px)
function crearIconoCamionCirculo(matricula = '', chofer = '', activo = false) {
  return window.L.divIcon({
    className: 'leaflet-camion-circulo-wrap',
    html: `
      <div class="camion-marker-circulo${activo ? ' activo' : ''}" id="map-circulo-camion-${escapeHtml(matricula)}" title="${escapeHtml(matricula)} · ${escapeHtml(chofer)}">
        <img src="assets/icono-camion.png" alt="Camión" />
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}

function cargarCamionesEnMapa() {
  if (!adminMapInstance || typeof window.L === 'undefined') return;

  if (!capaCamionesMapa) {
    capaCamionesMapa = window.L.layerGroup().addTo(adminMapInstance);
  }
  capaCamionesMapa.clearLayers();
  marcadoresCamionesMapa = {};

  const lista = (camiones && camiones.length > 0) ? camiones : CAMIONES_DEFECTO;
  const gpsGlobal = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');
  const camionSeleccionado = selectedVehicle();
  const idSeleccionado = camionSeleccionado ? Number(camionSeleccionado.id_camion) : (lista[0] ? Number(lista[0].id_camion) : null);

  lista.forEach(c => {
    const id = Number(c.id_camion);
    const posBase = POSICIONES_BASE_CAMIONES[id] || COORD_BASE_BUCEO;
    const gpsData = gpsGlobal[id] || gpsGlobal[c.matricula];

    const lat = (gpsData && gpsData.lat) ? Number(gpsData.lat) : posBase[0];
    const lng = (gpsData && gpsData.lng) ? Number(gpsData.lng) : posBase[1];
    const esActivo = id === idSeleccionado;
    const ubicacionTexto = obtenerUbicacionActualCamion(c);

    const icono = crearIconoCamionCirculo(c.matricula, c.chofer || 'Chofer', esActivo);
    const marker = window.L.marker([lat, lng], {
      icon: icono,
      zIndexOffset: esActivo ? 1500 : 1000
    });

    marker.bindPopup(`
      <div style="font-size:0.84rem; line-height: 1.35;">
        <strong style="color: #0284c7; font-size: 0.95rem;">${escapeHtml(c.matricula)}</strong>
        <span style="color: #64748b; font-size: 0.78rem;">(${escapeHtml(c.modelo || c.marca || 'Camión')})</span><br>
        <b>Chofer:</b> ${escapeHtml(c.chofer || 'Sin asignar')}<br>
        <b>Ubicación actual:</b> <span id="map-popup-ub-${id}">${escapeHtml(ubicacionTexto)}</span>
      </div>
    `);

    marker.on('click', () => {
      vehicleList?.querySelectorAll('[data-vehicle-id]').forEach(item => {
        item.classList.toggle('active', Number(item.dataset.vehicleId) === id);
      });
      updateVehicleDetail(c);
    });

    marker.addTo(capaCamionesMapa);
    marcadoresCamionesMapa[id] = marker;
  });
}

function irACamionEnMapa(id) {
  if (!adminMapInstance) return;
  if (!capaCamionesMapa || !marcadoresCamionesMapa[Number(id)]) {
    cargarCamionesEnMapa();
  }

  const numId = Number(id);
  const marker = marcadoresCamionesMapa[numId];
  if (!marker) return;

  document.querySelectorAll('.camion-marker-circulo').forEach(el => el.classList.remove('activo'));
  Object.values(marcadoresCamionesMapa).forEach(m => m.setZIndexOffset(1000));
  marker.setZIndexOffset(2000);
  const iconoDiv = marker.getElement()?.querySelector('.camion-marker-circulo');
  if (iconoDiv) iconoDiv.classList.add('activo');

  // Vuela hasta el camión con zoom de calle
  adminMapInstance.flyTo(marker.getLatLng(), 18, { duration: 0.8 });
  setTimeout(() => marker.openPopup(), 850);
}

// Alias por compatibilidad
const destacarCamionEnMapa = irACamionEnMapa;

function actualizarPosicionesCamionesEnMapa() {
  if (!adminMapInstance || !capaCamionesMapa) return;

  const gpsGlobal = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');
  const lista = (camiones && camiones.length > 0) ? camiones : CAMIONES_DEFECTO;

  let huboCambios = false;

  lista.forEach(c => {
    const id = Number(c.id_camion);
    const marker = marcadoresCamionesMapa[id];
    const gpsData = gpsGlobal[id] || gpsGlobal[c.matricula];

    if (marker && gpsData && gpsData.lat && gpsData.lng) {
      const actualPos = marker.getLatLng();
      const nuevaLat = Number(gpsData.lat);
      const nuevaLng = Number(gpsData.lng);

      if (Math.abs(actualPos.lat - nuevaLat) > 0.00001 || Math.abs(actualPos.lng - nuevaLng) > 0.00001) {
        marker.setLatLng([nuevaLat, nuevaLng]);
              if (Math.abs(actualPos.lat - nuevaLat) > 0.00001 || Math.abs(actualPos.lng - nuevaLng) > 0.00001) {
        marker.setLatLng([nuevaLat, nuevaLng]);
        huboCambios = true;

        // SEGUIR AL CAMIÓN EN DIRECTO: si es el camión que el administrador tiene seleccionado
        const vehiculoActivo = selectedVehicle();
        if (vehiculoActivo && Number(vehiculoActivo.id_camion) === id && adminMapInstance) {
          adminMapInstance.panTo([nuevaLat, nuevaLng], { animate: true, duration: 0.3 });
        }
      }
        huboCambios = true;
      }

      const elemUb = document.getElementById(`map-popup-ub-${id}`);
      if (elemUb && gpsData.ubicacion) {
        elemUb.textContent = gpsData.ubicacion;
      }
    }
  });

  if (huboCambios) {
    const vehiculoActivo = selectedVehicle();
    if (vehiculoActivo) {
      updateVehicleDetail(vehiculoActivo);
    }
  }
}

function initAdminMap() {
  const mapCanvas = $('adminMapCanvas');

  // Si no existe el contenedor en esta página o ya fue creado el mapa, salimos
  if (!mapCanvas || adminMapInstance || typeof window.L === 'undefined') {
    return;
  }

  // Centramos el mapa en Montevideo
  adminMapInstance = window.L.map('adminMapCanvas').setView([-34.88, -56.17], 13);

  // Agregamos la capa de calles de OpenStreetMap
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(adminMapInstance);

  // Capas organizadas: Circuitos abajo, luego Contenedores encima
  capaCircuitosMapa = window.L.layerGroup().addTo(adminMapInstance);
  capaRutaGenerada = window.L.layerGroup().addTo(adminMapInstance);
  capaContenedoresMapa = window.L.layerGroup().addTo(adminMapInstance);
  capaCamionesMapa = window.L.layerGroup().addTo(adminMapInstance);


  // Evento cuando el administrador hace clic en el mapa
  adminMapInstance.on('click', evento => {
    procesarClicEnMapa(evento.latlng);
  });

  // Muestra u oculta los nombres de los circuitos según el nivel de zoom (se ven al acercarse con zoom >= 14)
  adminMapInstance.on('zoomend', () => {
    const zoomActual = adminMapInstance.getZoom();
    const etiquetas = document.querySelectorAll('.circuito-map-label');
    etiquetas.forEach(et => {
      et.style.display = zoomActual >= 14 ? 'inline-block' : 'none';
    });
  });

  // Doble clic sobre el mapa para cerrar el circuito si ya tiene 3 o más puntos
  adminMapInstance.on('dblclick', evento => {
    if (modoEdicionCircuito && puntosCircuitoEnDibujo.length >= 3) {
      if (evento.originalEvent) evento.originalEvent.stopPropagation();
      abrirVentanaGuardarCircuito();
    }
  });

  // Aseguramos que el tamaño del lienzo se calcule bien
  setTimeout(() => {
    adminMapInstance?.invalidateSize();
  }, 150);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      adminMapInstance?.invalidateSize();
    });
    observer.observe(mapCanvas);
  }

  // Cargamos los circuitos, los contenedores y los camiones (punto GPS)
  cargarCircuitosEnMapa();
  cargarContenedoresEnMapa();
  cargarCamionesEnMapa();

    // Escucha el GPS en vivo y los cambios de ruta del chofer
  window.addEventListener('storage', evento => {
    if (evento.key === 'sigeru_gps_camiones' || evento.key === 'sigeru_gps_camion') {
      actualizarPosicionesCamionesEnMapa();
    }
    // Si el chofer finalizó la ruta, se borra de la pantalla del administrador de inmediato
    if (evento.key === 'sigeru_rutas_enviadas_chofer') {
      const vehiculoActivo = selectedVehicle();
      if (vehiculoActivo) {
        const rutasDespachadas = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
        const rutaActiva = rutasDespachadas[vehiculoActivo.matricula] || rutasDespachadas[vehiculoActivo.id_camion];
        if (typeof dibujarRutaDeCamionEnMapa === 'function') {
          dibujarRutaDeCamionEnMapa(rutaActiva || null);
        }
      }
    }
  });
  setInterval(actualizarPosicionesCamionesEnMapa, 300); // Actualización fluida

// Botón "Crear contenedor" / "Cerrar edición"
btnCrearContenedorMapa?.addEventListener('click', () => {
  const mapCanvas = $('adminMapCanvas');

  if (!modoEdicionContenedor) {
    cerrarEdicionCircuito();
    modoEdicionContenedor = true;
    btnCrearContenedorMapa.classList.remove('btn-map-green');
    btnCrearContenedorMapa.classList.add('btn-map-red');
    btnCrearContenedorMapa.innerHTML = '<i class="bi bi-x-circle"></i> <span>Cerrar edición</span>';
    mapCanvas?.classList.add('modo-crear-contenedor');
  } else {
    cerrarEdicionContenedor();
  }
});

// Botón "Cancelar" dentro de la pestaña flotante de contenedor
btnCancelarContMapa?.addEventListener('click', () => {
  formContenedorMapaWrap?.classList.add('d-none');
  formContenedorMapa?.reset();
  contenedorEditandoId = null;

  if (puntoTemporalMapa && adminMapInstance) {
    adminMapInstance.removeLayer(puntoTemporalMapa);
    puntoTemporalMapa = null;
  }
});

// Guardar contenedor en la API de Gestión
formContenedorMapa?.addEventListener('submit', async evento => {
  evento.preventDefault();

  if (latitudElegida === null || longitudElegida === null) {
    return;
  }

  const btnGuardar = $('btnGuardarContMapa');
  if (btnGuardar) {
    btnGuardar.disabled = true;
  }

  try {
    const url = contenedorEditandoId !== null
      ? `/api/contenedores/${contenedorEditandoId}`
      : '/api/contenedores';

    const metodo = contenedorEditandoId !== null ? 'PUT' : 'POST';

    const respuesta = await requestGestion(url, {
      method: metodo,
      body: {
        codigo: $('mapContCodigo')?.value,
        tipo: $('mapContTipo')?.value,
        capacidad: Number($('mapContCapacidad')?.value),
        estado: $('mapContEstado')?.value,
        latitud: latitudElegida,
        longitud: longitudElegida
      }
    });

    if (contenedorEditandoId !== null) {
      await cargarContenedoresEnMapa();
    } else if (respuesta?.data) {
      listaContenedoresMapa.push(respuesta.data);
      dibujarContenedorEnMapa(respuesta.data);
    }

    contenedorEditandoId = null;

    // Ocultamos la ventanita y el punto temporal, pero seguimos en modo edición para agregar más
    formContenedorMapaWrap?.classList.add('d-none');
    if (puntoTemporalMapa && adminMapInstance) {
      adminMapInstance.removeLayer(puntoTemporalMapa);
      puntoTemporalMapa = null;
    }
    latitudElegida = null;
    longitudElegida = null;
  } catch (error) {
    if (mapContAviso) {
      mapContAviso.textContent = error.message;
    }
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
    }
  }
});

// Botón "Crear circuito" / "Cerrar edición"
btnCrearCircuitoMapa?.addEventListener('click', () => {
  const mapCanvas = $('adminMapCanvas');
  const mapPanel = document.querySelector('.map-panel');

  if (!modoEdicionCircuito) {
    cerrarEdicionContenedor();
    modoEdicionCircuito = true;

    // Cambiamos el botón a rojo
    btnCrearCircuitoMapa.classList.remove('btn-map-blue');
    btnCrearCircuitoMapa.classList.add('btn-map-red');
    btnCrearCircuitoMapa.innerHTML = '<i class="bi bi-x-circle"></i> <span>Cerrar edición</span>';

    // Cambiamos la forma y color del cursor en el mapa
    mapCanvas?.classList.add('modo-crear-circuito');
    mapPanel?.classList.add('modo-crear-circuito');
    if (mapCanvas) mapCanvas.style.cursor = 'crosshair';

    // Mostramos la barra superior de guía
    circuitoDrawingBar?.classList.remove('d-none');
    actualizarPreviewCircuito();
  } else {
    cerrarEdicionCircuito();
  }
});

// Deshacer el último punto marcado en el circuito
btnDeshacerPunto?.addEventListener('click', () => {
  if (puntosCircuitoEnDibujo.length === 0) return;

  puntosCircuitoEnDibujo.pop();
  const marcador = marcadoresPuntosCircuito.pop();
  if (marcador && adminMapInstance) {
    adminMapInstance.removeLayer(marcador);
  }
  actualizarPreviewCircuito();
});

// Cancelar dibujo actual desde la barra flotante (sin salir del modo edición)
btnCancelarCircuito?.addEventListener('click', () => {
  limpiarDibujoActualCircuito();
});

// Botón para cerrar el circuito y abrir el formulario
btnFinalizarPoligono?.addEventListener('click', () => {
  abrirVentanaGuardarCircuito();
});

// Botón "Redibujar" cuando se está editando un circuito existente
btnRedibujarCircuitoMapa?.addEventListener('click', () => {
  puntosCircuitoEnDibujo = [];
  marcadoresPuntosCircuito.forEach(marcador => {
    if (adminMapInstance) {
      adminMapInstance.removeLayer(marcador);
    }
  });
  marcadoresPuntosCircuito = [];

  if (poligonoPreviewCircuito && adminMapInstance) {
    adminMapInstance.removeLayer(poligonoPreviewCircuito);
    poligonoPreviewCircuito = null;
  }

  formCircuitoMapaWrap?.classList.add('d-none');
  circuitoDrawingBar?.classList.remove('d-none');
  actualizarPreviewCircuito();
});

// Descartar edición o dibujo actual desde el formulario flotante (sin salir del modo edición)
btnCancelarCircuitoMapa?.addEventListener('click', () => {
  limpiarDibujoActualCircuito();
});

// Guardar el circuito nuevo o editado en la API de Gestión
formCircuitoMapa?.addEventListener('submit', async evento => {
  evento.preventDefault();

  if (puntosCircuitoEnDibujo.length < 3) {
    return;
  }

  const btnGuardar = $('btnGuardarCircuitoMapa');
  if (btnGuardar) {
    btnGuardar.disabled = true;
  }

  try {
    const municipioDetectado = obtenerMunicipioDePuntos(puntosCircuitoEnDibujo);
    const url = circuitoEditandoId !== null
      ? `/api/circuitos/${encodeURIComponent(circuitoEditandoId)}`
      : '/api/circuitos';
    const metodo = circuitoEditandoId !== null ? 'PUT' : 'POST';

    await requestGestion(url, {
      method: metodo,
      body: {
        id_circuito: mapCircuitoCodigo?.value,
        municipio: municipioDetectado,
        zona: mapCircuitoZona?.value || '',
        descripcion: mapCircuitoDesc?.value || '',
        coordenadas: puntosCircuitoEnDibujo
      }
    });

    // Recargamos circuitos y contenedores para ver reflejados los cambios en el mapa
    await cargarCircuitosEnMapa();
    await cargarContenedoresEnMapa();

    // Limpiamos el dibujo actual pero mantenemos el modo edición abierto para crear o editar otro
    limpiarDibujoActualCircuito();
  } catch (error) {
    const aviso = $('mapCircuitoAviso');
    if (aviso) {
      aviso.textContent = error.message;
    }
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
    }
  }
});

// Suma o quita un circuito de la selección actual para la ruta del camión
function alternarCircuitoEnRuta(idCircuito) {
  const indice = circuitosSeleccionadosRuta.indexOf(idCircuito);

  if (indice === -1) {
    circuitosSeleccionadosRuta.push(idCircuito);
  } else {
    circuitosSeleccionadosRuta.splice(indice, 1);
  }

  actualizarVistaSeleccionRuta();
}

// Pinta en el mapa los circuitos seleccionados y actualiza el texto de la barra superior
function actualizarVistaSeleccionRuta() {
  if (rutaCircuitosSeleccionados) {
    rutaCircuitosSeleccionados.textContent =
      circuitosSeleccionadosRuta.length > 0
        ? circuitosSeleccionadosRuta.join(', ')
        : 'Ninguno';
  }

  Object.entries(poligonosCircuitosMapa).forEach(([id, poligono]) => {
    const seleccionado = circuitosSeleccionadosRuta.includes(id);
    poligono.setStyle({
      color: seleccionado ? '#d97706' : '#0f172a',
      weight: seleccionado ? 4 : 3,
      fillColor: seleccionado ? '#f59e0b' : '#0284c7',
      fillOpacity: seleccionado ? 0.45 : 0.28
    });
  });
}

// Cierra el modo de selección de circuitos para ruta
function cerrarSeleccionRuta() {
  modoSeleccionRuta = false;
  rutaBuilderBar?.classList.add('d-none');
  actualizarVistaSeleccionRuta();
}

// Botón "Asignar ruta" (también permite editar y agregar más circuitos a la ruta del camión)
btnAsignarRutaMapa?.addEventListener('click', () => {
  const camion = selectedVehicle();
  if (!camion) {
    alert('Primero seleccioná un camión de la lista izquierda.');
    return;
  }

  cerrarEdicionContenedor();
  cerrarEdicionCircuito();

  modoSeleccionRuta = true;

  // Si el camión ya tenía circuitos en su ruta, los cargamos para poder agregar o quitar circuitos
  const rutaExistente = rutasPorCamion[camion.id_camion];
  circuitosSeleccionadosRuta = rutaExistente
    ? [...rutaExistente.circuitos]
    : [];

  rutaBuilderBar?.classList.remove('d-none');
  actualizarVistaSeleccionRuta();
});

// Botón "Cancelar" en la barra de selección de ruta
btnCerrarBuilderRuta?.addEventListener('click', () => {
  circuitosSeleccionadosRuta = [];
  cerrarSeleccionRuta();
});

// Coordenadas exactas del portón de salida de la Base (Cantón del Buceo hacia Av. Rivera)
// y la entrada del Vertedero (Camino Felipe Cardoso y Camino Cepeda), junto con sus áreas
const COORD_BASE_BUCEO = [-34.899286, -56.129414];
const POLIGONO_BASE_BUCEO = [
  [-34.897954, -56.130250],
  [-34.898171, -56.130496],
  [-34.899286, -56.129639],
  [-34.899260, -56.129350],
  [-34.899164, -56.129243]
];

const COORD_VERTEDERO = [-34.851019, -56.099007];
const POLIGONO_VERTEDERO = [
  [-34.847870, -56.092277],
  [-34.851322, -56.088201],
  [-34.855055, -56.094767],
  [-34.855688, -56.095925],
  [-34.857168, -56.100346],
  [-34.857238, -56.103350],
  [-34.852906, -56.101719],
  [-34.851005, -56.099015]
];

// Dibuja en el mapa la ruta generada (Base -> Contenedores -> Vertedero -> Base)
function dibujarRutaDeCamionEnMapa(datosRuta) {
  if (!capaRutaGenerada) return;
  capaRutaGenerada.clearLayers();

  if (!datosRuta || !Array.isArray(datosRuta.geometriaCalles)) {
    return;
  }

  // 1. Área de la Base Cantón del Buceo y su portón de salida sur (hacia Av. Rivera)
  window.L.polygon(POLIGONO_BASE_BUCEO, {
    color: '#1d4ed8',
    weight: 2,
    fillColor: '#2563eb',
    fillOpacity: 0.25,
    interactive: false
  }).addTo(capaRutaGenerada);

  window.L.circleMarker(COORD_BASE_BUCEO, {
    radius: 9,
    fillColor: '#1d4ed8',
    color: '#ffffff',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup('<strong>Salida Base Cantón del Buceo</strong><br>Portón de salida y regreso de camiones')
    .addTo(capaRutaGenerada);

  // 2. Área completa del Vertedero Felipe Cardoso y su entrada en Camino Felipe Cardoso y Camino Cepeda
  window.L.polygon(POLIGONO_VERTEDERO, {
    color: '#b45309',
    weight: 2,
    fillColor: '#eab308',
    fillOpacity: 0.28,
    interactive: false
  }).addTo(capaRutaGenerada);

  window.L.circleMarker(COORD_VERTEDERO, {
    radius: 9,
    fillColor: '#eab308',
    color: '#0f172a',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup('<strong>Entrada Vertedero Felipe Cardoso</strong><br>Acceso por Cno. Felipe Cardoso y Cno. Cepeda')
    .addTo(capaRutaGenerada);

  // 3. Línea del recorrido (azul mientras se arma, verde cuando ya fue enviada al chofer)
  const colorLinea = datosRuta.estado === 'Enviada al chofer' ? '#16a34a' : '#2563eb';
  const lineaRuta = window.L.polyline(datosRuta.geometriaCalles, {
    color: colorLinea,
    weight: 5,
    opacity: 0.9
  }).addTo(capaRutaGenerada);

  // Ajustamos el zoom para ver todo el recorrido completo
  if (adminMapInstance && datosRuta.geometriaCalles.length > 1) {
    adminMapInstance.fitBounds(lineaRuta.getBounds(), { padding: [35, 35] });
  }
}

// Botón "Generar ruta": filtra contenedores amarillos para arriba de TODOS los circuitos elegidos
btnGenerarRutaMapa?.addEventListener('click', async () => {
  const camion = selectedVehicle();
  if (!camion) {
    alert('Seleccioná un camión primero.');
    return;
  }

  if (circuitosSeleccionadosRuta.length === 0) {
    alert('Tocá al menos un circuito en el mapa para generar la ruta.');
    return;
  }

  const circuitosMayus = circuitosSeleccionadosRuta.map(id => String(id || '').toUpperCase());
  const objetosCircuitosElegidos = listaCircuitosCargados.filter(
    cir => circuitosMayus.includes(String(cir.id_circuito || '').toUpperCase())
  );

  // 1. Filtramos todos los contenedores de los circuitos seleccionados que sean de color amarillo para arriba (>= 3 días).
  // Verificamos tanto por el nombre del circuito como geométricamente dentro del polígono de cada circuito elegido.
  const contenedoresParaRecolectar = listaContenedoresMapa.filter(c => {
    if (c.latitud === null || c.longitud === null) {
      return false;
    }

    const lat = Number(c.latitud);
    const lng = Number(c.longitud);
    const dias = Number(c.dias_sin_recoleccion || 1);
    const esAmarilloOPeor = dias >= 3 || c.estado === 'desbordado';

    if (!esAmarilloOPeor) {
      return false;
    }

    const coincidePorCodigo = circuitosMayus.includes(String(c.circuito || '').toUpperCase());
    const caeDentroDePoligono = objetosCircuitosElegidos.some(
      cir => Array.isArray(cir.coordenadas) && cir.coordenadas.length >= 3 && puntoDentroDePoligono(lat, lng, cir.coordenadas)
    );

    return coincidePorCodigo || caeDentroDePoligono;
  });

  if (contenedoresParaRecolectar.length === 0) {
    alert('En los circuitos seleccionados no hay contenedores de color amarillo o superior (3+ días).');
    return;
  }

  // 2. Armamos los puntos en orden: Base -> Contenedores -> Vertedero -> Vuelta a la Base
  const puntosParadas = [
    COORD_BASE_BUCEO,
    ...contenedoresParaRecolectar.map(c => [Number(c.latitud), Number(c.longitud)]),
    COORD_VERTEDERO,
    COORD_BASE_BUCEO
  ];

  // 3. Consultamos OSRM para que trace la ruta respetando calles, sentidos y señalización del mapa
  let geometriaCalles = puntosParadas;
  let distanciaKm = 0;

  try {
    const queryOsrm = puntosParadas.map(p => `${p[1]},${p[0]}`).join(';');
    const urlOsrm = `https://router.project-osrm.org/route/v1/driving/${queryOsrm}?overview=full&geometries=geojson`;
    const resp = await fetch(urlOsrm);
    const datosOsrm = await resp.json();

    if (datosOsrm.code === 'Ok' && datosOsrm.routes?.[0]) {
      geometriaCalles = datosOsrm.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      distanciaKm = Number((datosOsrm.routes[0].distance / 1000).toFixed(1));
    }
  } catch (error) {
    console.warn('No se pudo conectar a OSRM, usando trazo directo:', error);
  }

  // 4. Guardamos la ruta generada para este camión
  const textoCircuitos = circuitosSeleccionadosRuta.join(', ');
  rutasPorCamion[camion.id_camion] = {
    id_camion: camion.id_camion,
    matricula: camion.matricula,
    chofer: camion.chofer,
    circuitos: [...circuitosSeleccionadosRuta],
    contenedores: contenedoresParaRecolectar,
    geometriaCalles: geometriaCalles,
    distanciaKm: distanciaKm,
    estado: 'Generada (sin enviar)'
  };

  // 5. Actualizamos los datos del camión en la barra de abajo y dibujamos la ruta
  camion.ruta_circuito = textoCircuitos;
  camion.contenedores_asignados = contenedoresParaRecolectar.length;
  camion.contenedores_recolectados = 0;
  camion.km_en_turno = distanciaKm;
  updateVehicleDetail(camion);

  dibujarRutaDeCamionEnMapa(rutasPorCamion[camion.id_camion]);
  cerrarSeleccionRuta();
});

// Botón "Quitar ruta": cancela la ruta del camión, limpia el mapa y actualiza los datos
btnQuitarRutaMapa?.addEventListener('click', async () => {
  const camion = selectedVehicle();
  if (!camion) {
    alert('Primero seleccioná un camión de la lista.');
    return;
  }

  if (!rutasPorCamion[camion.id_camion] && !camion.ruta_circuito) {
    alert('Este camión no tiene ninguna ruta asignada para quitar.');
    return;
  }

  // 1. Si tenía ruta guardada en la API de Gestión, la quitamos también del servidor
  if (camion.id_ruta) {
    try {
      await requestGestion(`/api/camiones/${camion.id_camion}/ruta`, {
        method: 'PUT',
        body: { id_ruta: null }
      });
    } catch (error) {
      console.warn('Aviso al quitar ruta en API:', error);
    }
  }

  // 2. Borramos la ruta en memoria, en localStorage y del mapa
  delete rutasPorCamion[camion.id_camion];
  const rutasDespachadas = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
  delete rutasDespachadas[camion.matricula];
  localStorage.setItem('sigeru_rutas_enviadas_chofer', JSON.stringify(rutasDespachadas));

  circuitosSeleccionadosRuta = [];
  cerrarSeleccionRuta();
  dibujarRutaDeCamionEnMapa(null);

  // 3. Limpiamos los datos de ruta del camión en la barra inferior
  camion.id_ruta = null;
  camion.ruta_circuito = null;
  camion.estado = 'En base (Cantón del Buceo)';
  camion.contenedores_asignados = 0;
  camion.contenedores_recolectados = 0;
  camion.km_en_turno = 0;

  updateVehicleDetail(camion);
  renderVehicleList(camion.id_camion);
});

// Botón "Enviar ruta a chofer": despacha la ruta generada para que el chofer pueda iniciarla
btnEnviarRutaChofer?.addEventListener('click', async () => {
  const camion = selectedVehicle();
  if (!camion) {
    alert('Primero seleccioná un camión de la lista.');
    return;
  }

  const rutaActual = rutasPorCamion[camion.id_camion];
  if (!rutaActual) {
    alert('Primero debés asignar los circuitos y tocar "Generar ruta" para este camión.');
    return;
  }

  btnEnviarRutaChofer.disabled = true;

  try {
    // 1. Buscamos el id_ruta del primer circuito en el catálogo para vincularlo en la base de datos
    const primerCircuito = rutaActual.circuitos[0];
    const rutaCatalogo = rutasCatalogo.find(
      r => String(r.circuito || '').toUpperCase() === String(primerCircuito || '').toUpperCase()
    );

    if (rutaCatalogo?.id_ruta) {
      try {
        await requestGestion(`/api/camiones/${camion.id_camion}/ruta`, {
          method: 'PUT',
          body: { id_ruta: Number(rutaCatalogo.id_ruta) }
        });
        camion.id_ruta = Number(rutaCatalogo.id_ruta);
      } catch (errRutaDb) {
        console.warn('Aviso al vincular id_ruta en camión:', errRutaDb);
      }
    }

    // 2. Marcamos la ruta como enviada al chofer y la guardamos para que la app del chofer / simulador la reciba
    rutaActual.estado = 'Enviada al chofer';
    rutaActual.fecha_envio = new Date().toISOString();

    const rutasDespachadas = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
    rutasDespachadas[camion.matricula] = rutaActual;
    localStorage.setItem('sigeru_rutas_enviadas_chofer', JSON.stringify(rutasDespachadas));

    // Enviamos también la ruta generada a la API de Recolección (puerto 8002) y respaldo en API Gestión (8001)
    const payloadDespacho = {
      id_camion: Number(camion.id_camion),
      id_ruta: camion.id_ruta ? Number(camion.id_ruta) : null,
      circuitos: rutaActual.circuitos,
      contenedores: rutaActual.contenedores,
      geometriaCalles: rutaActual.geometriaCalles,
      distanciaKm: Number(rutaActual.distanciaKm || 0)
    };

    try {
      const token = getToken();
      await fetch('http://127.0.0.1:8002/api/rutas/despachar', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payloadDespacho)
      });
    } catch (errApiRecoleccion) {
      try {
        await requestGestion('/api/rutas/despachar', {
          method: 'POST',
          body: payloadDespacho
        });
      } catch (errRespaldo) {
        console.warn('Aviso al despachar ruta en API:', errRespaldo);
      }
    }

    // 3. Actualizamos el estado en la barra de abajo del camión y pintamos la ruta en verde
    camion.estado = 'Ruta enviada a chofer';
    updateVehicleDetail(camion);
    renderVehicleList(camion.id_camion);

    alert(
      `Ruta enviada al chofer (${camion.chofer || camion.matricula}).\n` +
      `Circuitos: ${rutaActual.circuitos.join(', ')}\n` +
      `Contenedores a recolectar (amarillo o superior): ${rutaActual.contenedores.length}\n` +
      `Distancia total hasta vertedero y regreso a base: ${rutaActual.distanciaKm} km`
    );
  } catch (error) {
    alert('Error al enviar la ruta al chofer: ' + error.message);
  } finally {
    btnEnviarRutaChofer.disabled = false;
  }
});

// COLORES SUAVES PARA DIFERENCIAR LOS MUNICIPIOS EN EL MAPA
const colores_municipios = [
  '#f6483b', // A (azul)
  '#10b981', // B (verde)
  '#8b5cf6', // C (violeta)
  '#06b6d4', // CH (cian)
  '#f59e0b', // D (amarillo)
  '#ec4899', // E (rosa)
  '#14b8a6', // F (turquesa)
  '#6366f1'  // G (índigo)
];

const letras_municipios = ['A', 'B', 'C', 'CH', 'D', 'E', 'F', 'G'];

async function cargarMunicipiosDesdeJson() {
  try {
    // se trae a la ap el archivo municipios
    const respuesta = await fetch('../municipios/sig_municipios.json');
    const datos = await respuesta.json();

    // se define la proyección del mapa (EPSG:4326)
    proj4.defs("EPSG:32721", "+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs");

    // se recorre las 8 geometrias que estan en el archivo de municipios 
    datos.geometries.forEach((geometria, indice) =>{
      const letra = letras_municipios[indice];
      const color = colores_municipios[indice];

      //convertimos cada coordenada [X, Y] a Latitud y longitud, 
      
      const puntosLeaflet = [];
      const puntosOriginales = geometria.coordinates[0];

      for(let i = 0; i < puntosOriginales.length; i += 4){
        const [x, y] = puntosOriginales[i];
        const [lon, lat] = proj4("EPSG:32721", "EPSG:4326", [x, y]);
        puntosLeaflet.push([lat, lon]);
      }

      //Se dibuja los poligonos representado cada municipio dentro del mapa leaflet
      const poligono = L.polygon(puntosLeaflet, {
        color: color,
        weight: 1, //borde del poligono
        opacity: 0.5, //opacidad del borde
        fillColor: color,
        fillOpacity: 0.08,//transparencia del relleno
        interactive: false // para que no interfiera al hacer clic en el mapa
      });

      poligono.addTo(adminMapInstance);
      poligonosMunicipios.push({ letra: letra, puntos: puntosLeaflet});
    });
    
  } catch (error) {
    console.error('Error al cargar los municipios:', error);
  }
}

initAdminMap();
cargarMunicipiosDesdeJson();

init();