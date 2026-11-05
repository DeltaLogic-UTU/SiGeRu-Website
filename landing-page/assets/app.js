
const API_USUARIOS = 'http://127.0.0.1:8000';

const root = document.documentElement;

const preferredTheme = window.matchMedia(
  '(prefers-color-scheme: light)'
).matches ? 'light' : 'dark';

root.dataset.theme = preferredTheme;


function updateThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const isLight = root.dataset.theme === 'light';

    button.innerHTML = `
      <i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}"
         aria-hidden="true"></i>
      <span>${isLight ? 'Oscuro' : 'Claro'}</span>
    `;

    button.setAttribute(
      'aria-label',
      isLight ? 'Activar modo oscuro' : 'Activar modo claro'
    );
  });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    root.dataset.theme =
      root.dataset.theme === 'light' ? 'dark' : 'light';

    updateThemeButtons();
  });
});


function showMessage(element, text, error = false) {
  if (!element) return;

  const content = String(text || '').trim();

  element.textContent = content;
  element.hidden = content === '';
  element.style.display = content ? 'block' : 'none';
  element.classList.toggle('error', error);
}

function captchaCompleted(form) {
  const local = form.querySelector('[name="captchaLocal"]');

  if (local) return local.checked;

  const google = form.querySelector('.g-recaptcha');

  return (
    !google ||
    (
      typeof grecaptcha !== 'undefined' &&
      grecaptcha.getResponse().length > 0
    )
  );
}


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

async function apiRequest(path, method = 'GET', body = null) {
  const headers = {
    Accept: 'application/json'
  };

  const token = getToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const options = { method, headers };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    `${API_USUARIOS}${path}`,
    options
  );

  if (response.status === 401 && path !== '/api/login') {
    removeToken();
  }

  let result;

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

function getApiError(result, fallback) {
  if (
    result?.errors &&
    typeof result.errors === 'object'
  ) {
    const errors = Object.values(result.errors)
      .flat()
      .filter(value => typeof value === 'string');

    if (errors.length) return errors[0];
  }

  return result?.message || fallback;
}


function redirectByRole(role) {
  const rol = String(role || '').trim().toLowerCase();

  const pages = {
    administrador: '../frontend-gestion/administrador.html',
    supervisor: '../frontend-gestion/administrador.html',
    vecino: '../frontend-usuarios/vecino.html',
    cuadrilla: '../frontend-usuarios/cuadrilla-usuario.html',
    barrendero: '../frontend-usuarios/cuadrilla-usuario.html',
    operario: '../frontend-usuarios/operario.html',
    chofer: '../frontend-usuarios/chofer.html'
  };

  if (!pages[rol]) return false;

  window.location.href = pages[rol];
  return true;
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const message = document.getElementById('loginMensaje');

    if (!captchaCompleted(loginForm)) {
      showMessage(
        message,
        'Confirmá el reCAPTCHA antes de ingresar.',
        true
      );
      return;
    }

    const data = Object.fromEntries(
      new FormData(loginForm).entries()
    );

    try {
      const { response, result } = await apiRequest(
        '/api/login',
        'POST',
        {
          usuario: data.usuario,
          password: data.password
        }
      );

      if (!response.ok || !result.success) {
        showMessage(
          message,
          getApiError(result, 'Usuario o contraseña incorrectos.'),
          true
        );
        return;
      }

      if (result.data?.access_token) {
        saveToken(result.data.access_token);
      }

      if (!redirectByRole(result.rol)) {
        showMessage(
          message,
          'El usuario no tiene una interfaz asignada.',
          true
        );
      }

    } catch (error) {
      console.error(error);

      showMessage(
        message,
        'No se pudo establecer conexión.',
        true
      );
    }
  });
}


const registroForm = document.getElementById('registroForm');

