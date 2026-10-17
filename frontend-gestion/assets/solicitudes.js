const API_SOLICITUDES = 'http://127.0.0.1:8000';

const solicitudesNavButtons = document.querySelectorAll('[data-open-requests]');
const solicitudesTableBody = document.getElementById('solicitudesTableBody');
const solicitudesEstado = document.getElementById('solicitudesEstado');
const solicitudesModalElement = document.getElementById('solicitudesModal');

const solicitudesModal = solicitudesModalElement
  ? bootstrap.Modal.getOrCreateInstance(solicitudesModalElement)
  : null;

function escapeRequestValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

// [CAMBIO JWT - Paso 0]: Se eliminó obtenerCsrfSolicitudes() y el header 'X-CSRF-TOKEN'
// porque la API de Usuarios ya no utiliza protección CSRF.

async function apiSolicitudes(path, method = 'GET') {
  const headers = {
    'Accept': 'application/json'
  };

  const response = await fetch(
    `${API_SOLICITUDES}${path}`,
    {
      method,
      credentials: 'include',
      headers
    }
  );

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {
      success: false,
      message: 'La API devolvió una respuesta inválida.'
    };
  }

  return {
    response,
    result
  };
}

function renderRequests(requests) {
  const pending = requests.filter(
    (item) =>
      String(item.estado || '').toLowerCase() ===
      'pendiente'
  );

  solicitudesTableBody.innerHTML = pending.length
    ? pending.map((request) => `
      <tr>
        <td>
          <strong>
            ${escapeRequestValue(request.nombre)}
            ${escapeRequestValue(request.apellido)}
          </strong>
        </td>

        <td>
          ${escapeRequestValue(request.perfil)}
        </td>

        <td>
          ${escapeRequestValue(request.documento)}
        </td>

        <td>
          ${escapeRequestValue(request.email)}
        </td>

        <td>
          ${new Date(
            request.fecha_solicitud
          ).toLocaleString('es-UY')}
        </td>

        <td>
          <div class="d-flex gap-2 flex-wrap">
            <button
              class="btn btn-primary btn-sm"
              data-solicitud-aprobar="${request.id_solicitud}"
              type="button"
            >
              Aprobar
            </button>

            <button
              class="btn btn-outline btn-sm"
              data-solicitud-rechazar="${request.id_solicitud}"
              type="button"
            >
              Rechazar
            </button>
          </div>
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="6" class="text-center py-4">
          No hay solicitudes pendientes.
        </td>
      </tr>
    `;

  solicitudesEstado.textContent =
    `${pending.length} solicitud(es) pendiente(s).`;
}

async function cargarSolicitudes() {
  if (!solicitudesTableBody) {
    return;
  }

  solicitudesEstado.textContent =
    'Cargando solicitudes...';

  try {
    const { response, result } =
      await apiSolicitudes('/api/solicitudes');

    if (response.status === 401) {
      window.location.replace(
        '../landing-page/login.html'
      );
      return;
    }

    if (response.status === 403) {
      solicitudesEstado.textContent =
        'No tenés permisos para ver las solicitudes.';
      return;
    }

    if (!response.ok || !result.success) {
      solicitudesEstado.textContent =
        result.message ||
        'No se pudieron cargar las solicitudes.';
      return;
    }

    renderRequests(result.data || []);

  } catch (error) {
    console.error(error);

    solicitudesEstado.textContent =
      'No se pudo conectar con la API de usuarios.';
  }
}

async function resolverSolicitud(id, accion, button) {
  button?.setAttribute('disabled', '');

  solicitudesEstado.textContent =
    'Procesando solicitud...';

  try {
    const { response, result } =
      await apiSolicitudes(
        `/api/solicitudes/${id}/${accion}`,
        'POST'
      );

    if (response.status === 401) {
      window.location.replace(
        '../landing-page/login.html'
      );
      return;
    }

    if (!response.ok || !result.success) {
      solicitudesEstado.textContent =
        result.message ||
        'La solicitud no pudo ser procesada.';

      button?.removeAttribute('disabled');
      return;
    }

    solicitudesEstado.textContent =
      accion === 'aprobar'
        ? 'Solicitud aprobada correctamente.'
        : 'Solicitud rechazada correctamente.';

    await cargarSolicitudes();

  } catch (error) {
    console.error(error);

    solicitudesEstado.textContent =
      'No se pudo conectar con la API de usuarios.';

    button?.removeAttribute('disabled');
  }
}

solicitudesNavButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    await cargarSolicitudes();
    solicitudesModal?.show();
  });
});

document.addEventListener('click', (event) => {
  const approve =
    event.target.closest('[data-solicitud-aprobar]');

  if (approve) {
    resolverSolicitud(
      approve.dataset.solicitudAprobar,
      'aprobar',
      approve
    );

    return;
  }

  const reject =
    event.target.closest('[data-solicitud-rechazar]');

  if (reject) {
    resolverSolicitud(
      reject.dataset.solicitudRechazar,
      'rechazar',
      reject
    );
  }
});