const API_GESTION = 'http://127.0.0.1:8001';

let crews = [];
let responsables = [];

const crewState = { selectedId: null };

const $ = id => document.getElementById(id);

const crewBody = $('crewTableBody');
const membersBody = $('crewMembersBody');
const cleaningHistoryBody = $('crewCleaningHistoryBody');
const claimsHistoryBody = $('crewClaimsHistoryBody');
const incidentsHistoryBody = $('crewIncidentsHistoryBody');

const crewModal = bootstrap.Modal.getOrCreateInstance($('crewModal'));
const memberModal = bootstrap.Modal.getOrCreateInstance($('memberModal'));

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);

const emptyRow = (columns, message = 'Sin registros.') =>
  `<tr><td colspan="${columns}" class="text-center py-3 text-muted-custom">${esc(message)}</td></tr>`;

const selectedCrew = () =>
  crews.find(item => item.id === crewState.selectedId);

function obtenerData(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

async function requestGestion(url, options = {}) {
  const token = typeof getToken === 'function'
    ? getToken()
    : localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No hay una sesión activa. Iniciá sesión.');
  }

  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers || {})
  };

  let response;

  try {
    response = await fetch(`${API_GESTION}${url}`, {
      method,
      headers,
      ...(options.body !== undefined
        ? { body: options.body }
        : {})
    });
  } catch {
    throw new Error('No se pudo conectar con la API de Gestión.');
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    const errores = result.errors
      ? Object.values(result.errors).flat().filter(Boolean).join(' ')
      : '';

    throw new Error(
      errores ||
      result.message ||
      `Error HTTP ${response.status}`
    );
  }

  return result;
}


function convertirIntegrante(item) {
  return {
    id_usuario: Number(item.id_usuario),
    nombre: [
      item.nombre || '',
      item.apellido || ''
    ].join(' ').trim(),
    estado: item.estado || 'Activo',
    fecha: String(item.fecha_asignacion || '')
      .slice(0, 10) || '—'
  };
}

function convertirCuadrilla(item) {
  return {
    id: item.id_cuadrilla,
    id_responsable: item.id_responsable,
    responsable: item.responsable || 'Sin responsable',
    turno: item.turno || '',
    estado: item.estado || '',
    ubicacion: item.ubicacion_actual || item.ubicacion || '',
    integrantes: [],
    historiales: {
      limpieza: [],
      reclamos: [],
      incidencias: []
    }
  };
}

async function cargarIntegrantesCuadrilla(crew) {
  const result = await requestGestion(
    `/api/cuadrillas/${encodeURIComponent(crew.id)}/integrantes`
  );

  crew.integrantes = obtenerData(result).map(convertirIntegrante);
}

async function cargarHistorialesCuadrilla(crew) {
  const result = await requestGestion(
    `/api/cuadrillas/${encodeURIComponent(crew.id)}/historiales`
  );

  const data = result?.data || {};

  crew.historiales = {
    limpieza: Array.isArray(data.limpieza) ? data.limpieza : [],
    reclamos: Array.isArray(data.reclamos) ? data.reclamos : [],
    incidencias: Array.isArray(data.incidencias) ? data.incidencias : []
  };
}

async function cargarDetalleCuadrilla(crew) {
  const resultados = await Promise.allSettled([
    cargarIntegrantesCuadrilla(crew),
    cargarHistorialesCuadrilla(crew)
  ]);

  for (let i = 0; i < resultados.length; i++) {
    if (resultados[i].status === 'rejected') {
      console.error(
        i === 0
          ? `Error de integrantes (${crew.id}):`
          : `Error de historiales (${crew.id}):`,
        resultados[i].reason
      );
    }
  }
}

async function cargarCuadrillas() {
  const result = await requestGestion('/api/cuadrillas');

  crews = obtenerData(result).map(convertirCuadrilla);

  await Promise.all(crews.map(cargarDetalleCuadrilla));

  if (
    !crewState.selectedId ||
    !crews.some(item => item.id === crewState.selectedId)
  ) {
    crewState.selectedId = crews[0]?.id || null;
  }

  renderCrews();
  renderDetails();
}

async function cargarResponsables() {
  const result = await requestGestion('/api/cuadrillas/responsables');
  responsables = obtenerData(result);
}

async function cargarIntegrantesDisponibles(idCuadrilla) {
  const result = await requestGestion(
    `/api/cuadrillas/${encodeURIComponent(idCuadrilla)}/integrantes-disponibles`
  );

  return obtenerData(result);
}