if (registroForm) {
  registroForm.addEventListener('submit', async event => {
    event.preventDefault();

    const message = document.getElementById('registroMensaje');

    const data = Object.fromEntries(
      new FormData(registroForm).entries()
    );

    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/u;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const motivoRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,¿?¡!\-]+$/u;

    const nombre = String(data.nombre || '').trim();
    const apellido = String(data.apellido || '').trim();
    const email = String(data.email || '').trim();
    const motivo = String(data.motivo || '').trim();

    if (!nombreRegex.test(nombre)) {
      showMessage(
        message,
        'El nombre solo puede contener letras y espacios (sin números ni símbolos).',
        true
      );
      return;
    }

    if (!nombreRegex.test(apellido)) {
      showMessage(
        message,
        'El apellido solo puede contener letras y espacios (sin números ni símbolos).',
        true
      );
      return;
    }

    if (!emailRegex.test(email)) {
      showMessage(
        message,
        'El correo electrónico debe tener un dominio válido (ej: nombre@dominio.com o nombre@dominio.uy), no se admiten números después del punto de extensión.',
        true
      );
      return;
    }

    if (!motivoRegex.test(motivo)) {
      showMessage(
        message,
        'El motivo solo puede contener texto explicativo (sin números, comandos ni caracteres especiales).',
        true
      );
      return;
    }

    try {
      const { response, result } = await apiRequest(
        '/api/registro',
        'POST',
        data
      );

      if (!response.ok || !result.success) {
        showMessage(
          message,
          getApiError(result, 'No se pudo registrar la solicitud.'),
          true
        );
        return;
      }

      showMessage(
        message,
        result.message || 'Solicitud registrada correctamente.'
      );

      registroForm.reset();
      updateLicenseField();

    } catch (error) {
      console.error(error);

      showMessage(
        message,
        'No se pudo conectar con la API de usuarios.',
        true
      );
    }
  });
}


const RECUPERACION_CLAVE = 'sigeru_recuperacion_codigo';

const recuperacionForm =
  document.getElementById('recuperacionForm');

const codigoRecuperacionForm =
  document.getElementById('codigoRecuperacionForm');

const restablecerForm =
  document.getElementById('restablecerForm');


if (recuperacionForm) {
  recuperacionForm.addEventListener('submit', async event => {
    event.preventDefault();

    const mensaje =
      document.getElementById('recuperacionMensaje');

    const boton =
      recuperacionForm.querySelector('button[type="submit"]');

    const email = String(
      new FormData(recuperacionForm).get('email') || ''
    ).trim().toLowerCase();

    if (!captchaCompleted(recuperacionForm)) {
      showMessage(
        mensaje,
        'Confirmá la verificación de seguridad.',
        true
      );
      return;
    }

    if (boton) boton.disabled = true;

    showMessage(mensaje, 'Solicitando código...');

    try {
      const { response, result } = await apiRequest(
        '/api/recuperar-password',
        'POST',
        { email }
      );

      if (!response.ok || !result.success) {
        showMessage(
          mensaje,
          getApiError(result, 'No se pudo solicitar el código.'),
          true
        );
        return;
      }

      showMessage(
        mensaje,
        result.message ||
        'Si el correo está registrado, recibirás un código.'
      );

      const correoCodigo =
        codigoRecuperacionForm?.querySelector('[name="email"]');

      if (correoCodigo) {
        correoCodigo.value = email;
      }

      codigoRecuperacionForm
        ?.querySelector('[name="codigo"]')
        ?.focus();

    } catch (error) {
      console.error('Error solicitando recuperación:', error);

      showMessage(
        mensaje,
        'No se pudo conectar con la API de Usuarios.',
        true
      );

    } finally {
      if (boton) boton.disabled = false;
    }
  });
}


