const API_SESION_USUARIOS = 'http://127.0.0.1:8000';
const API_GESTION = 'http://127.0.0.1:8001';

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

const TOKEN_KEY = 'access_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function obtenerSesion() {
  const token = getToken();
  const headers = {
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_SESION_USUARIOS}/api/session`,
    {
      method: 'GET',
      headers
    }
  );

  if (response.status === 401) {
    removeToken();
  }

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
  const token = getToken();
  const headers = {
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    return await fetch(
      `${API_SESION_USUARIOS}/api/logout`,
      {
        method: 'POST',
        headers
      }
    );
  } finally {
    
    removeToken();
  }
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
  reporteForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mensaje =
      document.getElementById('reporteMensaje');

    const boton =
      reporteForm.querySelector('button[type="submit"]');

    if (boton.disabled) {
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.replace(
        '../landing-page/login.html'
      );
      return;
    }

    const datos = new FormData(reporteForm);

    const tipo = String(
      datos.get('tipo') || ''
    ).trim();

    const categorias = {
      'Contenedor desbordado': 'Contenedores',
      'Contenedor roto': 'Contenedores',
      'Residuos fuera de lugar': 'Residuos',
      'Demora en la recolección': 'Recolección',
      'Riesgo sanitario / contaminación biológica': 'Riesgo sanitario'
    };

    datos.set(
      'categoria',
      categorias[tipo] || 'General'
    );

    const foto = datos.get('foto');

    if (foto instanceof File && foto.size === 0) {
      datos.delete('foto');
    }

    boton.disabled = true;
    boton.textContent = 'Enviando reporte...';

    try {
      const response = await fetch(
        `${API_GESTION}/api/reclamos`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: datos
        }
      );

      const resultado = await response.json().catch(
        () => null
      );

      if (!response.ok) {
        const errores =
          resultado?.errors &&
          typeof resultado.errors === 'object'
            ? Object.values(resultado.errors).flat()
            : [];

        throw new Error(
          errores.join('\n') ||
          resultado?.message ||
          `No se pudo enviar el reporte (HTTP ${response.status}).`
        );
      }

      if (!resultado || resultado.success !== true) {
        throw new Error(
          resultado?.message ||
          'La API no confirmó que el reporte se haya registrado.'
        );
      }

      showMessage(
        mensaje,
        'Reporte enviado correctamente y pendiente de revisión.'
      );

      reporteForm.reset();

    } catch (error) {
      console.error(
        'Error enviando reporte:',
        error
      );

      showMessage(
        mensaje,
        error.message || 'No se pudo enviar el reporte.',
        true
      );

    } finally {
      boton.disabled = false;
      boton.textContent = 'Enviar reporte';
    }
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
