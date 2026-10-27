const API_GESTION = 'http://127.0.0.1:8001';

const $ = id => document.getElementById(id);

let containers = [];
let resumenCircuitos = [];

let selectedId = null;
let editingId = null;
let listadoExpandido = false;
let circuitosExpandidos = false;

let catalogos = {
  rutas: [],
  tipos: [],
  estados: []
};

let filtrosCircuitos = {
  prioridad: '',
  municipio: '',
  circuito: ''
};

let filtrosContenedores = {
  prioridad: '',
  municipio: '',
  barrio: '',
  tipo: ''
};

const tableBody = $('containerTableBody');
const detailPanel = $('containerDetailPanel');
const historyPanel = $('containerHistoryPanel');
const historyBody = $('containerHistoryBody');
const circuitOverview = $('circuitOverview');
const dataGrid = $('containerDataGrid');
const photo = $('containerPhoto');
const map = $('containerMap');
const form = $('containerForm');

const containerModal =
  bootstrap.Modal.getOrCreateInstance(
    $('containerModal')
  );

const removeContainerModal =
  bootstrap.Modal.getOrCreateInstance(
    $('removeContainerModal')
  );

const historyModal =
  bootstrap.Modal.getOrCreateInstance(
    $('containerHistoryModal')
  );

const IMAGENES_RECICLAJE = [
  '../resources/contenedor1.png',
  '../resources/contenedor2.png'
];

const IMAGEN_GENERAL =
  '../resources/contenedor3.png';

const IMAGEN_MIXTO =
  '../resources/contenedor4.png';

const MAPA_CH =
  '../resources/mapa-contenedor1.png';

const MAPAS_B = [
  '../resources/mapa-contenedor2.png',
  '../resources/mapa-contenedor3.png',
  '../resources/mapa-contenedor4.png'
];

const formatDate = value => {
  if (!value) return '—';

  return String(value)
    .slice(0, 10)
    .split('-')
    .reverse()
    .join('/');
};

const label = value => {
  if (!value) return '—';

  const text = String(value);

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
};

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

const field = (name, value) => `
  <div class="truck-field">
    <span>${escapeHtml(name)}</span>
    <strong>${value || '—'}</strong>
  </div>
`;

async function requestGestion(
  url,
  options = {}
) {
  const method =
    (options.method || 'GET')
      .toUpperCase();

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (
    [
      'POST',
      'PUT',
      'DELETE'
    ].includes(method)
  ) {
    headers['Content-Type'] =
      'application/json';
  }

  const response = await fetch(
    `${API_GESTION}${url}`,
    {
      ...options,
      method,
      headers
    }
  );

  let result = {};

  try {
    result =
      await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    let message =
      result.message ||
      'No se pudo completar la operación.';

    if (result.errors) {
      const firstError =
        Object.values(
          result.errors
        )[0];

      if (
        Array.isArray(firstError) &&
        firstError.length
      ) {
        message =
          firstError[0];
      }
    }

    throw new Error(message);
  }

  return result;
}

function indiceVisual(
  valor,
  cantidad
) {
  if (!cantidad) return 0;

  return [
    ...String(valor || '')
  ].reduce(
    (total, caracter) =>
      total +
      caracter.charCodeAt(0),
    0
  ) % cantidad;
}

function obtenerImagen(item) {
  const tipo =
    String(
      item.tipo || ''
    ).toLowerCase();

  if (tipo === 'reciclaje') {
    return IMAGENES_RECICLAJE[
      indiceVisual(
        item.codigo,
        IMAGENES_RECICLAJE.length
      )
    ];
  }

  if (tipo === 'mixto') {
    return IMAGEN_MIXTO;
  }

  return IMAGEN_GENERAL;
}

function obtenerMapa(item) {
  const circuito =
    String(
      item.circuito || ''
    ).toUpperCase();

  if (
    circuito.startsWith('CH_')
  ) {
    return MAPA_CH;
  }

  if (
    circuito.startsWith('B_')
  ) {
    return MAPAS_B[
      indiceVisual(
        item.codigo,
        MAPAS_B.length
      )
    ];
  }

  return MAPAS_B[0];
}