if (codigoRecuperacionForm) {
  codigoRecuperacionForm.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const mensaje =
        document.getElementById('codigoRecuperacionMensaje');

      const boton =
        codigoRecuperacionForm.querySelector('button[type="submit"]');

      const datos = new FormData(codigoRecuperacionForm);

      const email = String(
        datos.get('email') || ''
      ).trim().toLowerCase();

      const codigo = String(
        datos.get('codigo') || ''
      ).trim();

      if (!/^\d{8}$/.test(codigo)) {
        showMessage(
          mensaje,
          'Ingresá los 8 dígitos del código.',
          true
        );
        return;
      }

      if (boton) boton.disabled = true;

      showMessage(mensaje, 'Verificando código...');

      try {
        const { response, result } = await apiRequest(
          '/api/verificar-codigo',
          'POST',
          { email, codigo }
        );

        if (!response.ok || !result.success) {
          showMessage(
            mensaje,
            getApiError(result, 'Código inválido o vencido.'),
            true
          );
          return;
        }

        sessionStorage.setItem(
          RECUPERACION_CLAVE,
          JSON.stringify({ email, codigo })
        );

        window.location.href = 'restablecer-password.html';

      } catch (error) {
        console.error('Error verificando código:', error);

        showMessage(
          mensaje,
          'No se pudo verificar el código.',
          true
        );

      } finally {
        if (boton) boton.disabled = false;
      }
    }
  );
}


if (restablecerForm) {
  const mensaje =
    document.getElementById('restablecerMensaje');

  const boton =
    restablecerForm.querySelector('button[type="submit"]');

  let recuperacion = null;

  try {
    recuperacion = JSON.parse(
      sessionStorage.getItem(RECUPERACION_CLAVE) || 'null'
    );
  } catch {
    recuperacion = null;
  }

  if (
    !recuperacion?.email ||
    !/^\d{8}$/.test(recuperacion?.codigo || '')
  ) {
    showMessage(
      mensaje,
      'Primero ingresá y verificá el código de recuperación.',
      true
    );

    if (boton) boton.disabled = true;

  } else {
    const correo =
      document.getElementById('restablecerCorreo');

    if (correo) {
      correo.textContent = recuperacion.email;
    }
  }

  restablecerForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!recuperacion?.email || !recuperacion?.codigo) {
      return;
    }

    const datos = new FormData(restablecerForm);

    const password = String(
      datos.get('password') || ''
    );

    const password_confirmation = String(
      datos.get('password_confirmation') || ''
    );

    if (password.length < 8) {
      showMessage(
        mensaje,
        'La contraseña debe tener al menos 8 caracteres.',
        true
      );
      return;
    }

    if (password !== password_confirmation) {
      showMessage(
        mensaje,
        'Las contraseñas no coinciden.',
        true
      );
      return;
    }

    if (boton) boton.disabled = true;

    showMessage(mensaje, 'Actualizando contraseña...');

    try {
      const { response, result } = await apiRequest(
        '/api/restablecer-password',
        'POST',
        {
          email: recuperacion.email,
          codigo: recuperacion.codigo,
          password,
          password_confirmation
        }
      );

      if (!response.ok || !result.success) {
        showMessage(
          mensaje,
          getApiError(
            result,
            'No se pudo actualizar la contraseña.'
          ),
          true
        );

        if (boton) boton.disabled = false;
        return;
      }

      sessionStorage.removeItem(RECUPERACION_CLAVE);

      recuperacion = null;

      restablecerForm.reset();

      showMessage(
        mensaje,
        'Contraseña actualizada correctamente. Ya podés iniciar sesión.'
      );

      const enlace =
        document.getElementById('restablecerIrLogin');

      if (enlace) {
        enlace.hidden = false;
      }

    } catch (error) {
      console.error('Error al actualizar contraseña:', error);

      showMessage(
        mensaje,
        'No se pudo conectar con la API de Usuarios.',
        true
      );

      if (boton) boton.disabled = false;
    }
  });
}


const reporteForm = document.getElementById('reporteForm');

if (reporteForm) {
  reporteForm.addEventListener('submit', event => {
    event.preventDefault();

    showMessage(
      document.getElementById('reporteMensaje'),
      'Reporte enviado y pendiente de revisión.'
    );

    reporteForm.reset();
  });
}


const contactoForm = document.getElementById('contactoForm');

