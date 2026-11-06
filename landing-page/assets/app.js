const API_USUARIOS = 'http://127.0.0.1:8000';

const root = document.documentElement;

const preferredTheme = window.matchMedia(
  '(prefers-color-scheme: light)'
).matches
  ? 'light'
  : 'dark';

root.dataset.theme = preferredTheme;


function updateThemeButtons() {
  document
    .querySelectorAll('[data-theme-toggle]')
    .forEach((button) => {
      const isLight =
        root.dataset.theme === 'light';

      button.innerHTML = `
        <i
          class="bi ${isLight ? 'bi-moon' : 'bi-sun'}"
          aria-hidden="true"
        ></i>
        <span>
          ${isLight ? 'Oscuro' : 'Claro'}
        </span>
      `;

      button.setAttribute(
        'aria-label',
        isLight
          ? 'Activar modo oscuro'
          : 'Activar modo claro'
      );
    });
}


updateThemeButtons();


document
  .querySelectorAll('[data-theme-toggle]')
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        root.dataset.theme =
          root.dataset.theme === 'light'
            ? 'dark'
            : 'light';

        updateThemeButtons();
      }
    );
  });


function showMessage(
  element,
  text,
  error = false
) {
  if (!element) {
    return;
  }

  const content =
    String(text || '').trim();

  element.textContent =
    content;

  element.hidden =
    content === '';

  element.style.display =
    content
      ? 'block'
      : 'none';

  element.classList.toggle(
    'error',
    error
  );
}


function captchaCompleted(form) {
  const local =
    form.querySelector(
      '[name="captchaLocal"]'
    );

  if (local) {
    return local.checked;
  }

  const google =
    form.querySelector(
      '.g-recaptcha'
    );

  return (
    !google ||
    (
      typeof grecaptcha !==
        'undefined' &&
      grecaptcha
        .getResponse()
        .length > 0
    )
  );
}


// Funciones para leer, guardar y eliminar el token JWT en localStorage.
const TOKEN_KEY = 'access_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(accessToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(
  path,
  method = 'GET',
  body = null
) {
  const headers = {
    Accept:
      'application/json'
  };

  // Si existe un token JWT guardado, se envía en el header Authorization: Bearer
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body !== null) {
    headers['Content-Type'] =
      'application/json';
  }

  const options = {
    method,
    headers
  };

  if (body !== null) {
    options.body =
      JSON.stringify(body);
  }

  const response =
    await fetch(
      `${API_USUARIOS}${path}`,
      options
    );

  // Si la API responde 401 en una ruta autenticada, se limpia el token vencido o inválido
  if (response.status === 401 && path !== '/api/login') {
    removeToken();
  }

  let result;

  try {
    result =
      await response.json();
  } catch {
    result = {
      success: false,
      message:
        'La API devolvió una respuesta inválida.'
    };
  }

  return {
    response,
    result
  };
}


function getApiError(
  result,
  fallback
) {
  if (
    result?.errors &&
    typeof result.errors ===
      'object'
  ) {
    const errors =
      Object.values(
        result.errors
      )
        .flat()
        .filter(
          value =>
            typeof value ===
            'string'
        );

    if (errors.length) {
      return errors[0];
    }
  }

  return (
    result?.message ||
    fallback
  );
}


function redirectByRole(role) {
  const rol =
    String(role || '')
      .trim()
      .toLowerCase();

  const pages = {
    administrador:
      '../frontend-gestion/administrador.html',

    supervisor:
      '../frontend-gestion/administrador.html',

    vecino:
      '../frontend-usuarios/vecino.html',

    cuadrilla:
      '../frontend-usuarios/cuadrilla.html',

    operario:
      '../frontend-usuarios/operario.html',

    chofer:
      '../frontend-usuarios/chofer.html'
  };

  if (!pages[rol]) {
    return false;
  }

  window.location.href =
    pages[rol];

  return true;
}

const loginForm =
  document.getElementById(
    'loginForm'
  );