function convertirContenedor(item) {
  const dias =
    Number(
      item.dias_sin_recoleccion ||
      0
    );

  return {
    id:
      Number(
        item.id_contenedor
      ),

    codigo:
      item.codigo || '',

    modelo:
      item.modelo || '',

    tipo:
      item.tipo || '',

    capacidad:
      Number(
        item.capacidad || 0
      ),

    estado:
      item.estado || '',

    diasSinRecoleccion:
      dias,

    nivelRecoleccion:
      item.nivel_recoleccion ||
      'verde',

    etiquetaRecoleccion:
      item.etiqueta_recoleccion ||
      `${dias} ${
        dias === 1
          ? 'día'
          : 'días'
      }`,

    calle:
      item.calle || '',

    esquina:
      item.esquina || '',

    esquina2:
      item.esquina_2 || '',

    municipio:
      item.municipio || '',

    barrio:
      item.barrio || '',

    descripcion:
      item.descripcion || '',

    latitud:
      item.latitud,

    longitud:
      item.longitud,

    circuito:
      item.circuito || '',

    ultimoRegistro:
      item.ultimo_registro
        ? String(
            item.ultimo_registro
          ).slice(0, 10)
        : '',

    imagen:
      obtenerImagen(item),

    mapa:
      obtenerMapa(item),

    historial: []
  };
}

async function cargarCatalogos() {
  const result =
    await requestGestion(
      '/api/contenedores/catalogos'
    );

  catalogos = {
    rutas:
      Array.isArray(
        result?.data?.rutas
      )
        ? result.data.rutas
        : [],

    tipos:
      Array.isArray(
        result?.data?.tipos
      )
        ? result.data.tipos
        : [],

    estados:
      Array.isArray(
        result?.data?.estados
      )
        ? result.data.estados
        : []
  };
}

async function cargarContenedores() {
  const result =
    await requestGestion(
      '/api/contenedores'
    );

  containers =
    Array.isArray(
      result?.data
    )
      ? result.data.map(
          convertirContenedor
        )
      : [];

  if (
    selectedId !== null &&
    !containers.some(
      item =>
        item.id ===
        selectedId
    )
  ) {
    selectedId = null;
  }

  renderTable();
}

async function cargarResumenCircuitos() {
  const parametros =
    new URLSearchParams();

  Object.entries(
    filtrosCircuitos
  ).forEach(
    ([clave, valor]) => {
      if (valor) {
        parametros.set(
          clave,
          valor
        );
      }
    }
  );

  const consulta =
    parametros.toString();

  const result =
    await requestGestion(
      `/api/contenedores/resumen-circuitos${
        consulta
          ? `?${consulta}`
          : ''
      }`
    );

  resumenCircuitos =
    Array.isArray(
      result?.data
    )
      ? result.data
      : [];

  renderCircuitOverview();
}

async function cargarHistorial(
  container
) {
  const result =
    await requestGestion(
      `/api/contenedores/${container.id}/historial`
    );

  container.historial =
    Array.isArray(
      result?.data
    )
      ? result.data
      : [];
}

function collectionBadge(item) {
  return `
    <span
      class="collection-age collection-${escapeHtml(
        item.nivelRecoleccion
      )}"
    >
      <span
        class="collection-dot"
        aria-hidden="true"
      ></span>

      ${escapeHtml(
        item.etiquetaRecoleccion
      )}
    </span>
  `;
}

function collectionDetailLabel(item) {
  return `
    <span
      class="collection-detail collection-${escapeHtml(
        item.nivelRecoleccion
      )}"
    >
      ${escapeHtml(
        item.etiquetaRecoleccion
      )}
    </span>
  `;
}

function renderCircuitOverview() {
  if (!circuitOverview) return;

  if (!resumenCircuitos.length) {
    circuitOverview.innerHTML =
      '<div class="text-center py-4 text-muted-custom">No hay circuitos que coincidan con los filtros.</div>';

    $('toggleCircuitOverviewBtn')
      ?.classList
      .add('d-none');

    return;
  }

  circuitOverview.innerHTML =
    resumenCircuitos
      .map(
        item => `
          <article
            class="circuit-overview-card circuit-${escapeHtml(
              item.nivel
            )}"
          >
            <div>
              <span>
                Municipio
                ${escapeHtml(
                  item.municipio ||
                  '—'
                )}
              </span>

              <strong>
                ${escapeHtml(
                  item.circuito
                )}
              </strong>
            </div>

            <span
              class="circuit-status-dot"
              aria-hidden="true"
            ></span>

            <div class="circuit-counts">
              <span>
                ${Number(
                  item.counts
                    ?.verde || 0
                )}
                verdes
              </span>

              <span>
                ${Number(
                  item.counts
                    ?.amarillo || 0
                )}
                amarillos
              </span>

              <span>
                ${Number(
                  item.counts
                    ?.rojo || 0
                )}
                rojos
              </span>
            </div>
          </article>
        `
      )
      .join('');

  aplicarLimiteFilasCircuitos();
}