if (contactoForm) {
  contactoForm.addEventListener('submit', async event => {
    event.preventDefault();

    const mensaje =
      document.getElementById('contactoMensaje');

    const boton =
      contactoForm.querySelector('button[type="submit"]');

    const textoBoton =
      boton?.innerHTML || 'Enviar consulta';

    const datos = new FormData(contactoForm);

    const consulta = {
      nombre: String(datos.get('nombre') || '').trim(),
      email: String(datos.get('email') || '').trim(),
      asunto: String(datos.get('asunto') || '').trim(),
      mensaje: String(datos.get('mensaje') || '').trim()
    };

    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Enviando...';
    }

    showMessage(mensaje, 'Enviando consulta...');

    try {
      const { response, result } = await apiRequest(
        '/api/consultas',
        'POST',
        consulta
      );

      if (!response.ok || !result.success) {
        showMessage(
          mensaje,
          getApiError(result, 'No se pudo enviar la consulta.'),
          true
        );
        return;
      }

      showMessage(
        mensaje,
        result.message || 'Consulta enviada correctamente.'
      );

      contactoForm.reset();

    } catch (error) {
      console.error('Error al enviar consulta:', error);

      showMessage(
        mensaje,
        'No se pudo conectar con la API de Usuarios.',
        true
      );

    } finally {
      if (boton) {
        boton.disabled = false;
        boton.innerHTML = textoBoton;
      }
    }
  });
}


const protectedReport =
  document.querySelector('[data-protected-report]');

if (protectedReport) {
  const allowed =
    document.getElementById('reportePermitido');

  const blocked =
    document.getElementById('reporteBloqueado');

  apiRequest('/api/session')
    .then(({ response, result }) => {
      const permitted =
        response.ok &&
        result.success &&
        result.usuario?.rol === 'vecino';

      if (allowed && blocked) {
        allowed.style.display = permitted ? 'block' : 'none';
        blocked.style.display = permitted ? 'none' : 'block';
      }
    })
    .catch(() => {
      if (allowed && blocked) {
        allowed.style.display = 'none';
        blocked.style.display = 'block';
      }
    });
}


document.querySelectorAll('[data-logout]').forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();

    const destination =
      link.getAttribute('href') || '../landing-page/index.html';

    try {
      await apiRequest('/api/logout', 'POST');
    } finally {
      removeToken();
      window.location.href = destination;
    }
  });
});


document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(
      button.dataset.passwordToggle
    );

    const icon = button.querySelector('i');

    if (!input) return;

    const showing = input.type === 'text';

    input.type = showing ? 'password' : 'text';

    button.setAttribute(
      'aria-label',
      showing ? 'Mostrar contraseña' : 'Ocultar contraseña'
    );

    if (icon) {
      icon.classList.toggle('bi-eye', showing);
      icon.classList.toggle('bi-eye-slash', !showing);
    }
  });
});


const perfilSolicitud =
  document.getElementById('perfilSolicitud');

const licenciaField =
  document.getElementById('licenciaField');

const licenciaInput =
  document.getElementById('licenciaInput');

function updateLicenseField() {
  if (
    !perfilSolicitud ||
    !licenciaField ||
    !licenciaInput
  ) {
    return;
  }

  const isDriver = perfilSolicitud.value === 'chofer';

  licenciaField.classList.toggle('d-none', !isDriver);

  licenciaInput.required = isDriver;

  if (!isDriver) {
    licenciaInput.value = '';
  }
}

perfilSolicitud?.addEventListener(
  'change',
  updateLicenseField
);

updateLicenseField();


const btnToggleLandingMap =
  document.getElementById('btnToggleLandingMap');

const landingMapCollapse =
  document.getElementById('landingMapCollapse');

const btnFullscreenLandingMap =
  document.getElementById('btnFullscreenLandingMap');

let landingMapInstance = null;
let capaContenedoresLanding = null;