function prepararSelectorResponsable(idSeleccionado = '') {
  let campo = $('crewChiefInput');
  if (!campo) return;

  if (campo.tagName.toLowerCase() !== 'select') {
    const select = document.createElement('select');
    select.id = campo.id;
    select.name = campo.name;
    select.className = campo.className;
    select.required = true;
    campo.replaceWith(select);
    campo = select;
  }

  campo.innerHTML = `
    <option value="">Seleccionar barrendero</option>
    ${responsables.map(usuario => `
      <option
        value="${esc(usuario.id_usuario)}"
        ${String(usuario.id_usuario) === String(idSeleccionado)
      ? 'selected' : ''}>
        ${esc(usuario.nombre)} ${esc(usuario.apellido)}
      </option>
    `).join('')}
  `;
}

async function prepararSelectorIntegrante(idSeleccionado = '') {
  const crew = selectedCrew();
  if (!crew) return;

  let campo = $('memberName');
  if (!campo) return;

  if (campo.tagName.toLowerCase() !== 'select') {
    const select = document.createElement('select');
    select.id = campo.id;
    select.name = campo.name;
    select.className = campo.className;
    select.required = true;
    campo.replaceWith(select);
    campo = select;
  }

  const disponibles = await cargarIntegrantesDisponibles(crew.id);
  const opciones = [...disponibles];

  if (idSeleccionado) {
    const actual = crew.integrantes.find(
      integrante =>
        String(integrante.id_usuario) === String(idSeleccionado)
    );

    const existe = opciones.some(
      usuario =>
        String(usuario.id_usuario) === String(idSeleccionado)
    );

    if (actual && !existe) {
      opciones.unshift({
        id_usuario: actual.id_usuario,
        nombre: actual.nombre,
        apellido: ''
      });
    }
  }

  campo.innerHTML = `
    <option value="">Seleccionar barrendero</option>
    ${opciones.map(usuario => `
      <option
        value="${esc(usuario.id_usuario)}"
        ${String(usuario.id_usuario) === String(idSeleccionado)
      ? 'selected' : ''}>
        ${esc(usuario.nombre)} ${esc(usuario.apellido || '')}
      </option>
    `).join('')}
  `;
}

function historyCount(crew) {
  return (
    crew.historiales.limpieza.length +
    crew.historiales.reclamos.length +
    crew.historiales.incidencias.length
  );
}

function renderCrews() {
  if (!crewBody) return;

  if (!crews.length) {
    crewBody.innerHTML = emptyRow(
      8,
      'No hay cuadrillas registradas.'
    );
    return;
  }

  crewBody.innerHTML = crews.map(item => `
    <tr
      class="${item.id === crewState.selectedId ? 'table-active' : ''}"
      data-crew-select="${esc(item.id)}">

      <td><strong>${esc(item.id)}</strong></td>
      <td>${esc(item.responsable)}</td>
      <td>${esc(item.turno)}</td>
      <td>${esc(item.estado)}</td>
      <td>${esc(item.ubicacion)}</td>
      <td>${historyCount(item)}</td>
      <td>${item.integrantes.length}</td>

      <td>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline btn-sm"
            data-crew-edit="${esc(item.id)}"
            type="button"
            aria-label="Editar ${esc(item.id)}">
            <i class="bi bi-pencil"></i>
          </button>

          <button
            class="btn btn-outline btn-sm"
            data-crew-delete="${esc(item.id)}"
            type="button"
            aria-label="Eliminar ${esc(item.id)}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderDetails() {
  const crew = selectedCrew();

  if (!crew) {
    if (membersBody) {
      membersBody.innerHTML = emptyRow(
        4, 'Seleccioná una cuadrilla.'
      );
    }

    if (cleaningHistoryBody) {
      cleaningHistoryBody.innerHTML = emptyRow(3);
    }

    if (claimsHistoryBody) {
      claimsHistoryBody.innerHTML = emptyRow(3);
    }

    if (incidentsHistoryBody) {
      incidentsHistoryBody.innerHTML = emptyRow(6);
    }

    return;
  }

  const title = $('crewMembersTitle');

  if (title) {
    title.textContent = `Integrantes de ${crew.id}`;
  }


  if (membersBody) {
    membersBody.innerHTML = crew.integrantes.length
      ? crew.integrantes.map((member, index) => `
        <tr>
          <td><strong>${esc(member.nombre)}</strong></td>
          <td>${esc(member.estado)}</td>
          <td>${esc(member.fecha)}</td>
          <td>
            <div class="d-flex gap-2">
              <button
                class="btn btn-outline btn-sm"
                data-member-edit="${index}"
                type="button"
                aria-label="Editar integrante">
                <i class="bi bi-pencil"></i>
              </button>

              <button
                class="btn btn-outline btn-sm"
                data-member-delete="${index}"
                type="button"
                aria-label="Quitar integrante">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('')
      : emptyRow(4, 'Sin integrantes.');
  }


  if (cleaningHistoryBody) {
    cleaningHistoryBody.innerHTML =
      crew.historiales.limpieza.length
        ? crew.historiales.limpieza.map(item => `
          <tr>
            <td>${esc(item.circuito)}</td>
            <td>${esc(item.asignacion)}</td>
            <td>${esc(item.finalizacion)}</td>
          </tr>
        `).join('')
        : emptyRow(3);
  }


  if (claimsHistoryBody) {
    claimsHistoryBody.innerHTML =
      crew.historiales.reclamos.length
        ? crew.historiales.reclamos.map(item => `
          <tr>
            <td>${esc(item.reclamo)}</td>
            <td>${esc(item.asignacion)}</td>
            <td>${esc(item.finalizacion)}</td>
          </tr>
        `).join('')
        : emptyRow(3);
  }


  if (incidentsHistoryBody) {
    incidentsHistoryBody.innerHTML =
      crew.historiales.incidencias.length
        ? crew.historiales.incidencias.map(item => `
          <tr>
            <td><strong>${esc(item.codigo)}</strong></td>
            <td>${esc(item.tipo)}</td>
            <td>${esc(item.estado)}</td>
            <td>${esc(item.reporte)}</td>
            <td>${esc(item.resolucion)}</td>
            <td>${esc(item.descripcion)}</td>
          </tr>
        `).join('')
        : emptyRow(6);
  }
}

