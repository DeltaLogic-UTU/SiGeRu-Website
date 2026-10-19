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

const vehicleGroups = vehicleDetail
  ? vehicleDetail.querySelectorAll('.detail-group')
  : [];

const vehicleExtraFields = {
  turn: vehicleGroups[0]?.querySelectorAll('input')?.[4] || null,
  assigned: vehicleGroups[1]?.querySelectorAll('input')?.[1] || null,
  collected: vehicleGroups[1]?.querySelectorAll('input')?.[2] || null,
  pending: vehicleGroups[1]?.querySelectorAll('input')?.[3] || null,
  start: vehicleGroups[1]?.querySelectorAll('input')?.[4] || null,
  end: vehicleGroups[2]?.querySelectorAll('input')?.[3] || null,
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

function selectedVehicle() {
  const id = selectedVehicleId();

  return (
    camiones.find(
      item =>
        Number(item.id_camion) ===
        id
    ) || null
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

function renderVehicleList(
  selectedId = null
) {
  if (!vehicleList) {
    return;
  }

  if (!camiones.length) {
    vehicleList.innerHTML = `
      <p class="p-3 mb-0 text-muted">
        No hay camiones activos.
      </p>
    `;

    clearVehicleDetail();

    return;
  }

  const activeId =
    Number(
      selectedId ||
      camiones[0].id_camion
    );

  vehicleList.innerHTML =
    camiones.map(camion => {
      const location =
        camion.gps ||
        camion.ruta_circuito ||
        'Sin ubicación';

      const route =
        camion.ruta_circuito
          ? ` · ${escapeHtml(
              camion.ruta_circuito
            )}`
          : '';

      return `
        <button
          class="vehicle-item${
            Number(camion.id_camion) ===
            activeId
              ? ' active'
              : ''
          }"
          data-vehicle-id="${
            Number(camion.id_camion)
          }"
          type="button"
        >
          <strong>
            ${escapeHtml(
              camion.matricula
            )}
          </strong>

          <span>
            Chofer:
            ${escapeHtml(
              camion.chofer ||
              'Sin asignar'
            )}
          </span>

          <small>
            ${escapeHtml(
              camion.estado ||
              'Sin estado'
            )}
            ${
              route ||
              ` · ${escapeHtml(location)}`
            }
          </small>
        </button>
      `;
    }).join('');

  const active =
    camiones.find(
      item =>
        Number(item.id_camion) ===
        activeId
    ) ||
    camiones[0];

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
    camion.gps ||
    camion.ruta_circuito ||
    '—'
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
    camiones.find(
      item =>
        Number(item.id_camion) ===
        Number(id)
    );

  if (camion) {
    updateVehicleDetail(
      camion
    );
  }
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

    updateDashboardSummary();

    showVehicleView();
  } catch (error) {
    console.error(
      error
    );

    if (vehicleList) {
      vehicleList.innerHTML = `
        <div class="alert alert-danger m-2">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }

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

init();