function colorContenedorLanding(dias) {
  const cantidad = Number(dias || 1);

  if (cantidad <= 2) return '#22c55e';
  if (cantidad === 3) return '#eab308';
  if (cantidad === 4) return '#f97316';
  if (cantidad === 5) return '#ef4444';

  return '#18181b';
}

async function cargarContenedoresLanding() {
  if (!capaContenedoresLanding) return;

  const statusText =
    document.getElementById('landingMapStatus');

  try {
    const respuesta = await fetch(
      'http://127.0.0.1:8001/api/mapa/contenedores'
    );

    const json = await respuesta.json();

    const lista = Array.isArray(json?.data)
      ? json.data
      : [];

    capaContenedoresLanding.clearLayers();

    let dibujados = 0;

    lista.forEach(item => {
      if (
        item.latitud === null ||
        item.longitud === null
      ) {
        return;
      }

      const color =
        colorContenedorLanding(item.dias_sin_recoleccion);

      const estadoTexto =
        item.estado === 'funcional'
          ? 'Funcionando'
          : item.estado;

      const punto = window.L.circleMarker(
        [Number(item.latitud), Number(item.longitud)],
        {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.95
        }
      );

      punto.bindPopup(
        `<strong>Contenedor ${item.codigo}</strong><br>` +
        `Tipo: ${item.tipo}<br>` +
        `Capacidad: ${item.capacidad} L<br>` +
        `Estado: ${estadoTexto}<br>` +
        `Circuito: ${item.circuito}<br>` +
        `Días sin recolección: ${item.dias_sin_recoleccion}`
      );

      punto.addTo(capaContenedoresLanding);
      dibujados++;
    });

    if (statusText) {
      statusText.textContent =
        `Mostrando ${dibujados} contenedores activos en el mapa. Hacé clic en un punto para ver su detalle.`;
    }

  } catch (error) {
    console.error(
      'Error al cargar contenedores en la landing page:',
      error
    );

    if (statusText) {
      statusText.textContent =
        'No se pudieron cargar los contenedores desde la API de Gestión.';
    }
  }
}

function initLandingMap() {
  if (landingMapInstance) {
    cargarContenedoresLanding();
    return;
  }

  if (typeof window.L === 'undefined') {
    return;
  }

  landingMapInstance = window.L
    .map('landingMapCanvas')
    .setView([-34.9011, -56.1645], 13);

  window.L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(landingMapInstance);

  capaContenedoresLanding = window.L
    .layerGroup()
    .addTo(landingMapInstance);

  cargarContenedoresLanding();
}

btnToggleLandingMap?.addEventListener('click', () => {
  if (!landingMapCollapse) return;

  const isHidden =
    landingMapCollapse.hasAttribute('hidden');

  if (isHidden) {
    landingMapCollapse.removeAttribute('hidden');

    btnToggleLandingMap.setAttribute(
      'aria-expanded',
      'true'
    );

    btnToggleLandingMap.innerHTML =
      '<i aria-hidden="true" class="bi bi-chevron-up"></i> <span>Ocultar mapa</span>';

    initLandingMap();

    setTimeout(() => {
      landingMapInstance?.invalidateSize();
    }, 150);

  } else {
    landingMapCollapse.classList.remove('is-fullscreen');
    landingMapCollapse.setAttribute('hidden', '');

    btnToggleLandingMap.setAttribute(
      'aria-expanded',
      'false'
    );

    btnToggleLandingMap.innerHTML =
      '<i aria-hidden="true" class="bi bi-arrows-angle-expand"></i> <span>Ampliar mapa interactivo</span>';
  }
});

btnFullscreenLandingMap?.addEventListener('click', () => {
  if (!landingMapCollapse) return;

  const isFullscreen =
    landingMapCollapse.classList.toggle('is-fullscreen');

  if (isFullscreen) {
    btnFullscreenLandingMap.innerHTML =
      '<i aria-hidden="true" class="bi bi-fullscreen-exit"></i> <span>Salir de pantalla completa</span>';
  } else {
    btnFullscreenLandingMap.innerHTML =
      '<i aria-hidden="true" class="bi bi-fullscreen"></i> <span>Pantalla completa</span>';
  }

  setTimeout(() => {
    landingMapInstance?.invalidateSize();
  }, 150);
});


