const solicitudesNavButtons = document.querySelectorAll('[data-open-requests]');
const solicitudesTableBody = document.getElementById('solicitudesTableBody');
const solicitudesEstado = document.getElementById('solicitudesEstado');
const solicitudesModalElement = document.getElementById('solicitudesModal');
const solicitudesModal = solicitudesModalElement
  ? bootstrap.Modal.getOrCreateInstance(solicitudesModalElement)
  : null;

const LOCAL_REQUESTS_KEY = 'sigeru-solicitudes-local';
const LOCAL_WORKERS_KEY = 'sigeru-trabajadores-local';
const LOCAL_USERS_KEY = 'sigeru-usuarios-local';

function readLocal(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeRequestValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function normalizeRequest(request, index) {
  return {
    ...request,
    id_solicitud: Number(request.id_solicitud || request.id || Date.now() + index),
    perfil: String(request.perfil || 'vecino').toLowerCase(),
    estado: request.estado || 'pendiente',
    fecha_solicitud: request.fecha_solicitud || new Date().toISOString()
  };
}

function renderRequests(requests, localMode = false) {
  const pending = requests.filter((item) => item.estado === 'pendiente');

  solicitudesTableBody.innerHTML = pending.length
    ? pending.map((request) => `
      <tr>
        <td><strong>${escapeRequestValue(request.nombre)} ${escapeRequestValue(request.apellido)}</strong></td>
        <td>${escapeRequestValue(request.perfil)}</td>
        <td>${escapeRequestValue(request.documento)}</td>
        <td>${escapeRequestValue(request.email)}</td>
        <td>${new Date(request.fecha_solicitud).toLocaleString('es-UY')}</td>
        <td>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-primary btn-sm"
              data-solicitud-aprobar="${request.id_solicitud}"
              data-local="${localMode}" type="button">
              Aprobar
            </button>
            <button class="btn btn-outline btn-sm"
              data-solicitud-rechazar="${request.id_solicitud}"
              data-local="${localMode}" type="button">
              Rechazar
            </button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="text-center py-4">No hay solicitudes pendientes.</td></tr>';

  solicitudesEstado.textContent = localMode
    ? `${pending.length} solicitud(es) pendiente(s) en modo local.`
    : `${pending.length} solicitud(es) pendiente(s).`;
}

async function cargarSolicitudes() {
  if (!solicitudesTableBody) return;
  const local = readLocal(LOCAL_REQUESTS_KEY).map(normalizeRequest);
  renderRequests(local, true);
}

function approveLocalRequest(id) {
  const requests = readLocal(LOCAL_REQUESTS_KEY).map(normalizeRequest);
  const request = requests.find((item) => item.id_solicitud === Number(id));
  if (!request || request.estado !== 'pendiente') return false;

  request.estado = 'aprobada';
  request.fecha_resolucion = new Date().toISOString();

  const users = readLocal(LOCAL_USERS_KEY);
  if (!users.some((item) => item.email === request.email)) {
    users.push({
      id_usuario: Date.now(),
      nombre: request.nombre,
      apellido: request.apellido,
      documento: request.documento,
      telefono: request.telefono,
      email: request.email,
      password: request.password,
      rol: request.perfil,
      estado: 'activo'
    });
    writeLocal(LOCAL_USERS_KEY, users);
  }

  if (request.perfil !== 'vecino') {
    const workers = readLocal(LOCAL_WORKERS_KEY);
    if (!workers.some((item) => item.email === request.email)) {
      workers.push({
        id_trabajador: Date.now(),
        nombre: request.nombre,
        apellido: request.apellido,
        documento: request.documento,
        telefono: request.telefono,
        email: request.email,
        rol: request.perfil,
        licencia: request.perfil === 'chofer' ? request.licencia || null : null,
        estado: 'activo',
        asignacion: 'Sin asignar'
      });
      writeLocal(LOCAL_WORKERS_KEY, workers);
    }
  }

  writeLocal(LOCAL_REQUESTS_KEY, requests);
  return true;
}

function rejectLocalRequest(id) {
  const requests = readLocal(LOCAL_REQUESTS_KEY).map(normalizeRequest);
  const request = requests.find((item) => item.id_solicitud === Number(id));
  if (!request || request.estado !== 'pendiente') return false;

  request.estado = 'rechazada';
  request.fecha_resolucion = new Date().toISOString();
  writeLocal(LOCAL_REQUESTS_KEY, requests);
  return true;
}

async function resolverSolicitud(id, accion, localMode, button) {
  solicitudesEstado.textContent = '';
  button?.setAttribute('disabled', '');

  const success = accion === 'aprobar'
    ? approveLocalRequest(id)
    : rejectLocalRequest(id);

  solicitudesEstado.textContent = success
    ? `Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente.`
    : 'La solicitud no pudo ser procesada.';

  await cargarSolicitudes();
}

solicitudesNavButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    await cargarSolicitudes();
    solicitudesModal?.show();
  });
});

document.addEventListener('click', (event) => {
  const approve = event.target.closest('[data-solicitud-aprobar]');
  if (approve) {
    resolverSolicitud(
      approve.dataset.solicitudAprobar,
      'aprobar',
      approve.dataset.local,
      approve
    );
  }

  const reject = event.target.closest('[data-solicitud-rechazar]');
  if (reject) {
    resolverSolicitud(
      reject.dataset.solicitudRechazar,
      'rechazar',
      reject.dataset.local,
      reject
    );
  }
});