if (loginForm) {
  loginForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'loginMensaje'
        );

      if (
        !captchaCompleted(
          loginForm
        )
      ) {
        showMessage(
          message,
          'Confirmá el reCAPTCHA antes de ingresar.',
          true
        );

        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            loginForm
          ).entries()
        );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/login',
            'POST',
            {
              usuario:
                data.usuario,

              password:
                data.password
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'Usuario o contraseña incorrectos.'
            ),
            true
          );

          return;
        }

        // Guardamos el JWT recibido desde Laravel en localStorage
        if (result.data?.access_token) {
          saveToken(result.data.access_token);
        }

        if (
          !redirectByRole(
            result.rol
          )
        ) {
          showMessage(
            message,
            'El usuario no tiene una interfaz asignada.',
            true
          );
        }

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const registroForm =
  document.getElementById(
    'registroForm'
  );

if (registroForm) {
  registroForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'registroMensaje'
        );

      const data =
        Object.fromEntries(
          new FormData(
            registroForm
          ).entries()
        );

      // Validaciones estrictas de formato y seguridad
      const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/u;
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const motivoRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,¿?¡!\-]+$/u;

      const nombre = String(data.nombre || '').trim();
      const apellido = String(data.apellido || '').trim();
      const email = String(data.email || '').trim();
      const motivo = String(data.motivo || '').trim();

      if (!nombreRegex.test(nombre)) {
        showMessage(message, 'El nombre solo puede contener letras y espacios (sin números ni símbolos).', true);
        return;
      }

      if (!nombreRegex.test(apellido)) {
        showMessage(message, 'El apellido solo puede contener letras y espacios (sin números ni símbolos).', true);
        return;
      }

      if (!emailRegex.test(email)) {
        showMessage(message, 'El correo electrónico debe tener un dominio válido (ej: nombre@dominio.com o nombre@dominio.uy), no se admiten números después del punto de extensión.', true);
        return;
      }

      if (!motivoRegex.test(motivo)) {
        showMessage(message, 'El motivo solo puede contener texto explicativo (sin números, comandos ni caracteres especiales).', true);
        return;
      }

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/registro',
            'POST',
            data
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo registrar la solicitud.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'Solicitud registrada correctamente.'
        );

        registroForm.reset();

        updateLicenseField();

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const recuperacionForm =
  document.getElementById(
    'recuperacionForm'
  );

if (recuperacionForm) {
  recuperacionForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'recuperacionMensaje'
        );

      if (
        !captchaCompleted(
          recuperacionForm
        )
      ) {
        showMessage(
          message,
          'Confirmá la verificación de seguridad para continuar.',
          true
        );

        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            recuperacionForm
          ).entries()
        );

      const email =
        String(
          data.email || ''
        )
          .trim()
          .toLowerCase();

      if (!email) {
        showMessage(
          message,
          'Ingresá tu correo electrónico.',
          true
        );

        return;
      }

      showMessage(
        message,
        'Procesando solicitud...'
      );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/recuperar-password',
            'POST',
            {
              email
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo solicitar la recuperación de contraseña.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'
        );

        recuperacionForm.reset();

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const restablecerForm =
  document.getElementById(
    'restablecerForm'
  );

if (restablecerForm) {
  const message =
    document.getElementById(
      'restablecerMensaje'
    );

  const params =
    new URLSearchParams(
      window.location.search
    );

  const token =
    params.get('token');

  const submitButton =
    restablecerForm.querySelector(
      'button[type="submit"]'
    );

  if (!token) {
    showMessage(
      message,
      'El enlace de recuperación no es válido.',
      true
    );

    if (submitButton) {
      submitButton.disabled =
        true;
    }
  }

  restablecerForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      if (!token) {
        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            restablecerForm
          ).entries()
        );

      const password =
        String(
          data.password || ''
        );

      const confirmation =
        String(
          data.password_confirmation ||
          ''
        );

      if (
        password.length < 8
      ) {
        showMessage(
          message,
          'La contraseña debe tener al menos 8 caracteres.',
          true
        );

        return;
      }

      if (
        password !==
        confirmation
      ) {
        showMessage(
          message,
          'Las contraseñas no coinciden.',
          true
        );

        return;
      }

      showMessage(
        message,
        'Actualizando contraseña...'
      );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/restablecer-password',
            'POST',
            {
              token,

              password,

              password_confirmation:
                confirmation
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo actualizar la contraseña.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'La contraseña fue actualizada correctamente.'
        );

        restablecerForm.reset();

        if (submitButton) {
          submitButton.disabled =
            true;
        }

        setTimeout(
          () => {
            window.location.href =
              'login.html';
          },
          1800
        );

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const reporteForm =
  document.getElementById(
    'reporteForm'
  );