let capaMunicipiosPublicosLanding = null;
let capaCamionesPublicosLanding = null;

let municipiosCargadosLanding = false;
let municipiosCargandoLanding = false;
let gpsCargandoLanding = false;
let intervaloGpsLanding = null;

let resumenMunicipiosLanding = 'Municipios: pendientes';
let resumenCamionesLanding = 'Camiones: pendientes';

function mostrarResumenCapasLanding() {
  const etiqueta = document.getElementById(
    'landingMapLayersStatus'
  );

  if (etiqueta) {
    etiqueta.textContent =
      `${resumenMunicipiosLanding} · ${resumenCamionesLanding}`;
  }
}

function prepararCapasExtraLanding() {
  if (
    !landingMapInstance ||
    capaMunicipiosPublicosLanding
  ) {
    return;
  }

  landingMapInstance.createPane(
    'municipiosPublicosLanding'
  );

  landingMapInstance
    .getPane('municipiosPublicosLanding')
    .style.zIndex = 350;

  capaMunicipiosPublicosLanding = window.L
    .layerGroup()
    .addTo(landingMapInstance);

  capaCamionesPublicosLanding = window.L
    .layerGroup()
    .addTo(landingMapInstance);

  window.L.control.layers(
    null,
    {
      'Contenedores': capaContenedoresLanding,
      'Municipios delimitados': capaMunicipiosPublicosLanding,
      'Camiones en recorrido': capaCamionesPublicosLanding
    },
    {
      collapsed: true
    }
  ).addTo(landingMapInstance);
}


async function cargarMunicipiosPublicosLanding() {
  if (
    !capaMunicipiosPublicosLanding ||
    municipiosCargadosLanding ||
    municipiosCargandoLanding
  ) {
    return;
  }

  municipiosCargandoLanding = true;

  try {
    if (typeof window.proj4 !== 'function') {
      throw new Error('No se cargó Proj4.');
    }

    const respuesta = await fetch(
      '../municipios/sig_municipios.json'
    );

    if (!respuesta.ok) {
      throw new Error(
        `Error al cargar municipios: ${respuesta.status}`
      );
    }

    const json = await respuesta.json();

    if (
      !Array.isArray(json.geometries) ||
      json.geometries.length !== 8
    ) {
      throw new Error(
        'No se encontraron los ocho municipios.'
      );
    }

    const municipiosConfig = [
      { codigo: 'A', color: '#ef4444' },
      { codigo: 'B', color: '#3b82f6' },
      { codigo: 'C', color: '#a855f7' },
      { codigo: 'CH', color: '#06b6d4' },
      { codigo: 'D', color: '#22c55e' },
      { codigo: 'E', color: '#f97316' },
      { codigo: 'F', color: '#eab308' },
      { codigo: 'G', color: '#ec4899' }
    ];

    const origen =
      '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';

    const features = json.geometries.map(
      (geometria, indice) => {
        const municipio = municipiosConfig[indice];

        return {
          type: 'Feature',

          properties: {
            codigo: municipio.codigo,
            nombre: `Municipio ${municipio.codigo}`,
            color: municipio.color
          },

          geometry: {
            type: 'Polygon',

            coordinates: geometria.coordinates.map(
              anillo => anillo.map(
                punto => window.proj4(
                  origen,
                  'EPSG:4326',
                  punto
                )
              )
            )
          }
        };
      }
    );

    const municipios = window.L.geoJSON(
      {
        type: 'FeatureCollection',
        features
      },
      {
        pane: 'municipiosPublicosLanding',

        renderer: window.L.canvas({
          pane: 'municipiosPublicosLanding'
        }),

        smoothFactor: 1.5,

        style: feature => ({
          color: feature.properties.color,
          weight: 2.5,
          opacity: 0.95,
          fillColor: feature.properties.color,
          fillOpacity: 0.26
        }),

        onEachFeature(feature, layer) {
          const nombre = feature.properties.nombre;

          layer.bindPopup(
            `<strong>${nombre}</strong>`
          );

          layer.bindTooltip(nombre, {
            sticky: true,
            direction: 'top'
          });

          layer.on('mouseover', () => {
            layer.setStyle({
              weight: 3.5,
              fillOpacity: 0.38
            });
          });

          layer.on('mouseout', () => {
            layer.setStyle({
              weight: 2.5,
              fillOpacity: 0.26
            });
          });
        }
      }
    );

    municipios.addTo(capaMunicipiosPublicosLanding);

    municipiosCargadosLanding = true;
    resumenMunicipiosLanding = '8 municipios delimitados';

  } catch (error) {
    console.error(
      'Error al cargar municipios:',
      error
    );

    resumenMunicipiosLanding =
      'Municipios no disponibles';

  } finally {
    municipiosCargandoLanding = false;
    mostrarResumenCapasLanding();
  }
}


