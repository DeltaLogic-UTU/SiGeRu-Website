const API_GESTION = 'http://127.0.0.1:8001';

const $ = id => document.getElementById(id);

const TIPOS = ['Depósito', 'Centro de acopio', 'Vertedero'];
const TIPOS_RESIDUO = ['general', 'reciclaje'];
const ESTADOS = ['Operativo', 'No operativo'];
const CAPACIDADES = ['Disponible', 'Casi lleno', 'Lleno'];

const TIPOS_ITEM = [
  'Limpieza',
  'Seguridad',
  'Equipamiento',
  'Mantenimiento',
  'Insumo'
];

const ESTADOS_ITEM = [
  'Disponible',
  'Excelente',
  'Óptimo',
  'Carencia',
  'Fuera de servicio'
];

let facilities = [];
let inventory = [];
let workers = [];

let selectedId = null;
let currentTab = 'depositos';
let inventoryType = '';

let facilityBusy = false;
let itemBusy = false;
let workerBusy = false;

let itemFacilityId = null;
let workerFacilityId = null;
let editWorkerId = null;
let availableUsers = [];

let csrfToken = '';

const ui = {};
const modals = {};
const messageTimers = new WeakMap();

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

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error('El identificador no es válido.');
  }

  return id;
}

function message(element, text = '', type = 'danger') {
  if (!element) return;

  const previousTimer = messageTimers.get(element);

  if (previousTimer) {
    clearTimeout(previousTimer);
    messageTimers.delete(element);
  }

  if (!text) {
    element.textContent = '';
    element.className = 'd-none';
    element.removeAttribute('style');
    return;
  }

  const success = type === 'success';

  element.textContent = text;
  element.className = 'alert mb-3';

  element.style.background = success
    ? 'color-mix(in srgb, var(--primary) 12%, var(--panel))'
    : 'color-mix(in srgb, #fb7185 10%, var(--panel))';

  element.style.border = success
    ? '1px solid color-mix(in srgb, var(--primary) 35%, var(--line))'
    : '1px solid color-mix(in srgb, #fb7185 35%, var(--line))';

  element.style.color = success
    ? 'var(--secondary)'
    : '#fb7185';

  const timer = setTimeout(() => {
    element.textContent = '';
    element.className = 'd-none';
    element.removeAttribute('style');
    messageTimers.delete(element);
  }, success ? 3000 : 5000);

  messageTimers.set(element, timer);
}

function ensureMessage(id, parent) {
  let element = $(id);

  if (!element) {
    element = document.createElement('div');
    element.id = id;
    element.className = 'd-none';
    element.setAttribute('aria-live', 'polite');
    parent.prepend(element);
  }

  return element;
}

function setOptions(select, values, selected = '', emptyLabel = '') {
  select.innerHTML =
    (emptyLabel
      ? `<option value="">${escapeHtml(emptyLabel)}</option>`
      : '') +
    values.map(value => `
      <option value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </option>
    `).join('');

  select.value = selected;
}

function wasteTypeLabel(value) {
  if (value === 'general') return 'General';
  if (value === 'reciclaje') return 'Reciclaje';
  return 'Sin asignar';
}

function responseError(data, status) {
  const errors =
    data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors)
          .flat()
          .filter(error => typeof error === 'string')
      : [];

  if (errors.length) return errors.join('\n');
  if (data?.message) return data.message;
  if (status === 401) return 'Tu sesión finalizó.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 419) return 'La sesión expiró. Recarga la página.';

  return `No se pudo completar la solicitud (HTTP ${status}).`;
}

async function getCsrfToken(force = false) {
  if (force) csrfToken = '';
  if (csrfToken) return csrfToken;

  let response;

  try {
    response = await fetch(
      `${API_GESTION}/csrf-token`,
      {
        headers: {
          Accept: 'application/json'
        },
        credentials: 'include'
      }
    );
  } catch {
    throw new Error('No se pudo conectar con Laravel.');
  }

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error('No se pudo obtener el token CSRF.');
  }

  csrfToken = data.token;
  return csrfToken;
}