if (reporteForm) {
  reporteForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      showMessage(
        document.getElementById(
          'reporteMensaje'
        ),
        'Reporte enviado y pendiente de revisión.'
      );

      reporteForm.reset();
    }
  );
}

const contactoForm =
  document.getElementById(
    'contactoForm'
  );

if (contactoForm) {
  contactoForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      showMessage(
        document.getElementById(
          'contactoMensaje'
        ),
        'Consulta preparada correctamente.'
      );

      contactoForm.reset();
    }
  );
}

const protectedReport =
  document.querySelector(
    '[data-protected-report]'
  );

if (protectedReport) {
  const allowed =
    document.getElementById(
      'reportePermitido'
    );

  const blocked =
    document.getElementById(
      'reporteBloqueado'
    );

  apiRequest(
    '/api/session'
  )
    .then(
      ({
        response,
        result
      }) => {
        const permitted =
          response.ok &&
          result.success &&
          result.usuario?.rol ===
            'vecino';

        if (
          allowed &&
          blocked
        ) {
          allowed.style.display =
            permitted
              ? 'block'
              : 'none';

          blocked.style.display =
            permitted
              ? 'none'
              : 'block';
        }
      }
    )
    .catch(() => {
      if (
        allowed &&
        blocked
      ) {
        allowed.style.display =
          'none';

        blocked.style.display =
          'block';
      }
    });
}

document
  .querySelectorAll(
    '[data-logout]'
  )
  .forEach((link) => {
    link.addEventListener(
      'click',
      async (event) => {
        event.preventDefault();

        const destination =
          link.getAttribute(
            'href'
          ) ||
          '../landing-page/index.html';

        try {
          await apiRequest(
            '/api/logout',
            'POST'
          );

        } finally {
          // Al cerrar sesión se elimina el token JWT guardado en el navegador
          removeToken();
          window.location.href =
            destination;
        }
      }
    );
  });

document
  .querySelectorAll(
    '[data-password-toggle]'
  )
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const input =
          document.getElementById(
            button.dataset
              .passwordToggle
          );

        const icon =
          button.querySelector(
            'i'
          );

        if (!input) {
          return;
        }

        const showing =
          input.type ===
          'text';

        input.type =
          showing
            ? 'password'
            : 'text';

        button.setAttribute(
          'aria-label',
          showing
            ? 'Mostrar contraseña'
            : 'Ocultar contraseña'
        );

        if (icon) {
          icon.classList.toggle(
            'bi-eye',
            showing
          );

          icon.classList.toggle(
            'bi-eye-slash',
            !showing
          );
        }
      }
    );
  });

const perfilSolicitud =
  document.getElementById(
    'perfilSolicitud'
  );

const licenciaField =
  document.getElementById(
    'licenciaField'
  );

const licenciaInput =
  document.getElementById(
    'licenciaInput'
  );


function updateLicenseField() {
  if (
    !perfilSolicitud ||
    !licenciaField ||
    !licenciaInput
  ) {
    return;
  }

  const isDriver =
    perfilSolicitud.value ===
    'chofer';

  licenciaField.classList.toggle(
    'd-none',
    !isDriver
  );

  licenciaInput.required =
    isDriver;

  if (!isDriver) {
    licenciaInput.value =
      '';
  }
}


perfilSolicitud?.addEventListener(
  'change',
  updateLicenseField
);


updateLicenseField();


/* ==========================================================================
   MAPA INTERACTIVO EN LANDING PAGE (CARGA BAJO DEMANDA)
   ========================================================================== */

// Referencias a los botones y al contenedor del mapa en el HTML
const btnToggleLandingMap = document.getElementById('btnToggleLandingMap');
const landingMapCollapse = document.getElementById('landingMapCollapse');
const btnFullscreenLandingMap = document.getElementById('btnFullscreenLandingMap');

// Guardamos la instancia de Leaflet para crearla solo una vez cuando el usuario abra el mapa
let landingMapInstance = null;
let capaContenedoresLanding = null;

// Devuelve el color según los días sin recolección (escala de 5 colores)
function colorContenedorLanding(dias) {
  const cantidad = Number(dias || 1);
  if (cantidad <= 2) return '#22c55e'; // Verde
  if (cantidad === 3) return '#eab308'; // Amarillo
  if (cantidad === 4) return '#f97316'; // Naranja
  if (cantidad === 5) return '#ef4444'; // Rojo
  return '#18181b'; // Negro (6 o más días)
}

