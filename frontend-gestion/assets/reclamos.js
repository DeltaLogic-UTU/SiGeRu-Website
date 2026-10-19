const API_GESTION =
  'http://127.0.0.1:8001';

const $ =
  id =>
    document.getElementById(id);

let claims = [];
let cuadrillas = [];
// Se eliminó la variable csrfToken porque ya no se usa CSRF.
let busy = false;

const state = {
  selectedId: null
};

const lists = {
  sin_asignar:
    $('claimsUnassigned'),

  asignado:
    $('claimsAssigned'),

  completado:
    $('claimsCompleted')
};

const counters = {
  sin_asignar: [
    $('countUnassigned'),
    $('badgeUnassigned')
  ],

  asignado: [
    $('countAssigned'),
    $('badgeAssigned')
  ],

  completado: [
    $('countCompleted'),
    $('badgeCompleted')
  ]
};

const modal =
  bootstrap.Modal
    .getOrCreateInstance(
      $('claimModal')
    );

const esc = value =>
  String(value ?? '')
    .replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[c]
    );

const field =
  (label, value) => `
    <div class="truck-field">
      <span>${esc(label)}</span>
      <strong>
        ${esc(value || '—')}
      </strong>
    </div>
  `;


function formatDate(value) {
  if (!value) return '—';

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  return match
    ? `${match[3]}/${match[2]}/${match[1]}`
    : String(value);
}


// Se envía el token JWT en el header Authorization: Bearer en cada petición a la API.
async function requestJson(
  url,
  options = {}
) {
  const method =
    (
      options.method ||
      'GET'
    ).toUpperCase();

  const headers = {
    Accept:
      'application/json'
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (method !== 'GET') {
    headers[
      'Content-Type'
    ] =
      'application/json';
  }

  let response;

  try {
    response =
      await fetch(
        `${API_GESTION}${url}`,
        {
          ...options,
          method,
          headers
        }
      );
  } catch {
    throw new Error(
      'No se pudo conectar con Laravel.'
    );
  }

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (
    !response.ok ||
    data?.success === false
  ) {
    const errores =
      data?.errors
        ? Object.values(
            data.errors
          ).flat()
        : [];

    throw new Error(
      errores[0] ||
      data.message ||
      'No se pudo completar la operación.'
    );
  }

  return data;
}


function convertirReclamo(item) {
  return {
    ...item,

    id:
      item.id_reclamo,

    fecha:
      item.fecha_reporte,

    fechaResolucion:
      item.fecha_finalizacion,

    cuadrilla:
      item.id_cuadrilla ||
      item.cuadrilla ||
      null,

    turno:
      item.cuadrilla_turno ||
      null,

    contenedor:
      item.contenedor ||
      null
  };
}


async function cargarReclamos() {
  const result =
    await requestJson(
      '/api/reclamos'
    );

  claims =
    Array.isArray(
      result?.data
    )
      ? result.data.map(
          convertirReclamo
        )
      : [];

  render();
}


async function cargarCuadrillas() {
  const result =
    await requestJson(
      '/api/cuadrillas'
    );

  cuadrillas =
    Array.isArray(result)
      ? result
      : Array.isArray(
          result?.data
        )
        ? result.data
        : [];
}


function statusLabel(claim) {
  if (
    claim.estado ===
    'sin_asignar'
  ) {
    return 'Sin asignar';
  }

  if (
    claim.estado ===
    'asignado'
  ) {
    return claim.cuadrilla
      ? `Asignado a ${claim.cuadrilla}`
      : 'Asignado';
  }

  return claim.cuadrilla
    ? `Completado por ${claim.cuadrilla}`
    : 'Completado';
}


function claimCard(claim) {
  const priority =
    claim.prioridad
      ? ` priority-${String(
          claim.prioridad
        ).toLowerCase()}`
      : '';

  return `
    <button
      class="claim-card${esc(priority)}"
      data-claim-id="${esc(
        claim.id
      )}"
      type="button"
    >
      <div class="claim-card-top">
        <strong>
          ${esc(claim.id)}
        </strong>

        <span>
          ${esc(
            statusLabel(claim)
          )}
        </span>
      </div>

      <p>
        ${esc(
          claim.categoria ||
          claim.tipo ||
          'Reclamo'
        )}
      </p>

      <small>
        <i class="bi bi-geo-alt"></i>

        ${esc(
          claim.ubicacion ||
          claim.zona ||
          'Sin ubicación'
        )}
      </small>
    </button>
  `;
}


function render() {
  Object.entries(
    lists
  ).forEach(
    ([status, container]) => {
      if (!container) return;

      const rows =
        claims.filter(
          item =>
            item.estado === status
        );

      container.innerHTML =
        rows.length
          ? rows
              .map(claimCard)
              .join('')
          : `
              <div class="claims-empty">
                No hay reclamos en esta etapa.
              </div>
            `;

      counters[status]
        .forEach(
          counter => {
            if (counter) {
              counter.textContent =
                rows.length;
            }
          }
        );
    }
  );

  if ($('claimsStatus')) {
    $('claimsStatus')
      .textContent = '';
  }
}


function reclamosAsignados(
  idCuadrilla
) {
  return claims.filter(
    claim =>
      claim.estado ===
        'asignado' &&
      claim.cuadrilla ===
        idCuadrilla
  ).length;
}


function availableCrews() {
  if (!cuadrillas.length) {
    return `
      <div class="claims-empty">
        No hay cuadrillas disponibles.
      </div>
    `;
  }

  return `
    <div class="claim-operation-card">

      <div class="claim-operation-head">
        <h3>
          Cuadrillas disponibles
        </h3>
      </div>

      <div class="table-responsive">
        <table
          class="table truck-table align-middle mb-0"
        >
          <thead>
            <tr>
              <th>Cuadrilla</th>
              <th>Estado</th>
              <th>Turno</th>
              <th>Reclamos</th>
              <th>Asignar</th>
            </tr>
          </thead>

          <tbody>
            ${cuadrillas
              .map(
                item => `
                  <tr>
                    <td>
                      <strong>
                        ${esc(
                          item.id_cuadrilla
                        )}
                      </strong>
                    </td>

                    <td>
                      ${esc(
                        item.estado ||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        item.turno ||
                        '—'
                      )}
                    </td>

                    <td>
                      ${reclamosAsignados(
                        item.id_cuadrilla
                      )}
                    </td>

                    <td>
                      <button
                        class="btn btn-primary btn-sm"
                        data-assign-crew="${esc(
                          item.id_cuadrilla
                        )}"
                        type="button"
                      >
                        Asignar
                      </button>
                    </td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