async function requestJson(
  url,
  { method = 'GET', body } = {},
  retry = true
) {
  const headers = {
    Accept: 'application/json'
  };

  if (method !== 'GET') {
    headers['X-CSRF-TOKEN'] = await getCsrfToken();
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;

  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {})
    });
  } catch {
    throw new Error('No se pudo conectar con Laravel.');
  }

  if (
    response.status === 419 &&
    method !== 'GET' &&
    retry
  ) {
    await getCsrfToken(true);

    return requestJson(
      url,
      { method, body },
      false
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

  if (!response.ok || data?.success === false) {
    throw new Error(
      responseError(data, response.status)
    );
  }

  return data;
}

function listData(result, idField) {
  if (!Array.isArray(result.data)) {
    throw new Error(
      'Laravel no devolvió una lista válida.'
    );
  }

  return result.data.map(item => ({
    ...item,
    [idField]: validId(item[idField])
  }));
}

function currentFacilities() {
  return facilities.filter(item =>
    currentTab === 'depositos'
      ? item.tipo === 'Depósito'
      : item.tipo !== 'Depósito'
  );
}

function selectedFacility() {
  return facilities.find(
    item => item.id_instalacion === selectedId
  );
}

function actionButton(attribute, id, icon, label) {
  return `
    <button
      type="button"
      class="btn btn-outline btn-sm"
      ${attribute}="${validId(id)}"
      title="${escapeHtml(label)}"
      aria-label="${escapeHtml(label)}"
    >
      <i class="bi bi-${icon}" aria-hidden="true"></i>
    </button>
  `;
}

function updateTabs() {
  document.querySelectorAll(
    '[data-facility-tab]'
  ).forEach(button => {
    const active =
      button.dataset.facilityTab === currentTab;

    button.classList.toggle('btn-primary', active);
    button.classList.toggle('btn-outline', !active);
    button.classList.toggle('active', active);
  });
}

function renderFacilities() {
  ui.facilityTitle.textContent =
    currentTab === 'depositos'
      ? 'Depósitos'
      : 'Instalaciones';

  const rows = currentFacilities();

  ui.facilityBody.innerHTML = rows.length
    ? rows.map(item => `
      <tr
        class="${
          selectedId === item.id_instalacion
            ? 'table-active'
            : ''
        }"
        data-facility-select="${item.id_instalacion}"
      >
        <td>
          <strong>${escapeHtml(item.nombre)}</strong>
        </td>

        <td>${escapeHtml(item.tipo)}</td>

        <td>
          ${escapeHtml(
            wasteTypeLabel(item.tipo_residuo)
          )}
        </td>

        <td>${escapeHtml(item.estado)}</td>
        <td>${escapeHtml(item.calle)}</td>

        <td>
          ${escapeHtml(item.esquina_1 || '—')}
        </td>

        <td>
          ${escapeHtml(item.esquina_2 || '—')}
        </td>

        <td>
          ${escapeHtml(item.capacidad_estado)}
        </td>

        <td>
          <div class="d-flex gap-2">
            ${actionButton(
              'data-facility-workers',
              item.id_instalacion,
              'people',
              'Ver operarios'
            )}

            ${actionButton(
              'data-facility-edit',
              item.id_instalacion,
              'pencil',
              'Editar instalación'
            )}

            ${actionButton(
              'data-facility-delete',
              item.id_instalacion,
              'trash',
              'Eliminar instalación'
            )}
          </div>
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="9" class="text-center py-4">
          No hay instalaciones registradas.
        </td>
      </tr>
    `;
}

async function loadFacilities() {
  message(ui.facilityStatus);

  ui.facilityBody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-4">
        Cargando instalaciones…
      </td>
    </tr>
  `;

  try {
    facilities = listData(
      await requestJson(
        `${API_GESTION}/api/instalaciones`
      ),
      'id_instalacion'
    );

    const visible = currentFacilities();

    if (
      !visible.some(
        item => item.id_instalacion === selectedId
      )
    ) {
      selectedId =
        visible[0]?.id_instalacion ?? null;
    }

    renderFacilities();
    await loadInventory();
  } catch (error) {
    message(
      ui.facilityStatus,
      error.message
    );

    ui.facilityBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          No se pudieron cargar las instalaciones.
        </td>
      </tr>
    `;
  }
}

function fillFacility(item = {}) {
  ui.facilityForm.reset();
  message(ui.facilityFormStatus);

  ui.facilityId.value =
    item.id_instalacion || '';

  ui.facilityName.value =
    item.nombre || '';

  ui.facilityType.value =
    item.tipo ||
    (
      currentTab === 'depositos'
        ? 'Depósito'
        : 'Centro de acopio'
    );

  ui.facilityWasteType.value =
    item.tipo_residuo || '';

  ui.facilityState.value =
    item.estado || 'Operativo';

  ui.facilityStreet.value =
    item.calle || '';

  ui.facilityCorner1.value =
    item.esquina_1 || '';

  ui.facilityCorner2.value =
    item.esquina_2 || '';

  ui.facilityCapacityStatus.value =
    item.capacidad_estado || 'Disponible';

  ui.facilityModalTitle.textContent =
    item.id_instalacion
      ? 'Editar instalación'
      : 'Nueva instalación';
}

async function saveFacility(event) {
  event.preventDefault();

  if (
    facilityBusy ||
    !ui.facilityForm.reportValidity()
  ) {
    return;
  }

  try {
    facilityBusy = true;

    const id =
      ui.facilityId.value
        ? validId(ui.facilityId.value)
        : null;

    const body = {
      nombre: ui.facilityName.value.trim(),
      tipo: ui.facilityType.value,
      tipo_residuo: ui.facilityWasteType.value,
      estado: ui.facilityState.value,
      calle: ui.facilityStreet.value.trim(),
      esquina_1:
        ui.facilityCorner1.value.trim() || null,
      esquina_2:
        ui.facilityCorner2.value.trim() || null,
      capacidad_estado:
        ui.facilityCapacityStatus.value
    };

    if (
      !body.nombre ||
      !TIPOS.includes(body.tipo) ||
      !TIPOS_RESIDUO.includes(body.tipo_residuo) ||
      !ESTADOS.includes(body.estado) ||
      !body.calle ||
      !CAPACIDADES.includes(body.capacidad_estado)
    ) {
      throw new Error(
        'Los datos de la instalación no son válidos.'
      );
    }

    const result = await requestJson(
      id
        ? `${API_GESTION}/api/instalaciones/${id}`
        : `${API_GESTION}/api/instalaciones`,
      {
        method: id ? 'PUT' : 'POST',
        body
      }
    );

    const saved = {
      ...result.data,
      id_instalacion:
        validId(result.data.id_instalacion)
    };

    facilities = facilities.filter(
      item =>
        item.id_instalacion !==
        saved.id_instalacion
    );

    facilities.push(saved);

    facilities.sort(
      (a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          'es'
        )
    );

    currentTab =
      saved.tipo === 'Depósito'
        ? 'depositos'
        : 'instalaciones';

    selectedId = saved.id_instalacion;

    updateTabs();
    renderFacilities();
    modals.facility.hide();

    message(
      ui.facilityStatus,
      result.message,
      'success'
    );

    await loadInventory();
  } catch (error) {
    message(
      ui.facilityFormStatus,
      error.message
    );
  } finally {
    facilityBusy = false;
  }
}

async function deleteFacility(id) {
  if (facilityBusy) return;

  id = validId(id);

  const item = facilities.find(
    facility =>
      facility.id_instalacion === id
  );

  if (
    !item ||
    !confirm(
      `¿Eliminar la instalación «${item.nombre}»?`
    )
  ) {
    return;
  }

  try {
    facilityBusy = true;

    const result = await requestJson(
      `${API_GESTION}/api/instalaciones/${id}`,
      {
        method: 'DELETE'
      }
    );

    facilities = facilities.filter(
      facility =>
        facility.id_instalacion !== id
    );

    if (selectedId === id) {
      selectedId =
        currentFacilities()[0]
          ?.id_instalacion ?? null;
    }

    renderFacilities();

    message(
      ui.facilityStatus,
      result.message,
      'success'
    );

    await loadInventory();
  } catch (error) {
    message(
      ui.facilityStatus,
      error.message
    );
  } finally {
    facilityBusy = false;
  }
}

function renderInventory() {
  const facility = selectedFacility();

  const isDeposit =
    facility?.tipo === 'Depósito';

  ui.inventoryPanel.classList.toggle(
    'd-none',
    !isDeposit
  );

  if (!isDeposit) return;

  ui.inventoryTitle.textContent =
    `Inventario ${facility.nombre}`;

  ui.inventoryBody.innerHTML =
    inventory.length
      ? inventory.map(item => `
        <tr>
          <td>
            <strong>
              ${escapeHtml(item.nombre_item)}
            </strong>
          </td>

          <td>${escapeHtml(item.estado)}</td>
          <td>${escapeHtml(item.tipo)}</td>
          <td>${escapeHtml(item.cantidad)}</td>

          <td>
            <div class="d-flex gap-2">
              ${actionButton(
                'data-item-edit',
                item.id_inventario,
                'pencil',
                'Editar artículo'
              )}

              ${actionButton(
                'data-item-delete',
                item.id_inventario,
                'trash',
                'Eliminar artículo'
              )}
            </div>
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="5" class="text-center py-4">
            ${
              inventoryType
                ? 'No hay artículos de este tipo.'
                : 'No hay artículos registrados.'
            }
          </td>
        </tr>
      `;
}

async function loadInventory() {
  const facility = selectedFacility();

  inventory = [];
  message(ui.inventoryStatus);

  if (facility?.tipo !== 'Depósito') {
    renderInventory();
    return;
  }

  ui.inventoryBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        Cargando inventario…
      </td>
    </tr>
  `;

  const query =
    inventoryType
      ? `?tipo=${encodeURIComponent(inventoryType)}`
      : '';

  try {
    inventory = listData(
      await requestJson(
        `${API_GESTION}/api/instalaciones/${facility.id_instalacion}/inventario${query}`
      ),
      'id_inventario'
    );

    renderInventory();
  } catch (error) {
    message(
      ui.inventoryStatus,
      error.message
    );

    inventory = [];
    renderInventory();
  }
}

function fillItem(item = {}) {
  const facility = selectedFacility();

  if (facility?.tipo !== 'Depósito') {
    return false;
  }

  itemFacilityId =
    facility.id_instalacion;

  ui.itemForm.reset();
  message(ui.itemFormStatus);

  ui.itemId.value =
    item.id_inventario || '';

  ui.itemName.value =
    item.nombre_item || '';

  ui.itemType.value =
    item.tipo ||
    inventoryType ||
    'Limpieza';

  ui.itemState.value =
    item.estado || 'Disponible';

  ui.itemQuantity.value =
    item.cantidad ?? '';

  ui.itemModalTitle.textContent =
    item.id_inventario
      ? 'Editar artículo'
      : 'Agregar artículo';

  return true;
}

async function saveItem(event) {
  event.preventDefault();

  if (
    itemBusy ||
    !ui.itemForm.reportValidity()
  ) {
    return;
  }

  try {
    itemBusy = true;

    const facilityId =
      validId(itemFacilityId);

    const id =
      ui.itemId.value
        ? validId(ui.itemId.value)
        : null;

    const cantidad =
      Number(ui.itemQuantity.value);

    const body = {
      nombre_item:
        ui.itemName.value.trim(),
      estado:
        ui.itemState.value,
      tipo:
        ui.itemType.value,
      cantidad
    };

    if (
      !body.nombre_item ||
      !ESTADOS_ITEM.includes(body.estado) ||
      !TIPOS_ITEM.includes(body.tipo) ||
      !Number.isSafeInteger(cantidad) ||
      cantidad < 0
    ) {
      throw new Error(
        'Los datos del artículo no son válidos.'
      );
    }

    const result = await requestJson(
      `${API_GESTION}/api/instalaciones/${facilityId}/inventario${id ? `/${id}` : ''}`,
      {
        method: id ? 'PUT' : 'POST',
        body
      }
    );

    modals.item.hide();

    message(
      ui.facilityStatus,
      result.message,
      'success'
    );

    await loadInventory();
  } catch (error) {
    message(
      ui.itemFormStatus,
      error.message
    );
  } finally {
    itemBusy = false;
  }
}

async function deleteItem(id) {
  if (itemBusy) return;

  id = validId(id);

  const facility = selectedFacility();

  const item = inventory.find(
    row => row.id_inventario === id
  );

  if (
    !facility ||
    !item ||
    !confirm(
      `¿Eliminar el artículo «${item.nombre_item}»?`
    )
  ) {
    return;
  }

  try {
    itemBusy = true;

    const result = await requestJson(
      `${API_GESTION}/api/instalaciones/${facility.id_instalacion}/inventario/${id}`,
      {
        method: 'DELETE'
      }
    );

    message(
      ui.facilityStatus,
      result.message,
      'success'
    );

    await loadInventory();
  } catch (error) {
    message(
      ui.facilityStatus,
      error.message
    );
  } finally {
    itemBusy = false;
  }
}

function workerName(worker) {
  return [
    worker.nombre,
    worker.apellido
  ]
    .filter(Boolean)
    .join(' ');
}

function assignmentDate(value) {
  const date =
    String(value || '').match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  return date
    ? `${date[3]}/${date[2]}/${date[1]}`
    : '—';
}

function renderWorkers() {
  ui.workersBody.innerHTML =
    workers.length
      ? workers.map(worker => `
        <tr>
          <td>${escapeHtml(workerName(worker))}</td>
          <td>${escapeHtml(worker.documento || '—')}</td>
          <td>${escapeHtml(worker.estado || '—')}</td>
          <td>${escapeHtml(worker.telefono || '—')}</td>
          <td>${escapeHtml(worker.email || '—')}</td>
          <td>${assignmentDate(worker.fecha_asignacion)}</td>

          <td>
            <div class="d-flex gap-2">
              ${actionButton(
                'data-worker-edit',
                worker.id_usuario,
                'pencil',
                'Cambiar operario'
              )}

              ${actionButton(
                'data-worker-remove',
                worker.id_usuario,
                'trash',
                'Quitar operario'
              )}
            </div>
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="7" class="text-center py-4">
            No hay operarios asignados.
          </td>
        </tr>
      `;
}

async function loadWorkers() {
  if (!workerFacilityId) return;

  message(ui.workersStatus);

  ui.workersBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-4">
        Cargando operarios…
      </td>
    </tr>
  `;

  try {
    workers = listData(
      await requestJson(
        `${API_GESTION}/api/instalaciones/${workerFacilityId}/operarios`
      ),
      'id_usuario'
    );

    renderWorkers();
  } catch (error) {
    workers = [];

    message(
      ui.workersStatus,
      error.message
    );

    renderWorkers();
  }
}

function cancelWorkerForm() {
  editWorkerId = null;
  availableUsers = [];

  ui.workerForm.reset();
  ui.workerForm.classList.add('d-none');

  message(ui.workerFormStatus);
}

async function openWorkers(id) {
  const facility = facilities.find(
    item => item.id_instalacion === id
  );

  if (!facility) return;

  workerFacilityId =
    facility.id_instalacion;

  cancelWorkerForm();
  message(ui.workersStatus);

  ui.workersTitle.textContent =
    `Operarios de ${facility.nombre}`;

  modals.workers.show();

  await loadWorkers();
}

async function openWorkerForm(id = null) {
  if (
    !workerFacilityId ||
    workerBusy
  ) {
    return;
  }

  const current =
    id
      ? workers.find(
          worker =>
            worker.id_usuario === id
        )
      : null;

  if (id && !current) return;

  editWorkerId = id;
  availableUsers = [];

  ui.workerForm.reset();
  ui.workerForm.classList.remove('d-none');

  ui.workerFormTitle.textContent =
    current
      ? `Cambiar asignación de ${workerName(current)}`
      : 'Asignar operario';

  setOptions(
    ui.workerSelect,
    [],
    '',
    'Cargando operarios…'
  );

  message(ui.workerFormStatus);

  try {
    const available = listData(
      await requestJson(
        `${API_GESTION}/api/instalaciones/${workerFacilityId}/operarios-disponibles`
      ),
      'id_usuario'
    );

    if (current) {
      available.push(current);
    }

    availableUsers = available;

    ui.workerSelect.innerHTML = `
      <option value="">
        Selecciona un operario
      </option>
    ` +
    availableUsers.map(worker => `
      <option value="${worker.id_usuario}">
        ${escapeHtml(workerName(worker))}
        ${
          worker.documento
            ? ` — ${escapeHtml(worker.documento)}`
            : ''
        }
      </option>
    `).join('');

    ui.workerSelect.value =
      id ? String(id) : '';
  } catch (error) {
    message(
      ui.workerFormStatus,
      error.message
    );
  }
}

async function saveWorker(event) {
  event.preventDefault();

  if (
    workerBusy ||
    !ui.workerForm.reportValidity()
  ) {
    return;
  }

  try {
    workerBusy = true;

    const facilityId =
      validId(workerFacilityId);

    const userId =
      validId(ui.workerSelect.value);

    if (
      !availableUsers.some(
        worker =>
          worker.id_usuario === userId
      )
    ) {
      throw new Error(
        'Selecciona un operario válido.'
      );
    }

    const result = await requestJson(
      `${API_GESTION}/api/instalaciones/${facilityId}/operarios${editWorkerId ? `/${validId(editWorkerId)}` : ''}`,
      {
        method:
          editWorkerId
            ? 'PUT'
            : 'POST',

        body: {
          id_usuario: userId
        }
      }
    );

    cancelWorkerForm();

    await loadWorkers();

    message(
      ui.workersStatus,
      result.message,
      'success'
    );
  } catch (error) {
    message(
      ui.workerFormStatus,
      error.message
    );
  } finally {
    workerBusy = false;
  }
}

async function removeWorker(id) {
  if (workerBusy) return;

  const worker = workers.find(
    row => row.id_usuario === id
  );

  if (
    !worker ||
    !workerFacilityId ||
    !confirm(
      `¿Quitar a ${workerName(worker)} de esta instalación?`
    )
  ) {
    return;
  }

  try {
    workerBusy = true;

    const result = await requestJson(
      `${API_GESTION}/api/instalaciones/${workerFacilityId}/operarios/${validId(id)}`,
      {
        method: 'DELETE'
      }
    );

    await loadWorkers();

    message(
      ui.workersStatus,
      result.message,
      'success'
    );
  } catch (error) {
    message(
      ui.workersStatus,
      error.message
    );
  } finally {
    workerBusy = false;
  }
}

function createInventoryFilter() {
  if (!$('inventoryTypeFilter')) {
    const container =
      document.createElement('div');

    container.className =
      'inventory-filter';

    container.innerHTML = `
      <label for="inventoryTypeFilter">
        Filtrar por tipo
      </label>

      <select
        id="inventoryTypeFilter"
        class="form-select form-select-sm"
      ></select>
    `;

    ui.inventoryTitle.insertAdjacentElement(
      'afterend',
      container
    );
  }

  ui.inventoryTypeFilter =
    $('inventoryTypeFilter');

  setOptions(
    ui.inventoryTypeFilter,
    TIPOS_ITEM,
    '',
    'Todos los tipos'
  );

  ui.inventoryTypeFilter.addEventListener(
    'change',
    () => {
      inventoryType =
        TIPOS_ITEM.includes(
          ui.inventoryTypeFilter.value
        )
          ? ui.inventoryTypeFilter.value
          : '';

      void loadInventory();
    }
  );
}

function createWorkersModal() {
  if (!$('facilityWorkersModal')) {
    const modal =
      document.createElement('div');

    modal.className = 'modal fade';
    modal.id = 'facilityWorkersModal';
    modal.tabIndex = -1;

    modal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content admin-modal">

          <div class="modal-header">
            <h5
              class="modal-title"
              id="facilityWorkersTitle"
            >
              Operarios
            </h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
            ></button>
          </div>

          <div class="modal-body">

            <div
              id="facilityWorkersStatus"
              class="d-none"
            ></div>

            <button
              id="facilityWorkerAdd"
              type="button"
              class="btn btn-primary mb-3"
            >
              Asignar operario
            </button>

            <form
              id="facilityWorkerForm"
              class="worker-assignment-panel mb-3 d-none"
            >
              <h6 id="facilityWorkerFormTitle">
                Asignar operario
              </h6>

              <div
                id="facilityWorkerFormStatus"
                class="d-none"
              ></div>

              <label
                for="facilityWorkerSelect"
                class="form-label"
              >
                Operario
              </label>

              <select
                id="facilityWorkerSelect"
                class="form-select mb-3"
                required
              ></select>

              <button
                class="btn btn-primary"
                type="submit"
              >
                Guardar
              </button>

              <button
                id="facilityWorkerCancel"
                class="btn btn-outline"
                type="button"
              >
                Cancelar
              </button>
            </form>

            <div class="table-responsive">
              <table class="table truck-table align-middle mb-0">

                <thead>
                  <tr>
                    <th>Operario</th>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Fecha de asignación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody id="facilityWorkersBody"></tbody>

              </table>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.append(modal);
  }

  ui.workersModal =
    $('facilityWorkersModal');

  ui.workersTitle =
    $('facilityWorkersTitle');

  ui.workersStatus =
    $('facilityWorkersStatus');

  ui.workersBody =
    $('facilityWorkersBody');

  ui.workerAdd =
    $('facilityWorkerAdd');

  ui.workerForm =
    $('facilityWorkerForm');

  ui.workerFormTitle =
    $('facilityWorkerFormTitle');

  ui.workerFormStatus =
    $('facilityWorkerFormStatus');

  ui.workerSelect =
    $('facilityWorkerSelect');

  ui.workerCancel =
    $('facilityWorkerCancel');

  modals.workers =
    bootstrap.Modal.getOrCreateInstance(
      ui.workersModal
    );

  ui.workerAdd.addEventListener(
    'click',
    () => void openWorkerForm()
  );

  ui.workerCancel.addEventListener(
    'click',
    cancelWorkerForm
  );

  ui.workerForm.addEventListener(
    'submit',
    saveWorker
  );
}

function handleClick(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const tab =
    target.closest('[data-facility-tab]');

  if (tab) {
    currentTab =
      tab.dataset.facilityTab;

    selectedId =
      currentFacilities()[0]
        ?.id_instalacion ?? null;

    updateTabs();
    renderFacilities();
    void loadInventory();

    return;
  }

  const workersButton =
    target.closest('[data-facility-workers]');

  if (workersButton) {
    void openWorkers(
      Number(
        workersButton.dataset.facilityWorkers
      )
    );

    return;
  }

  const editFacilityButton =
    target.closest('[data-facility-edit]');

  if (editFacilityButton) {
    const id =
      Number(
        editFacilityButton.dataset.facilityEdit
      );

    const item = facilities.find(
      facility =>
        facility.id_instalacion === id
    );

    if (item) {
      fillFacility(item);
      modals.facility.show();
    }

    return;
  }

  const deleteFacilityButton =
    target.closest('[data-facility-delete]');

  if (deleteFacilityButton) {
    void deleteFacility(
      Number(
        deleteFacilityButton.dataset.facilityDelete
      )
    );

    return;
  }

  const editItemButton =
    target.closest('[data-item-edit]');

  if (editItemButton) {
    const id =
      Number(
        editItemButton.dataset.itemEdit
      );

    const item = inventory.find(
      row => row.id_inventario === id
    );

    if (item && fillItem(item)) {
      modals.item.show();
    }

    return;
  }

  const deleteItemButton =
    target.closest('[data-item-delete]');

  if (deleteItemButton) {
    void deleteItem(
      Number(
        deleteItemButton.dataset.itemDelete
      )
    );

    return;
  }

  const editWorkerButton =
    target.closest('[data-worker-edit]');

  if (editWorkerButton) {
    void openWorkerForm(
      Number(
        editWorkerButton.dataset.workerEdit
      )
    );

    return;
  }

  const removeWorkerButton =
    target.closest('[data-worker-remove]');

  if (removeWorkerButton) {
    void removeWorker(
      Number(
        removeWorkerButton.dataset.workerRemove
      )
    );

    return;
  }

  if (target.closest('[data-facility-new]')) {
    fillFacility();
    modals.facility.show();
    return;
  }

  if (target.closest('[data-item-new]')) {
    if (fillItem()) {
      modals.item.show();
    }

    return;
  }

  const row =
    target.closest('[data-facility-select]');

  if (
    row &&
    !target.closest('button')
  ) {
    selectedId =
      validId(
        row.dataset.facilitySelect
      );

    renderFacilities();
    void loadInventory();
  }
}

function init() {
  ui.facilityBody = $('facilityBody');

  if (!ui.facilityBody) return;

  ui.facilityTitle = $('facilityTitle');

  ui.inventoryBody = $('inventoryBody');
  ui.inventoryPanel = $('inventoryPanel');
  ui.inventoryTitle = $('inventoryTitle');

  ui.facilityModal = $('facilityModal');
  ui.facilityForm = $('facilityForm');
  ui.facilityId = $('facilityId');
  ui.facilityName = $('facilityName');
  ui.facilityType = $('facilityType');
  ui.facilityWasteType = $('facilityWasteType');
  ui.facilityState = $('facilityState');
  ui.facilityStreet = $('facilityStreet');
  ui.facilityCorner1 = $('facilityCorner1');
  ui.facilityCorner2 = $('facilityCorner2');
  ui.facilityCapacityStatus = $('facilityCapacityStatus');
  ui.facilityModalTitle = $('facilityModalTitle');

  ui.itemModal = $('itemModal');
  ui.itemForm = $('itemForm');
  ui.itemId = $('itemId');
  ui.itemName = $('itemName');
  ui.itemType = $('itemType');
  ui.itemState = $('itemState');
  ui.itemQuantity = $('itemQuantity');
  ui.itemModalTitle = $('itemModalTitle');

  if (!window.bootstrap?.Modal) {
    console.error(
      'Carga Bootstrap antes de instalaciones.js.'
    );
    return;
  }

  if (!ui.facilityWasteType) {
    console.error(
      'No se encontró facilityWasteType.'
    );
    return;
  }

  ui.facilityStatus = ensureMessage(
    'facilityStatus',
    ui.facilityBody
      .closest('table')
      .parentElement
  );

  ui.inventoryStatus = ensureMessage(
    'inventoryStatus',
    ui.inventoryPanel
  );

  ui.facilityFormStatus = ensureMessage(
    'facilityFormStatus',
    ui.facilityForm
  );

  ui.itemFormStatus = ensureMessage(
    'itemFormStatus',
    ui.itemForm
  );

  modals.facility =
    bootstrap.Modal.getOrCreateInstance(
      ui.facilityModal
    );

  modals.item =
    bootstrap.Modal.getOrCreateInstance(
      ui.itemModal
    );

  setOptions(
    ui.facilityType,
    TIPOS,
    'Depósito'
  );

  ui.facilityWasteType.innerHTML = `
    <option value="" disabled>
      Seleccionar
    </option>

    <option value="general">
      General
    </option>

    <option value="reciclaje">
      Reciclaje
    </option>
  `;

  ui.facilityWasteType.value = '';

  setOptions(
    ui.facilityState,
    ESTADOS,
    'Operativo'
  );

  setOptions(
    ui.facilityCapacityStatus,
    CAPACIDADES,
    'Disponible'
  );

  setOptions(
    ui.itemType,
    TIPOS_ITEM,
    'Limpieza'
  );

  setOptions(
    ui.itemState,
    ESTADOS_ITEM,
    'Disponible'
  );

  ui.itemQuantity.type = 'number';
  ui.itemQuantity.min = '0';
  ui.itemQuantity.step = '1';

  createInventoryFilter();
  createWorkersModal();

  ui.facilityForm.addEventListener(
    'submit',
    saveFacility
  );

  ui.itemForm.addEventListener(
    'submit',
    saveItem
  );

  document.addEventListener(
    'click',
    handleClick
  );

  currentTab =
    document.querySelector(
      '[data-facility-tab].active'
    )?.dataset.facilityTab ||
    'depositos';

  updateTabs();
  void loadFacilities();
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    init,
    { once: true }
  );
} else {
  init();
}