function actualizarCircuitosFiltroEstado() {
  const select =
    $('circuitCircuitFilter');

  if (!select) return;

  const rutas =
    catalogos.rutas.filter(
      ruta =>
        !filtrosCircuitos.municipio ||
        ruta.municipio ===
          filtrosCircuitos.municipio
    );

  if (
    filtrosCircuitos.circuito &&
    !rutas.some(
      ruta =>
        ruta.circuito ===
        filtrosCircuitos.circuito
    )
  ) {
    filtrosCircuitos.circuito =
      '';
  }

  select.innerHTML = `
    <option value="">
      Todos los circuitos
    </option>

    ${rutas
      .map(
        ruta => `
          <option
            value="${escapeHtml(
              ruta.circuito
            )}"
          >
            ${escapeHtml(
              ruta.circuito
            )}
          </option>
        `
      )
      .join('')}
  `;

  select.value =
    filtrosCircuitos.circuito;
}

function prepararFiltrosCircuitos() {
  if (
    !circuitOverview ||
    $('circuitFilters')
  ) {
    return;
  }

  const municipios = [
    ...new Set(
      catalogos.rutas
        .map(
          ruta =>
            ruta.municipio
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      String(a)
        .localeCompare(
          String(b)
        )
  );

  const filtros =
    document.createElement(
      'div'
    );

  filtros.id =
    'circuitFilters';

  filtros.className =
    'd-flex flex-wrap gap-2 mb-3';

  filtros.innerHTML = `
    <select
      id="circuitPriorityFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar circuitos por prioridad"
    >
      <option value="">
        Todas las prioridades
      </option>

      <option value="rojo">
        Alta
      </option>

      <option value="amarillo">
        Media
      </option>

      <option value="verde">
        Baja
      </option>
    </select>

    <select
      id="circuitMunicipalityFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar circuitos por municipio"
    >
      <option value="">
        Todos los municipios
      </option>

      ${municipios
        .map(
          municipio => `
            <option
              value="${escapeHtml(
                municipio
              )}"
            >
              Municipio ${escapeHtml(
                municipio
              )}
            </option>
          `
        )
        .join('')}
    </select>

    <select
      id="circuitCircuitFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar por circuito"
    >
      <option value="">
        Todos los circuitos
      </option>
    </select>
  `;

  circuitOverview.parentNode
    ?.insertBefore(
      filtros,
      circuitOverview
    );

  actualizarCircuitosFiltroEstado();

  $('circuitPriorityFilter')
    ?.addEventListener(
      'change',
      async event => {
        filtrosCircuitos.prioridad =
          event.target.value;

        circuitosExpandidos =
          false;

        await cargarResumenCircuitos();
      }
    );

  $('circuitMunicipalityFilter')
    ?.addEventListener(
      'change',
      async event => {
        filtrosCircuitos.municipio =
          event.target.value;

        filtrosCircuitos.circuito =
          '';

        actualizarCircuitosFiltroEstado();

        circuitosExpandidos =
          false;

        await cargarResumenCircuitos();
      }
    );

  $('circuitCircuitFilter')
    ?.addEventListener(
      'change',
      async event => {
        filtrosCircuitos.circuito =
          event.target.value;

        circuitosExpandidos =
          false;

        await cargarResumenCircuitos();
      }
    );
}

function prepararBotonExpansionCircuitos() {
  if (
    !circuitOverview ||
    $('toggleCircuitOverviewBtn')
  ) {
    return;
  }

  const contenedor =
    document.createElement(
      'div'
    );

  contenedor.className =
    'd-flex justify-content-center mt-2';

  const button =
    document.createElement(
      'button'
    );

  button.id =
    'toggleCircuitOverviewBtn';

  button.type =
    'button';

  button.className =
    'container-toggle-btn';

  button.setAttribute(
    'aria-label',
    'Mostrar todos los circuitos'
  );

  button.innerHTML =
    '<i class="bi bi-chevron-down"></i>';

  button.addEventListener(
    'click',
    () => {
      circuitosExpandidos =
        !circuitosExpandidos;

      aplicarLimiteFilasCircuitos();
    }
  );

  contenedor.appendChild(
    button
  );

  circuitOverview
    .insertAdjacentElement(
      'afterend',
      contenedor
    );
}