function assignedCrew(claim) {
  return `
    <div class="claim-operation-card">

      <div class="claim-operation-head">
        <h3>
          Cuadrilla ${esc(
            claim.cuadrilla ||
            '—'
          )}
        </h3>

        <span>
          Turno:
          ${esc(
            claim.turno ||
            '—'
          )}
        </span>
      </div>

      <div class="claim-assigned-list">
        <div>
          <span>
            <strong>
              ${esc(claim.id)}
            </strong>

            <small>
              ${esc(
                formatDate(
                  claim.fecha
                )
              )}
            </small>
          </span>

          <span>
            Asignado
          </span>
        </div>
      </div>

    </div>
  `;
}

function completedResult(claim) {
  const resultado =
    claim.resultado || '';

  return `
    <div
      class="claim-operation-card claim-result-card"
    >
      <div class="claim-operation-head">
        <h3>
          Cuadrilla ${esc(
            claim.cuadrilla ||
            '—'
          )}
        </h3>

        <span>
          ${esc(
            formatDate(
              claim.fechaResolucion
            )
          )}
        </span>
      </div>

      ${
        resultado
          ? `
              <img
                src="${esc(resultado)}"
                alt="Resultado del reclamo completado"
              >
            `
          : `
              <div class="claims-empty">
                Resultado pendiente.
              </div>
            `
      }

      <button
        class="btn btn-primary w-100"
        data-send-result
        type="button"
        ${
          claim.notificado ||
          !resultado
            ? 'disabled'
            : ''
        }
      >
        ${
          claim.notificado
            ? 'Resultado enviado'
            : resultado
              ? `Enviar resultado a ${esc(
                  claim.reclamante
                )}`
              : 'Resultado pendiente'
        }
      </button>
    </div>
  `;
}

function imageForClaim(claim) {
  if (claim.foto) {
    return claim.foto;
  }

  if (
    claim.estado ===
    'asignado'
  ) {
    return '../resources/Contenedor_Asignado.png';
  }

  if (
    claim.estado ===
    'completado'
  ) {
    return '../resources/Contenedor_Reclamo.png';
  }

  return '../resources/Contenedor_Sin_Asignar.png';
}


function mapForClaim(claim) {
  if (
    claim.estado ===
    'asignado'
  ) {
    return '../resources/Reclamo_Asignado.png';
  }

  if (
    claim.estado ===
    'completado'
  ) {
    return '../resources/Reclamo_Completado.png';
  }

  return '../resources/Reclamo_Sin_Asignar.png';
}


