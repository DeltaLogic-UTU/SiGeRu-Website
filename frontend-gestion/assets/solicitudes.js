const API_SOLICITUDES = 'http://127.0.0.1:8000';

const solicitudesNavButtons =
  document.querySelectorAll('[data-open-requests]');

const solicitudesTableBody =
  document.getElementById('solicitudesTableBody');

const solicitudesEstado =
  document.getElementById('solicitudesEstado');

const solicitudesModalElement =
  document.getElementById('solicitudesModal');

const solicitudesModal =
  solicitudesModalElement && typeof bootstrap !== 'undefined'
    ? bootstrap.Modal.getOrCreateInstance(solicitudesModalElement)
    : null;

const motivosSolicitudes = new Map();

function escapeRequestValue(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

async function apiSolicitudes(path, method = 'GET') {
  const headers = {
    'Accept': 'application/json'
  };

  const token = localStorage.getItem('access_token');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_SOLICITUDES}${path}`,
    { method, headers }
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

  return { response, result };
}

function formatearFechaSolicitud(fecha) {
  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? 'Sin fecha'
    : valor.toLocaleString('es-UY');
}

function renderRequests(requests) {
  if (!solicitudesTableBody || !solicitudesEstado) return;

  const pending = (
    Array.isArray(requests) ? requests : []
  ).filter(
    item => String(item.estado || '').toLowerCase() === 'pendiente'
  );

  motivosSolicitudes.clear();

  pending.forEach(request => {
    motivosSolicitudes.set(String(request.id_solicitud), {
      nombre: `${request.nombre || ''} ${request.apellido || ''}`.trim(),
      motivo: String(request.motivo ?? '').trim() ||
        'No se indicó un motivo.'
    });
  });

  solicitudesTableBody.innerHTML = pending.length
    ? pending.map(request => `
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
          ${escapeRequestValue(
      formatearFechaSolicitud(request.fecha_solicitud)
    )}
        </td>

        <td>
          <div class="d-flex gap-2 flex-wrap align-items-center">

            <button
              class="btn btn-outline btn-sm solicitud-motivo-boton"
              type="button"
              data-solicitud-motivo="${escapeRequestValue(request.id_solicitud)}"
              title="Ver motivo del registro"
              aria-label="Ver motivo del registro"
            >
              <i class="bi bi-chat-left-text" aria-hidden="true"></i>
            </button>

            <button
              class="btn btn-primary btn-sm"
              type="button"
              data-solicitud-aprobar="${escapeRequestValue(request.id_solicitud)}"
            >
              Aprobar
            </button>

            <button
              class="btn btn-outline btn-sm"
              type="button"
              data-solicitud-rechazar="${escapeRequestValue(request.id_solicitud)}"
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

function mostrarMotivoSolicitud(id, botonOrigen) {
  const solicitud = motivosSolicitudes.get(String(id));

  if (!solicitud || !solicitudesModalElement) return;

  if (
    solicitudesModalElement.querySelector('.solicitud-motivo-fondo')
  ) {
    return;
  }

  const fondo = document.createElement('div');
  fondo.className = 'solicitud-motivo-fondo';

  fondo.innerHTML = `
    <section
      class="solicitud-motivo-cuadro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitudMotivoTitulo"
      aria-describedby="solicitudMotivoTexto"
    >
      <div class="solicitud-motivo-cabecera">
        <h3 id="solicitudMotivoTitulo">
          <i class="bi bi-chat-left-text" aria-hidden="true"></i>
          Motivo del registro
        </h3>

        <button
          type="button"
          class="solicitud-motivo-x"
          data-cerrar-motivo
          aria-label="Cerrar ventana"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>

      <p class="solicitud-motivo-persona"></p>

      <div
        class="solicitud-motivo-texto"
        id="solicitudMotivoTexto"
      ></div>

      <div class="solicitud-motivo-pie">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          data-cerrar-motivo
        >
          Cerrar
        </button>
      </div>
    </section>
  `;

  fondo.querySelector('.solicitud-motivo-persona').textContent =
    solicitud.nombre;

  fondo.querySelector('.solicitud-motivo-texto').textContent =
    solicitud.motivo;

  const botones = [...fondo.querySelectorAll('button')];

  const cerrar = () => {
    document.removeEventListener(
      'keydown',
      manejarTeclado,
      true
    );

    solicitudesModalElement.removeEventListener(
      'hide.bs.modal',
      cerrar
    );

    fondo.remove();
    botonOrigen?.focus();
  };

  const manejarTeclado = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      cerrar();
    } else if (event.key === 'Tab') {
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === primero
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === ultimo
      ) {
        event.preventDefault();
        primero.focus();
      }
    }
  };

  fondo.querySelectorAll('[data-cerrar-motivo]').forEach(
    boton => boton.addEventListener('click', cerrar)
  );

  fondo.addEventListener('click', event => {
    if (event.target === fondo) cerrar();
  });

  solicitudesModalElement.appendChild(fondo);

  solicitudesModalElement.addEventListener(
    'hide.bs.modal',
    cerrar
  );

  document.addEventListener(
    'keydown',
    manejarTeclado,
    true
  );

  botones[0].focus();
}

async function cargarSolicitudes() {
  if (!solicitudesTableBody || !solicitudesEstado) return;

  solicitudesEstado.textContent = 'Cargando solicitudes...';

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
        result.message || 'No se pudieron cargar las solicitudes.';
      return;
    }

    renderRequests(result.data);

  } catch (error) {
    console.error(error);

    solicitudesEstado.textContent =
      'No se pudo conectar con la API de usuarios.';
  }
}

async function resolverSolicitud(id, accion, button) {
  if (button?.disabled || !solicitudesEstado) return;

  if (button) button.disabled = true;

  solicitudesEstado.textContent = 'Procesando solicitud...';

  try {
    const { response, result } = await apiSolicitudes(
      `/api/solicitudes/${encodeURIComponent(id)}/${accion}`,
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
        result.message || 'La solicitud no pudo ser procesada.';

      if (button) button.disabled = false;
      return;
    }

    const mensaje = result.message || (
      accion === 'aprobar'
        ? 'Solicitud aprobada correctamente.'
        : 'Solicitud rechazada correctamente.'
    );

    await cargarSolicitudes();

    solicitudesEstado.textContent = mensaje;
    solicitudesEstado.dataset.estado =
      mensaje.includes('pero no se pudo enviar el correo')
        ? 'aviso'
        : 'ok';

  } catch (error) {
    console.error(error);

    solicitudesEstado.textContent =
      'Ocurrió un error al procesar la solicitud. Intente nuevamente.';

    solicitudesEstado.dataset.estado = 'error';

    if (button) button.disabled = false;
  }
}

solicitudesNavButtons.forEach(button => {
  button.addEventListener('click', async () => {
    await cargarSolicitudes();
    solicitudesModal?.show();
  });
});

document.addEventListener('click', event => {
  const boton = event.target.closest('[data-solicitud-motivo]');

  if (boton) {
    mostrarMotivoSolicitud(
      boton.dataset.solicitudMotivo,
      boton
    );
    return;
  }

  const aprobar = event.target.closest('[data-solicitud-aprobar]');

  if (aprobar) {
    resolverSolicitud(
      aprobar.dataset.solicitudAprobar,
      'aprobar',
      aprobar
    );
    return;
  }

  const rechazar = event.target.closest('[data-solicitud-rechazar]');

  if (rechazar) {
    resolverSolicitud(
      rechazar.dataset.solicitudRechazar,
      'rechazar',
      rechazar
    );
  }
});