function aplicarLimiteFilasCircuitos() {
  if (!circuitOverview) return;

  const cards = [
    ...circuitOverview
      .querySelectorAll(
        '.circuit-overview-card'
      )
  ];

  const button =
    $('toggleCircuitOverviewBtn');

  if (!cards.length) {
    button
      ?.classList
      .add('d-none');

    return;
  }

  cards.forEach(
    card =>
      card.classList
        .remove('d-none')
  );

  const posiciones =
    cards.map(
      card =>
        card.offsetTop
    );

  const filas = [];

  posiciones.forEach(
    posicion => {
      if (
        !filas.some(
          fila =>
            Math.abs(
              fila -
              posicion
            ) <= 2
        )
      ) {
        filas.push(
          posicion
        );
      }
    }
  );

  const necesitaExpansion =
    filas.length > 2;

  button
    ?.classList
    .toggle(
      'd-none',
      !necesitaExpansion
    );

  if (
    !circuitosExpandidos &&
    necesitaExpansion
  ) {
    const filasVisibles =
      filas.slice(
        0,
        2
      );

    cards.forEach(
      (card, index) => {
        const visible =
          filasVisibles.some(
            fila =>
              Math.abs(
                fila -
                posiciones[index]
              ) <= 2
          );

        card.classList.toggle(
          'd-none',
          !visible
        );
      }
    );
  }

  if (!button) return;

  button.innerHTML =
    circuitosExpandidos
      ? '<i class="bi bi-chevron-up"></i>'
      : '<i class="bi bi-chevron-down"></i>';

  button.setAttribute(
    'aria-label',
    circuitosExpandidos
      ? 'Mostrar solo las primeras dos filas de circuitos'
      : 'Mostrar todos los circuitos'
  );
}

function filtrarContenedores() {
  return containers.filter(item => {
    const prioridad =
      !filtrosContenedores.prioridad ||
      item.nivelRecoleccion === filtrosContenedores.prioridad;

    const municipio =
      !filtrosContenedores.municipio ||
      item.municipio === filtrosContenedores.municipio;

    const barrio =
      !filtrosContenedores.barrio ||
      item.barrio === filtrosContenedores.barrio;

    const tipo =
      !filtrosContenedores.tipo ||
      item.tipo === filtrosContenedores.tipo;

    return prioridad && municipio && barrio && tipo;
  });
}