function openClaim(id) {
  const claim =
    claims.find(
      item =>
        item.id === id
    );

  if (!claim) return;

  state.selectedId =
    id;

  $('claimModalTitle')
    .textContent =
    claim.id;

  $('claimModalKicker')
    .textContent =
    statusLabel(claim);

  $('claimDetail')
    .innerHTML = [
      field(
        'Reclamante',
        claim.reclamante
      ),

      field(
        'Contacto',
        claim.contacto
      ),

      field(
        'Categoría',
        claim.categoria ||
        claim.tipo
      ),

      field(
        'Contenedor',
        claim.contenedor
      ),

      field(
        'Ubicación',
        claim.ubicacion
      ),

      field(
        'Prioridad',
        claim.prioridad
      ),

      field(
        'Estado',
        statusLabel(claim)
      )
    ].join('');

  $('claimDescription')
    .innerHTML = `
      <span>Descripción</span>

      <p>
        ${esc(
          claim.descripcion ||
          'Sin descripción.'
        )}
      </p>
    `;

  const containerImage =
    $('claimContainerImage');

  containerImage.src =
    imageForClaim(claim);

  containerImage.alt =
    `Estado del contenedor ${
      claim.contenedor ||
      ''
    }`;

  const mapImage =
    $('claimMapImage');

  mapImage.src =
    mapForClaim(claim);

  mapImage.alt =
    `Ubicación del reclamo ${claim.id}`;

  const operational =
    $('claimOperationalPanel');

  if (
    claim.estado ===
    'sin_asignar'
  ) {
    operational.innerHTML =
      availableCrews();

  } else if (
    claim.estado ===
    'asignado'
  ) {
    operational.innerHTML =
      assignedCrew(claim);

  } else {
    operational.innerHTML =
      completedResult(claim);
  }

  const actions =
    $('claimActions');

  if (
    claim.estado ===
    'asignado'
  ) {
    actions.innerHTML = `
      <button
        class="btn btn-outline"
        data-unassign
        type="button"
      >
        Quitar asignación
      </button>
    `;

  } else if (
    claim.estado ===
    'completado'
  ) {
    actions.innerHTML = `
      <button
        class="btn btn-outline"
        data-reopen
        type="button"
      >
        Reabrir reclamo
      </button>
    `;

  } else {
    actions.innerHTML = '';
  }

  modal.show();
}


function selectedClaim() {
  return claims.find(
    item =>
      item.id ===
      state.selectedId
  );
}


async function ejecutarAccion(
  url,
  body
) {
  if (busy) return;

  try {
    busy = true;

    await requestJson(
      url,
      {
        method: 'PUT',

        ...(body !== undefined
          ? {
              body:
                JSON.stringify(
                  body
                )
            }
          : {})
      }
    );

    await cargarReclamos();

  } finally {
    busy = false;
  }
}


document.addEventListener(
  'click',
  async event => {
    const target =
      event.target;

    if (
      !(
        target instanceof
        Element
      )
    ) {
      return;
    }

    const card =
      target.closest(
        '[data-claim-id]'
      );

    if (card) {
      openClaim(
        card.dataset.claimId
      );

      return;
    }

    const claim =
      selectedClaim();

    if (!claim) return;

    try {
      const assign =
        target.closest(
          '[data-assign-crew]'
        );

      if (assign) {
        await ejecutarAccion(
          `/api/reclamos/${encodeURIComponent(
            claim.id
          )}/asignar`,
          {
            id_cuadrilla:
              assign.dataset
                .assignCrew,

            prioridad:
              claim.prioridad ||
              null
          }
        );

        modal.hide();
        return;
      }

      if (
        target.closest(
          '[data-unassign]'
        )
      ) {
        await ejecutarAccion(
          `/api/reclamos/${encodeURIComponent(
            claim.id
          )}/quitar-asignacion`
        );

        modal.hide();
        return;
      }

      if (
        target.closest(
          '[data-reopen]'
        )
      ) {
        await ejecutarAccion(
          `/api/reclamos/${encodeURIComponent(
            claim.id
          )}/reabrir`
        );

        modal.hide();
        return;
      }

      if (
        target.closest(
          '[data-send-result]'
        )
      ) {
        await ejecutarAccion(
          `/api/reclamos/${encodeURIComponent(
            claim.id
          )}/notificar`
        );

        openClaim(
          claim.id
        );
      }

    } catch (error) {
      console.error(
        'Reclamos:',
        error
      );

      if ($('claimsStatus')) {
        $('claimsStatus')
          .textContent =
          error.message;
      } else {
        alert(
          error.message
        );
      }
    }
  }
);


async function iniciarReclamos() {
  try {
    await Promise.all([
      cargarCuadrillas(),
      cargarReclamos()
    ]);

  } catch (error) {
    console.error(
      'Reclamos:',
      error
    );

    if ($('claimsStatus')) {
      $('claimsStatus')
        .textContent =
        error.message ||
        'No se pudieron cargar los reclamos.';
    }
  }
}


iniciarReclamos();