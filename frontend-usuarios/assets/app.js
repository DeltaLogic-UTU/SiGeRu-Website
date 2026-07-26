const root = document.documentElement;
const savedTheme = localStorage.getItem('sigeru-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches
  ? 'light'
  : 'dark';

root.dataset.theme = savedTheme || preferredTheme;

function updateThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isLight = root.dataset.theme === 'light';
    button.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i><span>${isLight ? 'Oscuro' : 'Claro'}</span>`;
    button.setAttribute('aria-label', isLight ? 'Activar modo oscuro' : 'Activar modo claro');
  });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('sigeru-theme', root.dataset.theme);
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

const perfilActivo = sessionStorage.getItem('sigeruPerfil');
const sesionAutenticada = sessionStorage.getItem('sigeruAutenticado') === 'true';

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

const perfilNecesario = perfilesPorPagina[paginaActual] || '';

if (
  perfilNecesario &&
  (!sesionAutenticada || perfilActivo !== perfilNecesario)
) {
  alert('Debés iniciar sesión con el usuario correspondiente para ingresar.');

  window.location.replace('../landing-page/login.html');
}

const perfilTexto = document.getElementById('perfilActivo');

if (perfilTexto && perfilActivo) {
  perfilTexto.textContent = perfilActivo;
}


const reporteForm = document.getElementById('reporteForm');

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

const reportePermitido = document.getElementById('reportePermitido');
const reporteBloqueado = document.getElementById('reporteBloqueado');

if (reportePermitido && reporteBloqueado) {
  const esVecino = perfilActivo === 'vecino';

  reportePermitido.style.display = esVecino ? 'block' : 'none';
  reporteBloqueado.style.display = esVecino ? 'none' : 'block';
}

document.querySelectorAll('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const mensajeId = form.dataset.message;
    const mensaje = document.getElementById(mensajeId);

    showMessage(
      mensaje,
      'La información fue procesada correctamente en la demostración local.'
    );

    form.reset();
  });
});

document.querySelectorAll('[data-logout]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    sessionStorage.removeItem('sigeruPerfil');
    sessionStorage.removeItem('sigeruAutenticado');
    sessionStorage.removeItem('sigeruNombre');
    sessionStorage.removeItem('sigeruEmail');

    window.location.replace('../landing-page/login.html');
  });
});

if (paginaActual === 'chofer.html') {
  const nombreChofer = sessionStorage.getItem('sigeruNombre') || '';
  let camion = null;

  try {
    const camiones = JSON.parse(localStorage.getItem('sigeru-camiones-v2') || '[]');
    if (nombreChofer) {
      camion = camiones.find((item) =>
        String(item.chofer || '').toLowerCase() === nombreChofer.toLowerCase()
      ) || null;
    }
  } catch (_) {
    camion = null;
  }

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  if (camion) {
    setText('choferCamionResumen', camion.matricula || 'Camión asignado');
    setText('choferCamionTexto', `${camion.marca || ''} ${camion.modelo || ''}`.trim());
    setText('choferEstadoResumen', camion.estado || 'Activo');
    setText('choferRutaResumen', camion.ruta || 'Sin ruta asignada');
    setText('choferTurnoResumen', camion.turno || 'Sin turno');
    setText('choferVehiculo', `${camion.matricula} · ${camion.marca} ${camion.modelo}`);
    setText('choferRuta', camion.ruta || 'Sin ruta asignada');
    setText('choferEstado', `${camion.estado || 'Sin estado'} · ${camion.gps || 'Sin ubicación'}`);
  }
}