async function fillCrew(item = {}) {
  if (!responsables.length) {
    await cargarResponsables();
  }

  const originalInput = $('crewOriginalId');
  const codeInput = $('crewCodeInput');

  if (originalInput) {
    originalInput.value = item.id || '';
  }

  if (codeInput) {
    codeInput.value = item.id || '';
    codeInput.disabled = Boolean(item.id);
  }

  prepararSelectorResponsable(item.id_responsable || '');

  const turnInput = $('crewTurnInput');
  const stateInput = $('crewStateInput');
  const locationInput = $('crewLocationInput');
  const modalTitle = $('crewModalTitle');

  if (turnInput) {
    turnInput.value = item.turno || 'Nocturno';
  }

  if (stateInput) {
    stateInput.value = item.estado || 'En base';
  }

  if (locationInput) {
    locationInput.value = item.ubicacion || '';
  }

  if (modalTitle) {
    modalTitle.textContent = item.id
      ? 'Editar cuadrilla'
      : 'Nueva cuadrilla';
  }
}

const crewForm = $('crewForm');

crewForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const original = $('crewOriginalId')?.value || '';
  const idResponsable = $('crewChiefInput')?.value || '';
  const turno = $('crewTurnInput')?.value || '';
  const estado = $('crewStateInput')?.value || '';
  const ubicacion = $('crewLocationInput')?.value.trim() || '';

  if (!idResponsable) {
    alert('Seleccioná un barrendero responsable.');
    return;
  }

  if (!turno) {
    alert('Seleccioná el turno.');
    return;
  }

  if (!estado) {
    alert('Ingresá el estado.');
    return;
  }

  if (!ubicacion) {
    alert('Ingresá la ubicación.');
    return;
  }

  const payload = {
    id_responsable: Number(idResponsable),
    turno,
    estado,
    ubicacion_actual: ubicacion
  };

  try {
    if (original) {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(original)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload)
        }
      );
    } else {
      const codigo = $('crewCodeInput')?.value.trim() || '';

      if (!codigo) {
        alert('Ingresá el código de la cuadrilla.');
        return;
      }

      payload.id_cuadrilla = codigo;

      await requestGestion('/api/cuadrillas', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      crewState.selectedId = codigo;
    }

    crewModal.hide();
    await cargarResponsables();
    await cargarCuadrillas();

  } catch (error) {
    alert(error.message);
  }
});

const memberForm = $('memberForm');

memberForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const crew = selectedCrew();
  if (!crew) return;

  const nuevoId = Number($('memberName')?.value);
  const idOriginal = Number($('memberIndex')?.value);

  if (!nuevoId) {
    alert('Seleccioná un barrendero.');
    return;
  }

  try {
    if (idOriginal) {
      if (idOriginal !== nuevoId) {
        await requestGestion(
          `/api/cuadrillas/${encodeURIComponent(crew.id)}/integrantes/${idOriginal}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              id_usuario: nuevoId
            })
          }
        );
      }
    } else {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(crew.id)}/integrantes`,
        {
          method: 'POST',
          body: JSON.stringify({
            id_usuario: nuevoId
          })
        }
      );
    }

    memberModal.hide();
    await cargarCuadrillas();

  } catch (error) {
    alert(error.message);
  }
});


