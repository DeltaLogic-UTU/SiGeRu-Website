const API_SESION_USUARIOS = 'http://127.0.0.1:8000';

const root = document.documentElement;
const savedTheme = localStorage.getItem('sigeru-theme');

const preferredTheme = window.matchMedia(
  '(prefers-color-scheme: light)'
).matches
  ? 'light'
  : 'dark';

root.dataset.theme = savedTheme || preferredTheme;

function updateThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isLight = root.dataset.theme === 'light';

    button.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i><span>${isLight ? 'Oscuro' : 'Claro'}</span>`;

    button.setAttribute(
      'aria-label',
      isLight
        ? 'Activar modo oscuro'
        : 'Activar modo claro'
    );
  });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme =
      root.dataset.theme === 'light'
        ? 'dark'
        : 'light';

    localStorage.setItem(
      'sigeru-theme',
      root.dataset.theme
    );

    updateThemeButtons();
  });
});

function showMessage(element, text, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.style.display = 'block';
  element.classList.toggle('error', isError);
}

// [CAMBIO JWT - Paso 0]: Se eliminó obtenerCsrfSesion() y el header 'X-CSRF-TOKEN'
// al cerrar sesión porque la API ya no utiliza tokens CSRF.

async function obtenerSesion() {
  const response = await fetch(
    `${API_SESION_USUARIOS}/api/session`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {
      success: false
    };
  }

  return {
    response,
    result
  };
}

async function cerrarSesion() {
  return fetch(
    `${API_SESION_USUARIOS}/api/logout`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    }
  );
}

const paginaActual = window.location.pathname
  .split('/')
  .pop()
  .toLowerCase();

const perfilesPorPagina = {
  'vecino.html': 'vecino',
  'reporte-vecino.html': 'vecino',
  'perfil.html': 'vecino',
  'cuadrilla.html': 'cuadrilla',
  'operario.html': 'operario',
  'chofer.html': 'chofer'
};

async function protegerPagina() {
  const perfilNecesario =
    perfilesPorPagina[paginaActual] || '';

  if (!perfilNecesario) {
    return null;
  }

  try {
    const { response, result } =
      await obtenerSesion();

    if (
      !response.ok ||
      !result.success ||
      !result.usuario
    ) {
      window.location.replace(
        '../landing-page/login.html'
      );

      return null;
    }

    const perfilActivo =
      String(result.usuario.rol || '')
        .trim()
        .toLowerCase();

    if (perfilActivo !== perfilNecesario) {
      window.location.replace(
        '../landing-page/login.html'
      );

      return null;
    }

    const perfilTexto =
      document.getElementById('perfilActivo');

    if (perfilTexto) {
      perfilTexto.textContent = perfilActivo;
    }

    const reportePermitido =
      document.getElementById('reportePermitido');

    const reporteBloqueado =
      document.getElementById('reporteBloqueado');

    if (reportePermitido && reporteBloqueado) {
      const esVecino =
        perfilActivo === 'vecino';

      reportePermitido.style.display =
        esVecino ? 'block' : 'none';

      reporteBloqueado.style.display =
        esVecino ? 'none' : 'block';
    }

    return result.usuario;

  } catch (error) {
    console.error(error);

    window.location.replace(
      '../landing-page/login.html'
    );

    return null;
  }
}

const reporteForm =
  document.getElementById('reporteForm');

if (reporteForm) {
  reporteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    showMessage(
      document.getElementById('reporteMensaje'),
      'Reporte enviado y pendiente de revisión.'
    );

    reporteForm.reset();
  });
}

document.querySelectorAll('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const mensajeId =
      form.dataset.message;

    const mensaje =
      document.getElementById(mensajeId);

    showMessage(
      mensaje,
      'La información fue procesada correctamente.'
    );

    form.reset();
  });
});

document.querySelectorAll('[data-logout]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      await cerrarSesion();
    } catch (error) {
      console.error(error);
    }

    window.location.replace(
      '../landing-page/login.html'
    );
  });
});

async function iniciarPagina() {
  const usuario = await protegerPagina();

  if (paginaActual !== 'chofer.html' || !usuario) {
    return;
  }

  const nombreChofer =
    `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();

  let camion = null;

  try {
    const camiones = JSON.parse(
      localStorage.getItem('sigeru-camiones-v2') || '[]'
    );

    if (nombreChofer) {
      camion =
        camiones.find((item) =>
          String(item.chofer || '').toLowerCase() ===
          nombreChofer.toLowerCase()
        ) || null;
    }
  } catch {
    camion = null;
  }

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  };

  if (camion) {
    setText(
      'choferCamionResumen',
      camion.matricula || 'Camión asignado'
    );

    setText(
      'choferCamionTexto',
      `${camion.marca || ''} ${camion.modelo || ''}`.trim()
    );

    setText(
      'choferEstadoResumen',
      camion.estado || 'Activo'
    );

    setText(
      'choferRutaResumen',
      camion.ruta || 'Sin ruta asignada'
    );

    setText(
      'choferTurnoResumen',
      camion.turno || 'Sin turno'
    );

    setText(
      'choferVehiculo',
      `${camion.matricula} · ${camion.marca} ${camion.modelo}`
    );

    setText(
      'choferRuta',
      camion.ruta || 'Sin ruta asignada'
    );

    setText(
      'choferEstado',
      `${camion.estado || 'Sin estado'} · ${camion.gps || 'Sin ubicación'}`
    );
  }
}

iniciarPagina();