// Carga los contenedores desde la API de Gestión y los dibuja en el mapa público
async function cargarContenedoresLanding() {
  if (!capaContenedoresLanding) return;

  const statusText = document.getElementById('landingMapStatus');
  let lista = [];

  try {
    const respuesta = await fetch('http://127.0.0.1:8001/api/mapa/contenedores');
    const json = await respuesta.json();
    if (Array.isArray(json?.data) && json.data.length > 0) {
      lista = json.data;
    }
  } catch (error) {
    console.warn('API no disponible, utilizando datos de demostración.', error);
  }

  if (!lista || lista.length === 0) {
    lista = [
      { codigo: 'CH-102-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_102', latitud: -34.8995, longitud: -56.1360, dias_sin_recoleccion: 4 },
      { codigo: 'CH-102-02', tipo: 'Plástico', capacidad: 2400, estado: 'funcional', circuito: 'CH_102', latitud: -34.8980, longitud: -56.1345, dias_sin_recoleccion: 3 },
      { codigo: 'CH-102-03', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_102', latitud: -34.8965, longitud: -56.1330, dias_sin_recoleccion: 4 },
      { codigo: 'CH-107-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_107', latitud: -34.9030, longitud: -56.1370, dias_sin_recoleccion: 5 },
      { codigo: 'CH-107-02', tipo: 'Vidrio', capacidad: 2400, estado: 'funcional', circuito: 'CH_107', latitud: -34.9050, longitud: -56.1365, dias_sin_recoleccion: 4 },
      { codigo: 'CH-107-03', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_107', latitud: -34.9070, longitud: -56.1380, dias_sin_recoleccion: 3 },
      { codigo: 'CH-106-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_106', latitud: -34.9080, longitud: -56.1420, dias_sin_recoleccion: 6 },
      { codigo: 'CH-106-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_106', latitud: -34.9095, longitud: -56.1405, dias_sin_recoleccion: 7 },
      { codigo: 'CH-106-03', tipo: 'Orgánico', capacidad: 2400, estado: 'funcional', circuito: 'CH_106', latitud: -34.9110, longitud: -56.1430, dias_sin_recoleccion: 6 },
      { codigo: 'CH-111-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_111', latitud: -34.9040, longitud: -56.1540, dias_sin_recoleccion: 1 },
      { codigo: 'CH-111-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_111', latitud: -34.9055, longitud: -56.1520, dias_sin_recoleccion: 2 },
      { codigo: 'CH-111-03', tipo: 'Plástico', capacidad: 2400, estado: 'funcional', circuito: 'CH_111', latitud: -34.9025, longitud: -56.1560, dias_sin_recoleccion: 1 },
      { codigo: 'CH-110-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_110', latitud: -34.9005, longitud: -56.1510, dias_sin_recoleccion: 5 },
      { codigo: 'CH-110-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_110', latitud: -34.8990, longitud: -56.1490, dias_sin_recoleccion: 5 },
      { codigo: 'CH-108-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_108', latitud: -34.8985, longitud: -56.1460, dias_sin_recoleccion: 6 },
      { codigo: 'CH-108-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_108', latitud: -34.9010, longitud: -56.1445, dias_sin_recoleccion: 7 },
      { codigo: 'CH-109-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_109', latitud: -34.8930, longitud: -56.1450, dias_sin_recoleccion: 6 },
      { codigo: 'CH-109-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'CH_109', latitud: -34.8915, longitud: -56.1470, dias_sin_recoleccion: 6 },
      { codigo: 'E-101-01', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'E_101', latitud: -34.8950, longitud: -56.1260, dias_sin_recoleccion: 5 },
      { codigo: 'E-101-02', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'E_101', latitud: -34.8965, longitud: -56.1240, dias_sin_recoleccion: 5 },
      { codigo: 'E-101-03', tipo: 'Mixto', capacidad: 3200, estado: 'funcional', circuito: 'E_101', latitud: -34.8980, longitud: -56.1225, dias_sin_recoleccion: 5 }
    ];
  }

  capaContenedoresLanding.clearLayers();
  let dibujados = 0;

  lista.forEach(item => {
    if (item.latitud === null || item.longitud === null) return;

    const color = colorContenedorLanding(item.dias_sin_recoleccion);
    const estadoTexto = item.estado === 'funcional' ? 'Funcionando' : item.estado;

    const punto = window.L.circleMarker([Number(item.latitud), Number(item.longitud)], {
      radius: 8,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.95
    });

    punto.bindPopup(
      '<div style="font-family: inherit; font-size: 13px; color: #1e293b;">' +
      '<strong style="color: #0f172a; font-size: 14px;">Contenedor ' + item.codigo + '</strong><br>' +
      '<strong>Tipo:</strong> ' + item.tipo + '<br>' +
      '<strong>Capacidad:</strong> ' + item.capacidad + ' L<br>' +
      '<strong>Estado:</strong> ' + estadoTexto + '<br>' +
      '<strong>Circuito:</strong> ' + item.circuito + '<br>' +
      '<strong style="color: ' + (color === '#101010' ? '#ef4444' : color) + ';">Días sin recolección:</strong> ' + item.dias_sin_recoleccion +
      '</div>'
    );

    punto.addTo(capaContenedoresLanding);
    dibujados++;
  });

  if (statusText) {
    statusText.textContent = 'Mostrando ' + dibujados + ' contenedores activos en el mapa. Hacé clic en un punto para ver su detalle.';
  }

  if (dibujados > 0 && capaContenedoresLanding.getBounds().isValid()) {
    landingMapInstance?.fitBounds(capaContenedoresLanding.getBounds(), { padding: [30, 30], maxZoom: 15 });
  }
}

function initLandingMap() {
  // Si el mapa ya fue creado o no está disponible la librería Leaflet, solo recargamos los contenedores
  if (landingMapInstance) {
    cargarContenedoresLanding();
    return;
  }

  if (typeof window.L === 'undefined') {
    return;
  }

  // Creamos el mapa dentro del div #landingMapCanvas centrado en Montevideo
  landingMapInstance = window.L.map('landingMapCanvas').setView([-34.9011, -56.1645], 13);

  // Agregamos la capa visual de calles gratuita de OpenStreetMap
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(landingMapInstance);

  // Capa para dibujar los contenedores y carga inicial desde la API
  capaContenedoresLanding = window.L.layerGroup().addTo(landingMapInstance);
  cargarContenedoresLanding();
}

// Evento para mostrar u ocultar el mapa al presionar el botón principal
btnToggleLandingMap?.addEventListener('click', () => {
  if (!landingMapCollapse) return;

  const isHidden = landingMapCollapse.hasAttribute('hidden');

  if (isHidden) {
    // Mostramos el contenedor del mapa
    landingMapCollapse.removeAttribute('hidden');
    btnToggleLandingMap.setAttribute('aria-expanded', 'true');
    btnToggleLandingMap.innerHTML = '<i aria-hidden="true" class="bi bi-chevron-up"></i> <span>Ocultar mapa</span>';

    // Inicializamos el mapa recién cuando se abre por primera vez para no sobrecargar la página
    initLandingMap();

    // Ajustamos el tamaño del lienzo para que las cuadrículas del mapa se dibujen bien
    setTimeout(() => {
      landingMapInstance?.invalidateSize();
    }, 150);
  } else {
    // Si estaba en pantalla completa, salimos antes de ocultarlo
    landingMapCollapse.classList.remove('is-fullscreen');
    landingMapCollapse.setAttribute('hidden', '');
    btnToggleLandingMap.setAttribute('aria-expanded', 'false');
    btnToggleLandingMap.innerHTML = '<i aria-hidden="true" class="bi bi-arrows-angle-expand"></i> <span>Ampliar mapa interactivo</span>';
  }
});

// Evento para alternar el modo de pantalla completa dentro del mapa
btnFullscreenLandingMap?.addEventListener('click', () => {
  if (!landingMapCollapse) return;

  const isFullscreen = landingMapCollapse.classList.toggle('is-fullscreen');

  if (isFullscreen) {
    btnFullscreenLandingMap.innerHTML = '<i aria-hidden="true" class="bi bi-fullscreen-exit"></i> <span>Salir de pantalla completa</span>';
  } else {
    btnFullscreenLandingMap.innerHTML = '<i aria-hidden="true" class="bi bi-fullscreen"></i> <span>Pantalla completa</span>';
  }

  // Recalculamos el tamaño del mapa al cambiar el contenedor
  setTimeout(() => {
    landingMapInstance?.invalidateSize();
  }, 150);
});