document.querySelector('[data-crew-new]')
  ?.addEventListener('click', async () => {
    try {
      crewForm?.reset();
      await fillCrew();
      crewModal.show();
    } catch (error) {
      alert(error.message);
    }
  });


document.querySelector('[data-member-new]')
  ?.addEventListener('click', async () => {
    const crew = selectedCrew();

    if (!crew) {
      alert('Seleccioná una cuadrilla.');
      return;
    }

    try {
      memberForm?.reset();

      if ($('memberIndex')) {
        $('memberIndex').value = '';
      }

      await prepararSelectorIntegrante();

      if ($('memberState')) {
        $('memberState').value = 'Activo';
        $('memberState').disabled = true;
      }

      if ($('memberDate')) {
        $('memberDate').value = new Date()
          .toISOString().slice(0, 10);
        $('memberDate').disabled = true;
      }

      if ($('memberModalTitle')) {
        $('memberModalTitle').textContent = 'Nuevo integrante';
      }

      memberModal.show();

    } catch (error) {
      alert(error.message);
    }
  });

document.addEventListener('click', async event => {
  if (!(event.target instanceof Element)) return;

  const row = event.target.closest('[data-crew-select]');

  const action = event.target.closest(
    'button,a,input,select,textarea,label,[role="button"]'
  );


  if (row && !action) {
    crewState.selectedId = row.dataset.crewSelect;
    renderCrews();
    renderDetails();
    return;
  }


  const edit = event.target.closest('[data-crew-edit]');

  if (edit) {
    const crew = crews.find(
      item => item.id === edit.dataset.crewEdit
    );

    if (!crew) return;

    try {
      crewForm?.reset();
      await fillCrew(crew);
      crewModal.show();
    } catch (error) {
      alert(error.message);
    }

    return;
  }

  const remove = event.target.closest('[data-crew-delete]');

  if (remove) {
    const id = remove.dataset.crewDelete;

    if (!confirm(`¿Eliminar la cuadrilla ${id}?`)) {
      return;
    }

    try {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );

      if (crewState.selectedId === id) {
        crewState.selectedId = null;
      }

      await cargarCuadrillas();

    } catch (error) {
      alert(error.message);
    }

    return;
  }


  const memberEdit = event.target.closest('[data-member-edit]');

  if (memberEdit) {
    const crew = selectedCrew();

    const member = crew?.integrantes[
      Number(memberEdit.dataset.memberEdit)
    ];

    if (!member) return;

    try {
      memberForm?.reset();

      if ($('memberIndex')) {
        $('memberIndex').value = member.id_usuario;
      }

      await prepararSelectorIntegrante(member.id_usuario);

      if ($('memberState')) {
        $('memberState').value = member.estado;
        $('memberState').disabled = true;
      }

      if ($('memberDate')) {
        $('memberDate').value =
          member.fecha === '—' ? '' : member.fecha;
        $('memberDate').disabled = true;
      }

      if ($('memberModalTitle')) {
        $('memberModalTitle').textContent = 'Editar integrante';
      }

      memberModal.show();

    } catch (error) {
      alert(error.message);
    }

    return;
  }

  const memberDelete = event.target.closest('[data-member-delete]');

  if (memberDelete) {
    const crew = selectedCrew();

    const member = crew?.integrantes[
      Number(memberDelete.dataset.memberDelete)
    ];

    if (!crew || !member) return;

    if (!confirm(
      `¿Quitar a ${member.nombre} de ${crew.id}?`
    )) {
      return;
    }

    try {
      await requestGestion(
        `/api/cuadrillas/${encodeURIComponent(crew.id)}/integrantes/${member.id_usuario}`,
        { method: 'DELETE' }
      );

      await cargarCuadrillas();

    } catch (error) {
      alert(error.message);
    }
  }
});


async function iniciarCuadrillas() {
  try {
    await cargarResponsables();
    await cargarCuadrillas();

  } catch (error) {
    console.error('Error al cargar cuadrillas:', error);

    if (crewBody) {
      crewBody.innerHTML = emptyRow(
        8,
        error.message || 'No se pudieron cargar las cuadrillas.'
      );
    }

    if (membersBody) {
      membersBody.innerHTML = emptyRow(
        4,
        'No se pudieron cargar los integrantes.'
      );
    }

    if (cleaningHistoryBody) {
      cleaningHistoryBody.innerHTML = emptyRow(3);
    }

    if (claimsHistoryBody) {
      claimsHistoryBody.innerHTML = emptyRow(3);
    }

    if (incidentsHistoryBody) {
      incidentsHistoryBody.innerHTML = emptyRow(6);
    }
  }
}

iniciarCuadrillas();