function renderTable() {
  if (!tableBody) return;

  const filtrados =
    filtrarContenedores();

  actualizarBotonExpansion(
    filtrados.length
  );

  if (!filtrados.length) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="text-center py-4 text-muted-custom"
        >
          No hay contenedores que coincidan con los filtros.
        </td>
      </tr>
    `;

    return;
  }

  const visibles =
    listadoExpandido
      ? filtrados
      : filtrados.slice(
          0,
          4
        );

  tableBody.innerHTML =
    visibles
      .map(
        item => `
          <tr
            class="${
              item.id ===
              selectedId
                ? 'active'
                : ''
            }"
          >
            <td>
              <strong>
                ${escapeHtml(
                  item.codigo
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                item.municipio
              )}
            </td>

            <td>
              ${escapeHtml(
                item.barrio
              )}
            </td>

            <td>
              ${escapeHtml(
                item.calle
              )}
            </td>

            <td>
              ${escapeHtml(
                label(
                  item.tipo
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                label(
                  item.estado
                )
              )}
            </td>

            <td>
              ${collectionBadge(
                item
              )}
            </td>

            <td>
              ${formatDate(
                item.ultimoRegistro
              )}
            </td>

            <td>
              <button
                class="btn btn-outline btn-sm"
                type="button"
                data-open-container="${item.id}"
                aria-label="Ver ${escapeHtml(
                  item.codigo
                )}"
              >
                <i class="bi bi-search"></i>
              </button>
            </td>
          </tr>
        `
      )
      .join('');
}

function prepararFiltrosContenedores() {
  if (
    !tableBody ||
    $('containerFilters')
  ) {
    return;
  }

  const table =
    tableBody.closest(
      'table'
    );

  if (!table) return;

  const wrapper =
    table.closest(
      '.table-responsive'
    ) || table;

  const municipios = [
    ...new Set(
      catalogos.rutas
        .map(
          ruta =>
            ruta.municipio
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      String(a)
        .localeCompare(
          String(b)
        )
  );

  const barrios = [
  ...new Set(
    containers
      .map(item => item.barrio)
      .filter(Boolean)
  )
  ].sort((a, b) => a.localeCompare(b, 'es'));

  const filtros =
    document.createElement(
      'div'
    );

  filtros.id =
    'containerFilters';

  filtros.className =
    'd-flex flex-wrap gap-2 mb-3';

    filtros.innerHTML = `
    <select
      id="containerPriorityFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar por prioridad"
    >
      <option value="">
        Todas las prioridades
      </option>

      <option value="rojo">
        Alta
      </option>

      <option value="amarillo">
        Media
      </option>

      <option value="verde">
        Baja
      </option>
    </select>

    <select
      id="containerMunicipalityFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar por municipio"
    >
      <option value="">
        Todos los municipios
      </option>

      ${municipios
        .map(
          municipio => `
            <option
              value="${escapeHtml(
                municipio
              )}"
            >
              Municipio ${escapeHtml(
                municipio
              )}
            </option>
          `
        )
        .join('')}
    </select>

    <select
      id="containerNeighborhoodFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar por barrio"
    >
      <option value="">
        Todos los barrios
      </option>

      ${barrios
        .map(
          barrio => `
            <option
              value="${escapeHtml(
                barrio
              )}"
            >
              ${escapeHtml(
                barrio
              )}
            </option>
          `
        )
        .join('')}
    </select>

    <select
      id="containerTypeFilter"
      class="form-select form-select-sm w-auto"
      aria-label="Filtrar por tipo"
    >
      <option value="">
        Todos los tipos
      </option>

      ${catalogos.tipos
        .map(
          item => `
            <option
              value="${escapeHtml(
                item.tipo
              )}"
            >
              ${escapeHtml(
                label(
                  item.tipo
                )
              )}
            </option>
          `
        )
        .join('')}
    </select>
  `;

  wrapper.parentNode
    .insertBefore(
      filtros,
      wrapper
    );

  $('containerPriorityFilter')
    ?.addEventListener(
      'change',
      event => {
        filtrosContenedores.prioridad =
          event.target.value;

        listadoExpandido =
          false;

        renderTable();
      }
    );

  $('containerMunicipalityFilter')
    ?.addEventListener(
      'change',
      event => {
        filtrosContenedores.municipio =
          event.target.value;

        listadoExpandido =
          false;

        renderTable();
      }
    );

  $('containerNeighborhoodFilter')
    ?.addEventListener(
      'change',
      event => {
        filtrosContenedores.barrio =
          event.target.value;

        listadoExpandido =
          false;

        renderTable();
      }
    );

  $('containerTypeFilter')
    ?.addEventListener(
      'change',
      event => {
        filtrosContenedores.tipo =
          event.target.value;

        listadoExpandido =
          false;

        renderTable();
      }
    );
}

function prepararBotonExpansion() {
  if (
    !tableBody ||
    $('toggleContainerListBtn')
  ) {
    return;
  }

  const table =
    tableBody.closest(
      'table'
    );

  const detailHeader =
    table?.querySelector(
      'thead th:last-child'
    );

  if (!detailHeader) return;

  const button =
    document.createElement(
      'button'
    );

  button.id =
    'toggleContainerListBtn';

  button.type =
    'button';

  button.className =
    'container-toggle-btn ms-2';

  button.setAttribute(
    'aria-label',
    'Mostrar todos los contenedores'
  );

  button.innerHTML =
    '<i class="bi bi-chevron-down"></i>';

  button.addEventListener(
    'click',
    () => {
      listadoExpandido =
        !listadoExpandido;

      renderTable();
    }
  );

  detailHeader.appendChild(
    button
  );
}

function actualizarBotonExpansion(
  cantidad
) {
  const button =
    $('toggleContainerListBtn');

  if (!button) return;

  button.classList.toggle(
    'd-none',
    cantidad <= 4
  );

  button.innerHTML =
    listadoExpandido
      ? '<i class="bi bi-chevron-up"></i>'
      : '<i class="bi bi-chevron-down"></i>';

  button.setAttribute(
    'aria-label',
    listadoExpandido
      ? 'Mostrar solo los primeros cuatro contenedores'
      : 'Mostrar todos los contenedores'
  );
}

function renderHistory(container) {
  if (!historyBody) return;

  historyBody.innerHTML =
    container.historial.length
      ? container.historial
          .map(
            (
              entry,
              index
            ) => `
              <tr>
                <td>
                  ${formatDate(
                    entry.fecha
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    entry.tipo
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    entry.detalle
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    entry.estado
                  )}
                </td>

                <td>
                  <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    data-history-entry="${index}"
                    aria-label="Ver registro"
                  >
                    <i class="bi bi-search"></i>
                  </button>
                </td>
              </tr>
            `
          )
          .join('')
      : `
          <tr>
            <td
              colspan="5"
              class="text-center py-4"
            >
              No hay registros en el historial.
            </td>
          </tr>
        `;
}

async function showContainer(id) {
  const item =
    containers.find(
      container =>
        container.id ===
        Number(id)
    );

  if (!item) return;

  selectedId =
    item.id;

  await cargarHistorial(
    item
  );

  renderTable();

  detailPanel
    ?.classList
    .remove('d-none');

  historyPanel
    ?.classList
    .remove('d-none');

  if ($('containerTitle')) {
    $('containerTitle')
      .textContent =
      item.codigo;
  }

  if ($('containerStatus')) {
    $('containerStatus')
      .textContent =
      label(
        item.estado
      );
  }

  if (dataGrid) {
    dataGrid.innerHTML = [
      field(
        'Último registro',
        formatDate(
          item.ultimoRegistro
        )
      ),

      field(
        'Calle',
        escapeHtml(
          item.calle
        )
      ),

      field(
        'Esquina',
        escapeHtml(
          item.esquina
        )
      ),

      field(
        'Tipo',
        escapeHtml(
          label(
            item.tipo
          )
        )
      ),

      field(
        'Municipio',
        escapeHtml(
          item.municipio
        )
      ),

      field(
        'Circuito',
        escapeHtml(
          item.circuito
        )
      ),

      field(
        'Barrio',
        escapeHtml(
          item.barrio
        )
      ),

      field(
        'Estado',
        escapeHtml(
          label(
            item.estado
          )
        )
      ),

      `
        <div class="truck-field">
          <span>
            Sin recolectar
          </span>

          <strong>
            ${collectionDetailLabel(
              item
            )}
          </strong>
        </div>
      `,

      field(
        'Capacidad',
        `${escapeHtml(
          item.capacidad
        )} m³`
      )
    ].join('');
  }

  if (photo) {
    photo.src =
      item.imagen;

    photo.alt =
      `Contenedor ${item.codigo}`;
  }

  if (map) {
    map.src =
      item.mapa;

    map.alt =
      `Ubicación de ${item.codigo}`;
  }

  renderHistory(
    item
  );
}

function cargarSelect(
  select,
  opciones,
  valorActual,
  placeholder
) {
  if (
    !select ||
    select.tagName.toLowerCase() !==
      'select'
  ) {
    return;
  }

  select.innerHTML = `
    <option value="">
      ${escapeHtml(
        placeholder
      )}
    </option>

    ${opciones.join('')}
  `;

  select.value =
    valorActual || '';
}

function municipiosCatalogo() {
  return [
    ...new Set(
      catalogos.rutas
        .map(
          ruta =>
            String(
              ruta.municipio || ''
            )
              .trim()
              .toUpperCase()
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        'es'
      )
  );
}

function actualizarCircuitosFormulario(
  seleccionado = ''
) {
  if (!form) return;

  const municipio =
    form.elements['municipio'];

  const circuito =
    form.elements['circuito'];

  if (
    !municipio ||
    !circuito
  ) {
    return;
  }

  const municipioActual =
    String(
      municipio.value || ''
    )
      .trim()
      .toUpperCase();

  const rutas =
    catalogos.rutas.filter(
      ruta =>
        String(
          ruta.municipio || ''
        )
          .trim()
          .toUpperCase() ===
        municipioActual
    );

  cargarSelect(
    circuito,

    rutas.map(
      ruta => `
        <option
          value="${escapeHtml(
            ruta.circuito
          )}"
        >
          ${escapeHtml(
            ruta.circuito
          )}
        </option>
      `
    ),

    seleccionado,

    municipioActual
      ? 'Seleccionar circuito'
      : 'Seleccionar municipio primero'
  );

  circuito.disabled =
    !municipioActual;
}

function prepararCatalogosForm(
  municipioSeleccionado = '',
  circuitoSeleccionado = ''
) {
  if (!form) return;

  cargarSelect(
    form.elements['tipo'],

    catalogos.tipos.map(
      item => `
        <option
          value="${escapeHtml(
            item.tipo
          )}"
        >
          ${escapeHtml(
            label(
              item.tipo
            )
          )}
        </option>
      `
    ),

    form.elements['tipo']
      ?.value,

    'Seleccionar tipo'
  );

  cargarSelect(
    form.elements['municipio'],

    municipiosCatalogo().map(
      municipio => `
        <option
          value="${escapeHtml(
            municipio
          )}"
        >
          Municipio ${escapeHtml(
            municipio
          )}
        </option>
      `
    ),

    municipioSeleccionado,

    'Seleccionar municipio'
  );

  cargarSelect(
    form.elements['estado'],

    catalogos.estados.map(
      estado => `
        <option
          value="${escapeHtml(
            estado
          )}"
        >
          ${escapeHtml(
            label(
              estado
            )
          )}
        </option>
      `
    ),

    form.elements['estado']
      ?.value,

    'Seleccionar estado'
  );

  actualizarCircuitosFormulario(
    circuitoSeleccionado
  );
}

function mostrarMensajeFormulario(
  mensaje = ''
) {
  const element =
    $('containerFormMessage');

  if (!element) return;

  element.textContent =
    mensaje;

  element.classList.toggle(
    'd-none',
    !mensaje
  );
}

function fillForm(item = null) {
  editingId =
    item?.id ?? null;

  if ($('containerModalTitle')) {
    $('containerModalTitle')
      .textContent =
      item
        ? 'Editar contenedor'
        : 'Agregar contenedor';
  }

  form?.reset();

  prepararCatalogosForm(
    item?.municipio || '',
    item?.circuito || ''
  );

  mostrarMensajeFormulario();

  if (
    !item ||
    !form
  ) {
    return;
  }

  const values = {
    codigo:
      item.codigo,

    modelo:
      item.modelo,

    tipo:
      item.tipo,

    estado:
      item.estado,

    capacidad:
      item.capacidad,

    barrio:
      item.barrio,

    calle:
      item.calle,

    esquina:
      item.esquina,

    esquina_2:
      item.esquina2,

    dias_sin_recoleccion:
      item.diasSinRecoleccion,

    ultimo_registro:
      item.ultimoRegistro,

    descripcion:
      item.descripcion,

    latitud:
      item.latitud,

    longitud:
      item.longitud
  };

  Object.entries(values)
    .forEach(
      ([name, value]) => {
        if (
          form.elements[name]
        ) {
          form.elements[name]
            .value =
            value ?? '';
        }
      }
    );
}

function obtenerPayloadFormulario() {
  const data =
    Object.fromEntries(
      new FormData(form)
    );

  const payload = {
    codigo:
      String(
        data.codigo || ''
      )
        .trim()
        .toUpperCase(),

    modelo:
      String(
        data.modelo || ''
      ).trim(),

    tipo:
      String(
        data.tipo || ''
      ).trim(),

    capacidad:
      Number(
        data.capacidad
      ),

    estado:
      String(
        data.estado || ''
      ).trim(),

    calle:
      String(
        data.calle || ''
      ).trim(),

    esquina:
      String(
        data.esquina || ''
      ).trim(),

    municipio:
      String(
        data.municipio || ''
      )
        .trim()
        .toUpperCase(),

    barrio:
      String(
        data.barrio || ''
      ).trim(),

    circuito:
      String(
        data.circuito || ''
      )
        .trim()
        .toUpperCase(),

    ultimo_registro:
      data.ultimo_registro ||
      null
  };

  if (
    String(
      data.dias_sin_recoleccion ??
      ''
    ).trim()
  ) {
    payload.dias_sin_recoleccion =
      Number(
        data.dias_sin_recoleccion
      );
  }

  if (
    data.esquina_2 !==
    undefined
  ) {
    payload.esquina_2 =
      String(
        data.esquina_2 ||
        ''
      ).trim();
  }

  if (
    data.descripcion !==
    undefined
  ) {
    payload.descripcion =
      String(
        data.descripcion ||
        ''
      ).trim();
  }

  if (
    String(
      data.latitud ?? ''
    ).trim()
  ) {
    payload.latitud =
      Number(
        data.latitud
      );
  }

  if (
    String(
      data.longitud ?? ''
    ).trim()
  ) {
    payload.longitud =
      Number(
        data.longitud
      );
  }

  return payload;
}

async function recargarDatos() {
  await Promise.all([
    cargarContenedores(),
    cargarResumenCircuitos()
  ]);
}

$('addContainerBtn')
  ?.addEventListener(
    'click',
    () => {
      fillForm();

      containerModal.show();
    }
  );

$('editContainerBtn')
  ?.addEventListener(
    'click',
    () => {
      const item =
        containers.find(
          container =>
            container.id ===
            selectedId
        );

      if (!item) return;

      fillForm(
        item
      );

      containerModal.show();
    }
  );

$('removeContainerBtn')
  ?.addEventListener(
    'click',
    () => {
      const item =
        containers.find(
          container =>
            container.id ===
            selectedId
        );

      if (!item) return;

      if (
        $('removeContainerText')
      ) {
        $('removeContainerText')
          .textContent =
          `¿Dar de baja ${item.codigo}?`;
      }

      removeContainerModal
        .show();
    }
  );

form
  ?.elements
  ?.['municipio']
  ?.addEventListener(
    'change',
    () => {
      actualizarCircuitosFormulario();
    }
  );

form?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    const payload =
      obtenerPayloadFormulario();

    const duplicate =
      containers.some(
        item =>
          item.codigo
            .toUpperCase() ===
            payload.codigo
              .toUpperCase() &&
          item.id !==
            editingId
      );

    if (duplicate) {
      mostrarMensajeFormulario(
        'Ya existe un contenedor con ese código.'
      );

      return;
    }

    try {
      const result =
        editingId
          ? await requestGestion(
              `/api/contenedores/${editingId}`,
              {
                method:
                  'PUT',

                body:
                  JSON.stringify(
                    payload
                  )
              }
            )
          : await requestGestion(
              '/api/contenedores',
              {
                method:
                  'POST',

                body:
                  JSON.stringify(
                    payload
                  )
              }
            );

      const id =
        Number(
          result?.data
            ?.id_contenedor ||
          editingId
        );

      mostrarMensajeFormulario();

      containerModal.hide();

      editingId =
        null;

      await recargarDatos();

      if (id) {
        await showContainer(
          id
        );
      }
    } catch (error) {
      mostrarMensajeFormulario(
        error.message
      );
    }
  }
);

$('confirmRemoveContainer')
  ?.addEventListener(
    'click',
    async () => {
      if (!selectedId) return;

      try {
        await requestGestion(
          `/api/contenedores/${selectedId}`,
          {
            method:
              'DELETE'
          }
        );

        selectedId =
          null;

        removeContainerModal
          .hide();

        detailPanel
          ?.classList
          .add(
            'd-none'
          );

        historyPanel
          ?.classList
          .add(
            'd-none'
          );

        await recargarDatos();
      } catch (error) {
        alert(
          error.message
        );
      }
    }
  );

document.addEventListener(
  'click',
  async event => {
    const open =
      event.target.closest(
        '[data-open-container]'
      );

    if (open) {
      try {
        await showContainer(
          open.dataset
            .openContainer
        );
      } catch (error) {
        alert(
          error.message
        );
      }

      return;
    }

    const historyButton =
      event.target.closest(
        '[data-history-entry]'
      );

    if (!historyButton) {
      return;
    }

    const container =
      containers.find(
        item =>
          item.id ===
          selectedId
      );

    const entry =
      container?.historial[
        Number(
          historyButton
            .dataset
            .historyEntry
        )
      ];

    if (!entry) return;

    if (
      $('containerHistoryModalTitle')
    ) {
      $('containerHistoryModalTitle')
        .textContent =
        `${entry.tipo} · ${formatDate(
          entry.fecha
        )}`;
    }

    if (
      $('containerHistoryCard')
    ) {
      $('containerHistoryCard')
        .innerHTML = `
          <div class="incident-card-head">
            <div>
              <span class="truck-kicker">
                ${escapeHtml(
                  container.codigo
                )}
              </span>

              <h3>
                ${escapeHtml(
                  entry.tipo
                )}
              </h3>
            </div>

            <span class="truck-status">
              ${escapeHtml(
                entry.estado
              )}
            </span>
          </div>

          <div class="incident-description">
            <span>
              Detalle
            </span>

            <p>
              ${escapeHtml(
                entry.detalle
              )}
            </p>
          </div>
        `;
    }

    historyModal.show();
  }
);

async function iniciarContenedores() {
  try {
    await cargarCatalogos();

    prepararCatalogosForm();
    prepararFiltrosCircuitos();
    prepararBotonExpansionCircuitos();
    prepararBotonExpansion();

    await recargarDatos();

    prepararFiltrosContenedores();

    renderTable();
  } catch (error) {
    console.error(error);

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="9"
            class="text-center py-4 text-muted-custom"
          >
            ${escapeHtml(
              error.message ||
              'No se pudieron cargar los contenedores.'
            )}
          </td>
        </tr>
      `;
    }
  }
}

iniciarContenedores();