async function cargarCamionesPublicosLanding() {
  if (
    !capaCamionesPublicosLanding ||
    gpsCargandoLanding
  ) {
    return;
  }

  gpsCargandoLanding = true;

  try {
    const respuesta = await fetch(
      'http://127.0.0.1:8001/api/mapa/camiones',
      {
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!respuesta.ok) {
      throw new Error(
        `Error HTTP ${respuesta.status}`
      );
    }

    const json = await respuesta.json();

    if (!Array.isArray(json.data)) {
      throw new Error(
        'Formato de camiones inválido.'
      );
    }

    capaCamionesPublicosLanding.clearLayers();

    let total = 0;

    json.data.forEach(camion => {
      if (
        camion.latitud == null ||
        camion.longitud == null
      ) {
        return;
      }

      const latitud = Number(camion.latitud);
      const longitud = Number(camion.longitud);

      if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        Math.abs(latitud) > 90 ||
        Math.abs(longitud) > 180 ||
        (latitud === 0 && longitud === 0)
      ) {
        return;
      }

      const icono = window.L.divIcon({
        className: '',

        html: `
          <span class="truck-gps-marker">
            <i class="bi bi-truck" aria-hidden="true"></i>
            En recorrido
          </span>
        `,

        iconSize: [104, 30],
        iconAnchor: [52, 15],
        popupAnchor: [0, -15]
      });

      window.L.marker(
        [latitud, longitud],
        { icon: icono }
      )
        .bindPopup(
          '<strong>Camión en recorrido</strong>' +
          '<br>Última posición GPS recibida.'
        )
        .addTo(capaCamionesPublicosLanding);

      total++;
    });

    resumenCamionesLanding = total === 0
      ? 'Sin camiones con GPS en recorrido'
      : `${total} camión${total === 1 ? '' : 'es'} con GPS en recorrido`;

  } catch (error) {
    console.error(
      'Error al cargar GPS de camiones:',
      error
    );

    resumenCamionesLanding =
      'GPS de camiones no disponible';

  } finally {
    gpsCargandoLanding = false;
    mostrarResumenCapasLanding();
  }
}


btnToggleLandingMap?.addEventListener('click', () => {
  if (
    !landingMapInstance ||
    landingMapCollapse?.hasAttribute('hidden')
  ) {
    if (intervaloGpsLanding) {
      clearInterval(intervaloGpsLanding);
      intervaloGpsLanding = null;
    }

    return;
  }

  prepararCapasExtraLanding();
  cargarMunicipiosPublicosLanding();
  cargarCamionesPublicosLanding();

  if (!intervaloGpsLanding) {
    intervaloGpsLanding = window.setInterval(() => {
      if (!landingMapCollapse?.hasAttribute('hidden')) {
        cargarCamionesPublicosLanding();
      }
    }, 20000);
  }
});
