const API_GESTION =
  'http://127.0.0.1:8001';

const $ =
  id =>
    document.getElementById(id);

let incidencias = [];
let cuadrillas = [];
let containerTypes = [];

let incidentBusy = false;
let incidentToReplace = null;

const state = {
  tab: 'camiones',
  resolucion: 'activas'
};

const body =
  $('incidentBody');

const head =
  $('incidentHead');

const form =
  $('incidentForm');

const resolutionFilter =
  $('incidentResolutionFilter');

const incidentModalElement =
  $('incidentModal');

const modal =
  incidentModalElement
    ? bootstrap.Modal
      .getOrCreateInstance(
        incidentModalElement
      )
    : null;

const replaceForm =
  $('incidentReplaceContainerForm');

const replaceModalElement =
  $('incidentReplaceContainerModal');

const replaceModal =
  replaceModalElement
    ? bootstrap.Modal
      .getOrCreateInstance(
        replaceModalElement
      )
    : null;

function esc(value) {
  return String(
    value ?? ''
  ).replace(
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
  const id =
    Number(value);

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


function formatDate(value) {
  if (!value) {
    return 'Pendiente';
  }

  const date =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  return date
    ? `${date[3]}/${date[2]}/${date[1]}`
    : String(value);
}


function normalized(value) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


function responseError(
  data,
  statusCode
) {
  const errors =
    data?.errors &&
      typeof data.errors === 'object'
      ? Object.values(
        data.errors
      )
        .flat()
        .filter(
          error =>
            typeof error ===
            'string'
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
    'No se pudo completar ' +
    'la solicitud ' +
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
    Accept:
      'application/json'
  };

  const token =
    localStorage.getItem(
      'access_token'
    );

  if (token) {
    headers['Authorization'] =
      `Bearer ${token}`;
  }

  if (
    body !== undefined
  ) {
    headers[
      'Content-Type'
    ] =
      'application/json';
  }

  let response;

  try {
    response =
      await fetch(
        url,
        {
          method,
          headers,

          ...(
            body !== undefined
              ? {
                body:
                  JSON.stringify(
                    body
                  )
              }
              : {}
          )
        }
      );

  } catch {
    throw new Error(
      'No se pudo conectar con Laravel.'
    );
  }

  let data;

  try {
    data =
      await response.json();

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

function currentResourceType() {
  return state.tab ===
    'camiones'
    ? 'camion'
    : 'contenedor';
}


function incidentsForCurrentTab() {
  let rows =
    [...incidencias];

  if (
    state.tab ===
    'contenedores'
  ) {
    rows =
      rows.filter(
        item => {
          const tipo =
            normalized(
              item.tipo
            );

          return (
            tipo === 'rotura' ||
            tipo === 'incendio'
          );
        }
      );
  }

  return rows;
}


function filteredIncidents() {
  const rows =
    incidentsForCurrentTab();


  if (
    state.resolucion ===
    'activas'
  ) {
    return rows.filter(
      item =>
        item.estado !==
        'Resuelta'
    );
  }

  if (
    state.resolucion ===
    'historial'
  ) {
    return rows.filter(
      item =>
        item.estado ===
        'Resuelta'
    );
  }

  return rows;
}

function summary() {
  const rows =
    incidentsForCurrentTab();

  return {
    abiertas:
      rows.filter(
        item =>
          item.estado ===
          'Abierta'
      ).length,

    curso:
      rows.filter(
        item =>
          item.estado ===
          'En curso'
      ).length,

    resueltas:
      rows.filter(
        item =>
          item.estado ===
          'Resuelta'
      ).length
  };
}


function renderSummary() {
  const counts =
    summary();

  document
    .querySelector(
      '[data-incident-summary]'
    )
    ?.remove();

  const panel =
    document.querySelector(
      '.incident-page .incident-toolbar'
    ) ||
    document.querySelector(
      '.incident-page .personnel-tabs'
    );

  if (!panel) {
    return;
  }

  panel.insertAdjacentHTML(
    'afterend',
    `
      <div
        class="incident-summary"
        data-incident-summary
      >

        <div>
          <span>
            Abiertas
          </span>

          <strong>
            ${counts.abiertas}
          </strong>
        </div>

        <div>
          <span>
            En curso
          </span>

          <strong>
            ${counts.curso}
          </strong>
        </div>

        <div>
          <span>
            Resueltas
          </span>

          <strong>
            ${counts.resueltas}
          </strong>
        </div>

      </div>
    `
  );
}

function responsableVisible(
  item
) {
  if (
    item.tipo_recurso ===
    'contenedor' &&
    item.id_cuadrilla
  ) {
    return (
      'Cuadrilla ' +
      item.id_cuadrilla
    );
  }

  return (
    item.responsable ||
    'Sin asignar'
  );
}

function render() {
  const rows =
    filteredIncidents();

  const historial =
    state.resolucion ===
    'historial';

  const incidentTitle =
    $('incidentTitle');

  if (incidentTitle) {
    if (historial) {
      incidentTitle.textContent =
        state.tab ===
          'camiones'
          ? 'Historial de incidencias de camiones'
          : 'Historial de incidencias de contenedores';

    } else {
      incidentTitle.textContent =
        state.tab ===
          'camiones'
          ? 'Incidencias de camiones'
          : 'Incidencias de contenedores';
    }
  }

  if (head) {
    head.innerHTML = `
      <tr>
        <th>Recurso</th>
        <th>Tipo</th>
        <th>Estado</th>
        <th>Fecha de reporte</th>
        <th>Fecha de resolución</th>
        <th>Responsable</th>
        <th>
          ${historial
        ? 'Detalle'
        : 'Administrar'
      }
        </th>
      </tr>
    `;
  }

  if (body) {
    body.innerHTML =
      rows.length
        ? rows.map(
          item => `
              <tr>

                <td>
                  <strong>
                    ${esc(
            item.recurso ||
            'Sin recurso'
          )}
                  </strong>
                </td>

                <td>
                  ${esc(
            item.tipo ||
            '—'
          )}
                </td>

                <td>
                  ${esc(
            item.estado ||
            '—'
          )}
                </td>

                <td>
                  ${esc(
            formatDate(
              item.fecha_reporte
            )
          )}
                </td>

                <td>
                  ${esc(
            formatDate(
              item.fecha_resolucion
            )
          )}
                </td>

                <td>
                  ${esc(
            responsableVisible(
              item
            )
          )}
                </td>

                <td>
                  <button
                    class="btn btn-outline btn-sm"
                    data-manage-incident="${item.id_incidencia}"
                    type="button"
                  >
                    <i
                      class="bi ${historial
              ? 'bi-eye'
              : 'bi-clipboard-check'
            }"
                      aria-hidden="true"
                    ></i>

                    ${historial
              ? 'Ver'
              : 'Administrar'
            }
                  </button>
                </td>

              </tr>
            `
        ).join('')

        : `
            <tr>
              <td
                colspan="7"
                class="text-center py-4"
              >
                ${historial
          ? 'No hay incidencias resueltas en el historial.'
          : 'No hay incidencias activas.'
        }
              </td>
            </tr>
          `;
  }

  renderSummary();
}

async function loadIncidents() {
  if (body) {
    body.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="text-center py-4"
        >
          Cargando incidencias…
        </td>
      </tr>
    `;
  }

  const tipoRecurso =
    currentResourceType();

  try {
    const result =
      await requestJson(
        `${API_GESTION}/api/incidencias?tipo_recurso=${encodeURIComponent(
          tipoRecurso
        )}`
      );

    incidencias =
      Array.isArray(
        result.data
      )
        ? result.data.map(
          item => ({
            ...item,

            id_incidencia:
              validId(
                item.id_incidencia
              )
          })
        )
        : [];

    render();

  } catch (error) {
    incidencias = [];

    if (body) {
      body.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="text-center py-4"
          >
            ${esc(
        error.message
      )}
          </td>
        </tr>
      `;
    }

    renderSummary();
  }
}

async function loadCrews() {
  const result =
    await requestJson(
      `${API_GESTION}/api/cuadrillas`
    );

  cuadrillas =
    Array.isArray(result)
      ? result

      : (
        Array.isArray(
          result?.data
        )
          ? result.data
          : []
      );
}

function fillIncidentCrew(
  selected = ''
) {
  const select =
    $('incidentCrew');

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Sin asignar
    </option>

    ${cuadrillas.map(
    cuadrilla => `
        <option
          value="${esc(
      cuadrilla.id_cuadrilla
    )}"
        >
          ${esc(
      cuadrilla.id_cuadrilla
    )}

          ${cuadrilla.responsable
        ? ` · ${esc(
          cuadrilla.responsable
        )}`
        : ''
      }
        </option>
      `
  ).join('')}
  `;

  select.value =
    selected || '';
}

async function loadContainerTypes() {
  const result =
    await requestJson(
      `${API_GESTION}/api/contenedores/catalogos`
    );

  containerTypes =
    Array.isArray(
      result?.data?.tipos
    )
      ? result.data.tipos
      : [];
}

function setManagementReadOnly(
  readOnly
) {
  [
    $('incidentState'),
    $('incidentResponsible'),
    $('incidentCrew'),
    $('incidentResolution')
  ].forEach(
    element => {
      if (element) {
        element.disabled =
          readOnly;
      }
    }
  );

  const submit =
    form?.querySelector(
      'button[type="submit"]'
    );

  if (submit) {
    submit.classList.toggle(
      'd-none',
      readOnly
    );
  }
}

async function openManagement(id) {
  const incidentId =
    validId(id);

  const item =
    incidencias.find(
      row =>
        row.id_incidencia ===
        incidentId
    );

  if (!item) {
    return;
  }

  const esContenedor =
    item.tipo_recurso ===
    'contenedor';

  const tipoIncidencia =
    normalized(
      item.tipo
    );

  const esRoturaOIncendio =
    tipoIncidencia ===
    'rotura' ||
    tipoIncidencia ===
    'incendio';

  const esHistorial =
    item.estado ===
    'Resuelta';

  incidentToReplace =
    null;

  $('incidentId').value =
    item.id_incidencia;

  $('incidentModalTitle')
    .textContent =
    `${item.recurso || 'Recurso'} · ${item.tipo ||
    'Incidencia'
    }`;

  $('incidentResourceText')
    .textContent =
    item.recurso || '—';

  $('incidentTypeText')
    .textContent =
    item.tipo || '—';

  $('incidentDateText')
    .textContent =
    formatDate(
      item.fecha_reporte
    );

  $('incidentCurrentState')
    .textContent =
    item.estado || '—';

  $('incidentDescriptionText')
    .textContent =
    item.descripcion || '—';

  $('incidentState').value =
    item.estado;

  $('incidentResolution')
    .value =
    item.resolucion || '';

  $('incidentResponsibleGroup')
    ?.classList.toggle(
      'd-none',
      esContenedor
    );

  $('incidentCrewGroup')
    ?.classList.toggle(
      'd-none',
      !esContenedor
    );

  if (esContenedor) {
    fillIncidentCrew(
      item.id_cuadrilla ||
      ''
    );

  } else {
    $('incidentResponsible')
      .value =
      item.responsable ||
      '';
  }

  setManagementReadOnly(
    esHistorial
  );

  $('replaceIncidentContainerBtn')
    ?.classList.add(
      'd-none'
    );

  if (
    esContenedor &&
    esRoturaOIncendio &&
    !esHistorial &&
    Number(item.id_contenedor) > 0
  ) {
    try {
      const result =
        await requestJson(
          `${API_GESTION}/api/contenedores/${item.id_contenedor}`
        );

      const container =
        result?.data;

      const estadoContenedor =
        normalized(
          container?.estado
        );

      const reemplazable =
        Boolean(
          container?.activo
        ) &&
        (
          estadoContenedor ===
          'roto' ||
          estadoContenedor ===
          'incendiado'
        );

      if (reemplazable) {
        incidentToReplace = {
          incidenciaId:
            item.id_incidencia,

          contenedorId:
            Number(
              item.id_contenedor
            ),

          codigo:
            container.codigo ||
            item.recurso ||
            '',

          modelo:
            container.modelo ||
            '',

          tipo:
            container.tipo ||
            '',

          capacidad:
            Number(
              container.capacidad ||
              0
            )
        };

        $('replaceIncidentContainerBtn')
          ?.classList.remove(
            'd-none'
          );
      }

    } catch (error) {
      console.warn(
        'No se pudo comprobar el contenedor:',
        error.message
      );
    }
  }

  modal?.show();
}

$('replaceIncidentContainerBtn')
  ?.addEventListener(
    'click',

    () => {
      if (
        !incidentToReplace ||
        !replaceForm ||
        !replaceModal
      ) {
        return;
      }

      replaceForm.reset();

      const originalCode =
        $('incidentReplaceOriginalCode');

      if (originalCode) {
        originalCode.textContent =
          incidentToReplace.codigo;
      }

      const typeSelect =
        replaceForm
          .elements['tipo'];

      if (typeSelect) {
        typeSelect.innerHTML =
          containerTypes.map(
            tipo => `
              <option
                value="${esc(
              tipo.tipo
            )}"
              >
                ${esc(
              tipo.tipo
            )}
              </option>
            `
          ).join('');

        typeSelect.value =
          incidentToReplace.tipo;
      }

      if (
        replaceForm
          .elements['modelo']
      ) {
        replaceForm
          .elements['modelo']
          .value =
          incidentToReplace.modelo;
      }

      if (
        replaceForm
          .elements['capacidad']
      ) {
        replaceForm
          .elements['capacidad']
          .value =
          incidentToReplace.capacidad;
      }

      const message =
        $('incidentReplaceMessage');

      if (message) {
        message.textContent = '';

        message.classList.add(
          'd-none'
        );
      }

      if (
        incidentModalElement &&
        incidentModalElement
          .classList
          .contains('show')
      ) {
        incidentModalElement
          .addEventListener(
            'hidden.bs.modal',

            () => {
              replaceModal.show();
            },

            {
              once: true
            }
          );

        modal.hide();

      } else {
        replaceModal.show();
      }
    }
  );

replaceForm
  ?.addEventListener(
    'submit',

    async event => {
      event.preventDefault();

      if (!incidentToReplace) {
        return;
      }

      const data =
        new FormData(
          replaceForm
        );

      const payload = {
        codigo:
          String(
            data.get('codigo') ||
            ''
          )
            .trim()
            .toUpperCase(),

        modelo:
          String(
            data.get('modelo') ||
            ''
          ).trim(),

        tipo:
          String(
            data.get('tipo') ||
            ''
          ).trim(),

        capacidad:
          Number(
            data.get(
              'capacidad'
            )
          )
      };

      const message =
        $('incidentReplaceMessage');

      const submit =
        replaceForm.querySelector(
          '[type="submit"]'
        );

      if (submit) {
        submit.disabled =
          true;
      }

      try {
        const incidenciaId =
          incidentToReplace
            .incidenciaId;

        await requestJson(
          `${API_GESTION}/api/contenedores/${incidentToReplace.contenedorId}/reemplazar`,
          {
            method:
              'POST',

            body:
              payload
          }
        );

        if (
          replaceModalElement
        ) {
          replaceModalElement
            .addEventListener(
              'hidden.bs.modal',

              async () => {
                incidentToReplace =
                  null;

                await loadIncidents();

                const sigueExistiendo =
                  incidencias.some(
                    item =>
                      item.id_incidencia ===
                      incidenciaId
                  );

                if (sigueExistiendo) {
                  await openManagement(
                    incidenciaId
                  );
                }
              },

              {
                once: true
              }
            );

          replaceModal.hide();

        } else {
          incidentToReplace =
            null;

          await loadIncidents();
        }

      } catch (error) {
        if (message) {
          message.textContent =
            error.message;

          message.classList.remove(
            'd-none'
          );
        }

      } finally {
        if (submit) {
          submit.disabled =
            false;
        }
      }
    }
  );

form?.addEventListener(
  'submit',

  async event => {
    event.preventDefault();

    if (incidentBusy) {
      return;
    }

    const id =
      validId(
        $('incidentId')
          .value
      );

    const item =
      incidencias.find(
        incidencia =>
          incidencia
            .id_incidencia ===
          id
      );

    if (!item) {
      return;
    }

    if (
      item.estado ===
      'Resuelta'
    ) {
      return;
    }

    const esContenedor =
      item.tipo_recurso ===
      'contenedor';

    const estado =
      $('incidentState')
        .value;

    const resolucion =
      $('incidentResolution')
        .value
        .trim();

    const payload = {
      estado,

      resolucion:
        resolucion ||
        null
    };

    if (esContenedor) {
      payload.responsable =
        null;

      payload.id_cuadrilla =
        $('incidentCrew')
          ?.value ||
        null;

    } else {
      payload.responsable =
        $('incidentResponsible')
          .value
          .trim() ||
        null;
    }

    try {
      incidentBusy =
        true;

      await requestJson(
        `${API_GESTION}/api/incidencias/${id}`,
        {
          method:
            'PUT',

          body:
            payload
        }
      );

      modal?.hide();
      await loadIncidents();

    } catch (error) {
      console.error(
        'Incidencias:',
        error.message
      );

      alert(
        error.message
      );

    } finally {
      incidentBusy =
        false;
    }
  }
);

resolutionFilter
  ?.addEventListener(
    'change',

    () => {
      state.resolucion =
        resolutionFilter
          .value;

      render();
    }
  );

document
  .querySelectorAll(
    '[data-incident-tab]'
  )
  .forEach(
    button =>
      button.addEventListener(
        'click',

        async () => {
          state.tab =
            button.dataset
              .incidentTab;

          document
            .querySelectorAll(
              '[data-incident-tab]'
            )
            .forEach(
              item => {
                item.classList
                  .toggle(
                    'btn-primary',
                    item === button
                  );

                item.classList
                  .toggle(
                    'btn-outline',
                    item !== button
                  );

                item.classList
                  .toggle(
                    'active',
                    item === button
                  );
              }
            );

          await loadIncidents();
        }
      )
  );

document.addEventListener(
  'click',

  event => {
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

    const button =
      target.closest(
        '[data-manage-incident]'
      );

    if (button) {
      void openManagement(
        button.dataset
          .manageIncident
      );
    }
  }
);

async function init() {
  if (
    resolutionFilter
  ) {
    resolutionFilter.value =
      state.resolucion;
  }

  try {
    await Promise.all([
      loadCrews(),
      loadContainerTypes()
    ]);

  } catch (error) {
    console.error(
      'Datos auxiliares:',
      error.message
    );
  }

  await loadIncidents();
}


void init();