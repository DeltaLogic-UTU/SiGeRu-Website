const API_SESION_USUARIOS = 'http://127.0.0.1:8000';
const API_GESTION = 'http://127.0.0.1:8001';
const API_RECOLECCION = 'http://127.0.0.1:8002';

const COORD_BASE_BUCEO = [-34.899286, -56.129414];
const COORD_VERTEDERO = [-34.851019, -56.099007];

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

    button.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i>`;
    button.setAttribute(
      'aria-label',
      isLight ? 'Activar modo oscuro' : 'Activar modo claro'
    );
  });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme =
      root.dataset.theme === 'light' ? 'dark' : 'light';

    localStorage.setItem('sigeru-theme', root.dataset.theme);
    updateThemeButtons();
  });
});

function showMessage(element, text, isError = false) {
  if (!element) return;

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
    result = { success: false };
  }

  return { response, result };
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
  'cuadrilla-usuario.html': 'cuadrilla',
  'cuadrilla-en-curso.html': 'cuadrilla',
  'operario.html': 'operario',
  'chofer.html': 'chofer'
};

async function protegerPagina() {
  const perfilNecesario =
    perfilesPorPagina[paginaActual] || '';

  if (!perfilNecesario) return null;

  try {
    const { response, result } = await obtenerSesion();

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

    const perfilActivo = String(result.usuario.rol || '')
      .trim()
      .toLowerCase();

    const accesoCuadrilla =
      ['cuadrilla.html', 'cuadrilla-usuario.html', 'cuadrilla-en-curso.html'].includes(paginaActual) &&
      ['cuadrilla', 'barrendero'].includes(perfilActivo);

    if (perfilActivo !== perfilNecesario && !accesoCuadrilla) {
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
      const esVecino = perfilActivo === 'vecino';

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


const reporteForm = document.getElementById('reporteForm');

if (reporteForm) {
  reporteForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mensaje = document.getElementById('reporteMensaje');
    const boton = reporteForm.querySelector('button[type="submit"]');

    if (boton?.disabled) return;

    const token = getToken();

    if (!token) {
      window.location.replace(
        '../landing-page/login.html'
      );
      return;
    }

    const datos = new FormData(reporteForm);
    const idContenedor = Number(datos.get('id_contenedor'));

    if (
      !Number.isInteger(idContenedor) ||
      idContenedor <= 0
    ) {
      showMessage(
        mensaje,
        'Seleccioná un contenedor en el mapa antes de enviar el reporte.',
        true
      );

      return;
    }
    const tipo = String(datos.get('tipo') || '').trim();

    const categorias = {
      'Contenedor desbordado': 'Contenedores',
      'Contenedor roto': 'Contenedores',
      'Contenedor incendiado': 'Contenedores',
      'Residuos fuera de lugar': 'Residuos',
      'Demora en la recolección': 'Recolección',
      'Riesgo sanitario / contaminación biológica':
        'Riesgo sanitario'
    };

    const categoria = categorias[tipo];

    if (!categoria) {
      showMessage(
        mensaje,
        'El tipo de problema seleccionado no es válido.',
        true
      );
      return;
    }

    datos.set('categoria', categoria);

    const barrio = String(
      datos.get('barrio') || datos.get('zona') || ''
    ).trim();

    const calle = String(datos.get('calle') || '').trim();
    const altura = String(datos.get('altura') || '').trim();

    const referenciaIngresada = String(
      datos.get('referencia') || ''
    ).trim();

    datos.set('zona', barrio);

    const partesReferencia = [
      calle,
      altura ? `N.º ${altura}` : '',
      referenciaIngresada
    ].filter(Boolean);

    datos.set('referencia', partesReferencia.join(' - '));

    datos.delete('barrio');
    datos.delete('calle');
    datos.delete('altura');

    const foto = datos.get('foto');

    if (foto instanceof File && foto.size === 0) {
      datos.delete('foto');
    }

    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Enviando reporte...';
    }

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
      console.error('Error enviando reporte:', error);

      showMessage(
        mensaje,
        error.message || 'No se pudo enviar el reporte.',
        true
      );

    } finally {
      if (boton) {
        boton.disabled = false;
        boton.textContent = 'Enviar reporte';
      }
    }
  });
}

document.querySelectorAll('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const mensajeId = form.dataset.message;
    const mensaje = document.getElementById(mensajeId);

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


const POLIGONO_BASE_BUCEO = [
  [-34.897954, -56.130250],
  [-34.898171, -56.130496],
  [-34.899286, -56.129639],
  [-34.899260, -56.129350],
  [-34.899164, -56.129243]
];

const POLIGONO_VERTEDERO = [
  [-34.847870, -56.092277],
  [-34.851322, -56.088201],
  [-34.855055, -56.094767],
  [-34.855688, -56.095925],
  [-34.857168, -56.100346],
  [-34.857238, -56.103350],
  [-34.852906, -56.101719],
  [-34.851005, -56.099015]
];

const COLORES_MUNICIPIOS = [
  '#f6483b',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#6366f1'
];

const LETRAS_MUNICIPIOS = [
  'A', 'B', 'C', 'CH', 'D', 'E', 'F', 'G'
];

let mapaChofer = null;
let marcadorCamionChofer = null;
let capaCircuitosChofer = null;
let capaRutaChofer = null;
let capaContenedoresChofer = null;
let marcadoresContenedoresChofer = {};

let datosChoferActual = {
  usuario: null,
  camion: null,
  idRecoleccion: null,
  circuitosAsignados: [],
  contenedores: [],
  geometriaCalles: [],
  distanciaTotalKm: 0,
  kmRecorridos: 0,
  levantados: 0,
  incidencias: 0,
  pesoRecolectadoKg: 0,
  contenedorEnParada: null
};


async function peticionRecoleccion(ruta, opciones = {}) {
  const token = getToken();
  if (!token) throw new Error('No hay una sesión activa.');
  const metodo = (opciones.method || 'GET').toUpperCase();

  const config = {
    method: metodo,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...(opciones.body !== undefined
      ? { body: JSON.stringify(opciones.body) }
      : {})
  };

  const consultar = async base => {
    const response = await fetch(`${base}${ruta}`, config);
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && data.success !== false,
      status: response.status,
      data
    };
  };

  if (metodo !== 'GET' || ruta.startsWith('/api/chofer/')) {
    return consultar(API_GESTION);
  }

  try {
    const principal = await consultar(API_GESTION);
    if (![404, 405, 502, 503].includes(principal.status)) return principal;
  } catch (error) {
    console.warn('Lectura en Gestión no disponible:', error);
  }

  return consultar(API_RECOLECCION);
}

async function registrarIncidenciaCamion(event) {
  event.preventDefault();

  const form = document.getElementById('formIncidenciaCamion');
  const boton = form?.querySelector('button[type="submit"]');
  const mensaje = document.getElementById('mensajeIncidenciaCamion');

  if (!form || !boton || boton.disabled) return;

  const mostrar = (texto, error = false) => {
    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.className = error
      ? 'alert alert-danger mt-2'
      : 'alert alert-success mt-2';

    mensaje.style.display = 'block';
  };

  const token = getToken();
  const idCamion = Number(datosChoferActual.camion?.id_camion);

  if (!token) {
    mostrar('Tenés que iniciar sesión nuevamente.', true);
    return;
  }

  if (!Number.isInteger(idCamion) || idCamion <= 0) {
    mostrar('No se encontró un camión asignado.', true);
    return;
  }

  const datos = new FormData(form);

  datos.set('tipo_recurso', 'camion');
  datos.set('id_camion', String(idCamion));

  const foto = datos.get('foto');

  if (foto instanceof File) {
    if (foto.size === 0) {
      datos.delete('foto');
    } else if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) ||
      foto.size > 5 * 1024 * 1024
    ) {
      mostrar(
        'La foto debe ser JPG, PNG o WEBP y pesar hasta 5 MB.',
        true
      );
      return;
    }
  }

  boton.disabled = true;
  boton.textContent = 'Guardando incidencia...';

  if (mensaje) {
    mensaje.className = 'alert d-none';
    mensaje.style.display = 'none';
  }

  try {
    const response = await fetch(
      `${API_GESTION}/api/incidencias`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: datos
      }
    );

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok || resultado.success !== true) {
      const errores = resultado.errors
        ? Object.values(resultado.errors).flat().join(' ')
        : '';

      throw new Error(
        errores ||
        resultado.message ||
        `Error HTTP ${response.status}`
      );
    }

    mostrar('Incidencia registrada correctamente en Gestión.');
    form.reset();

    datosChoferActual.incidencias += 1;
    actualizarTableroChofer();

  } catch (error) {
    console.error('Error registrando incidencia del camión:', error);

    mostrar(
      error.message || 'No se pudo conectar con Gestión.',
      true
    );

  } finally {
    boton.disabled = false;
    boton.textContent = 'Registrar incidencia';
  }
}

document.getElementById('formIncidenciaCamion')
  ?.addEventListener('submit', registrarIncidenciaCamion);


let intervaloRelojChofer = null;

function iniciarRelojChofer() {
  if (intervaloRelojChofer !== null) return;

  const inputDia = document.getElementById('choferDia');
  const inputHora = document.getElementById('choferHora');

  const actualizar = () => {
    const ahora = new Date();

    const fechaLocal = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0')
    ].join('-');

    if (inputDia) {
      inputDia.value = fechaLocal;
    }

    if (inputHora) {
      inputHora.value = ahora.toTimeString().slice(0, 5);
    }
  };

  actualizar();

  intervaloRelojChofer = setInterval(actualizar, 15000);
}

function setTexto(id, valor) {
  const el = document.getElementById(id);

  if (el) el.textContent = valor;
}

function setInputVal(id, valor) {
  const el = document.getElementById(id);

  if (el) el.value = valor;
}

function estadoCamionChoferVisible(camion) {
  if (camion?.recorrido_activo !== undefined && camion?.recorrido_activo !== null) {
    return camion.recorrido_activo === true ||
      camion.recorrido_activo === 1 || camion.recorrido_activo === '1'
      ? 'En recorrido' : 'En base';
  }
  const estado = String(camion?.estado ?? '').trim().toLowerCase();
  return ['recolectando', 'en recorrido'].includes(estado)
    ? 'En recorrido' : 'En base';
}

function actualizarTableroChofer() {
  const total = datosChoferActual.contenedores.length;

  const procesados = datosChoferActual.contenedores
    .filter(c => c.procesado_en_ruta).length;

  const pendientes = Math.max(0, total - procesados);

  const kmRestantes = Math.max(
    0,
    datosChoferActual.distanciaTotalKm -
    datosChoferActual.kmRecorridos
  );

  setTexto('choferTotalLevantar', String(pendientes));
  setTexto('choferTotalLevantados', String(datosChoferActual.levantados));
  setTexto('choferTotalIncidencias', String(datosChoferActual.incidencias));
  setTexto('choferKmRecorridos', `${datosChoferActual.kmRecorridos.toFixed(1)} km`);
  setTexto('choferKmRestantes', `${kmRestantes.toFixed(1)} km`);

  const c = datosChoferActual.camion;
  const u = datosChoferActual.usuario;

  const nombreChofer =
    c?.chofer_nombre ||
    (u
      ? `${u.nombre || ''} ${u.apellido || ''}`.trim()
      : '—');

  const textoCircuitos =
    datosChoferActual.circuitosAsignados.length
      ? datosChoferActual.circuitosAsignados.join(', ')
      : (c?.ruta_circuito || '—');

  setInputVal(
    'choferDetCamion',
    c
      ? `${c.matricula} (${c.marca || ''} ${c.modelo || ''})`.trim()
      : '—'
  );

  setInputVal('choferDetChofer', nombreChofer || '—');
  setInputVal('choferDetEstado', estadoCamionChoferVisible(c));
  setInputVal('choferDetTurno', c?.turno || 'Nocturno');
  setInputVal('choferDetCircuito', textoCircuitos);
  setInputVal('choferDetAsignados', String(total));
  setInputVal('choferDetLevantados', String(datosChoferActual.levantados));
  setInputVal('choferDetFaltantes', String(pendientes));

  setInputVal(
    'choferDetPeso',
    `${Math.round(datosChoferActual.pesoRecolectadoKg)} kg`
  );

  setInputVal(
    'choferDetCapacidad',
    c?.capacidad_kg
      ? `${Math.round(Number(c.capacidad_kg))} kg`
      : '8000 kg'
  );

  setInputVal('choferDetKm', `${datosChoferActual.kmRecorridos.toFixed(1)} km`);
  setInputVal('choferDetKmRestantes', `${kmRestantes.toFixed(1)} km`);
  setInputVal('choferDetIncidencias', String(datosChoferActual.incidencias));
  setInputVal('choferDetCuadrilla', c?.id_cuadrilla || 'Sin cuadrilla');
}


async function cargarMunicipiosEnMapaChofer() {
  if (
    !mapaChofer ||
    typeof window.L === 'undefined' ||
    typeof window.proj4 === 'undefined'
  ) {
    return;
  }

  try {
    const respuesta = await fetch('../municipios/sig_municipios.json');
    const datos = await respuesta.json();

    window.proj4.defs(
      'EPSG:32721',
      '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs'
    );

    datos.geometries.forEach((geometria, indice) => {
      const color = COLORES_MUNICIPIOS[indice] || '#10b981';
      const puntosLeaflet = [];
      const puntosOriginales = geometria.coordinates[0];

      for (let i = 0; i < puntosOriginales.length; i += 4) {
        const [x, y] = puntosOriginales[i];

        const [lon, lat] = window.proj4(
          'EPSG:32721',
          'EPSG:4326',
          [x, y]
        );

        puntosLeaflet.push([lat, lon]);
      }

      window.L.polygon(puntosLeaflet, {
        color,
        weight: 1,
        opacity: 0.45,
        fillColor: color,
        fillOpacity: 0.06,
        interactive: false
      }).addTo(mapaChofer);
    });

  } catch (err) {
    console.warn(
      'No se pudieron cargar los municipios en el mapa del chofer:',
      err
    );
  }
}

async function cargarCircuitosEnMapaChofer() {
  if (!capaCircuitosChofer || typeof window.L === 'undefined') {
    return;
  }

  try {
    const resp = await fetch(`${API_GESTION}/api/mapa/circuitos`);
    const json = await resp.json();

    const circuitos = Array.isArray(json?.data)
      ? json.data
      : [];

    capaCircuitosChofer.clearLayers();

    circuitos.forEach(cir => {
      let coordenadas = cir.coordenadas;

      if (typeof coordenadas === 'string') {
        try {
          coordenadas = JSON.parse(coordenadas);
        } catch {
          return;
        }
      }

      if (
        !Array.isArray(coordenadas) ||
        coordenadas.length < 3
      ) {
        return;
      }

      const esDeMiRuta = datosChoferActual.circuitosAsignados
        .map(x => String(x).toUpperCase())
        .includes(String(cir.id_circuito || '').toUpperCase());

      const poligono = window.L.polygon(coordenadas, {
        color: esDeMiRuta ? '#16a34a' : '#0f172a',
        weight: esDeMiRuta ? 3 : 2,
        fillColor: esDeMiRuta ? '#22c55e' : '#0284c7',
        fillOpacity: esDeMiRuta ? 0.22 : 0.12,
        interactive: false
      }).addTo(capaCircuitosChofer);

      poligono.bindTooltip(
        String(cir.id_circuito || ''),
        {
          permanent: true,
          direction: 'center',
          className: 'circuito-map-label'
        }
      );
    });

  } catch (err) {
    console.warn(
      'No se pudieron cargar los circuitos en el mapa del chofer:',
      err
    );
  }
}


function actualizarWazeHud(navInfo) {
  if (!navInfo) return;

  const iconBox = document.getElementById('wazeIconBox');
  const iconMani = document.getElementById('wazeManeuverIcon');
  const distText = document.getElementById('wazeDistText');
  const instruction = document.getElementById('wazeInstruction');
  const nextStreet = document.getElementById('wazeNextStreet');
  const nextStep = document.getElementById('wazeNextStepText');
  const speedVal = document.getElementById('wazeSpeedVal');

  if (iconBox) {
    iconBox.className =
      'waze-icon-box ' + (navInfo.tipoMani || 'straight');
  }

  if (iconMani) {
    iconMani.className =
      'bi ' + (navInfo.icono || 'bi-arrow-up');
  }

  if (distText) {
    distText.textContent = navInfo.distanciaMText || '-- m';
  }

  if (instruction) {
    instruction.textContent = navInfo.instruccion || 'Siga la ruta';
  }

  if (nextStreet) {
    nextStreet.textContent = navInfo.calle || 'Ruta de recolección';
  }

  if (nextStep) {
    nextStep.textContent = navInfo.siguientePaso || 'En camino';
  }

  if (speedVal) {
    speedVal.textContent = String(navInfo.velocidadKmH ?? 0);
  }
}

function inicializarMapaChofer() {
  const contenedorMapa = document.getElementById('choferMapCanvas');

  if (
    !contenedorMapa ||
    mapaChofer ||
    typeof window.L === 'undefined'
  ) {
    return;
  }

  mapaChofer = window.L.map('choferMapCanvas')
    .setView(COORD_BASE_BUCEO, 16);

  window.L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(mapaChofer);

  capaCircuitosChofer = window.L.layerGroup().addTo(mapaChofer);
  capaRutaChofer = window.L.layerGroup().addTo(mapaChofer);
  capaContenedoresChofer = window.L.layerGroup().addTo(mapaChofer);

  const iconoCamion = window.L.divIcon({
    className: 'chofer-truck-marker',
    html: `
      <div style="background:#0284c7;color:#fff;padding:4px 10px;border-radius:999px;border:2px solid #fff;font-weight:800;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
        <i class="bi bi-truck"></i>
        <span id="labelCamionMapa">Mi Camión</span>
      </div>`,
    iconSize: [110, 30],
    iconAnchor: [55, 15]
  });

  marcadorCamionChofer = window.L.marker(
    COORD_BASE_BUCEO,
    {
      icon: iconoCamion,
      zIndexOffset: 1000
    }
  ).addTo(mapaChofer);

  setTimeout(() => {
    mapaChofer?.invalidateSize();
  }, 150);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      mapaChofer?.invalidateSize();
    });

    observer.observe(contenedorMapa);
  }

  document.getElementById('btnCentrarMiCamion')
    ?.addEventListener('click', () => {
      if (marcadorCamionChofer && mapaChofer) {
        mapaChofer.setView(
          marcadorCamionChofer.getLatLng(),
          17,
          { animate: true }
        );
      }
    });

  document.getElementById('btnVerTodaLaRuta')
    ?.addEventListener('click', () => {
      if (!mapaChofer) return;

      if (datosChoferActual.geometriaCalles.length > 1) {
        const bounds = window.L.latLngBounds(
          datosChoferActual.geometriaCalles
        );

        mapaChofer.fitBounds(bounds, {
          padding: [35, 35]
        });

      } else if (datosChoferActual.contenedores.length > 0) {
        const pts = [
          COORD_BASE_BUCEO,
          ...datosChoferActual.contenedores
            .filter(c =>
              c.latitud != null &&
              c.longitud != null
            )
            .map(c => [
              Number(c.latitud),
              Number(c.longitud)
            ])
        ];

        mapaChofer.fitBounds(
          window.L.latLngBounds(pts),
          { padding: [35, 35] }
        );
      }
    });

  document.getElementById('navFocusMapaChofer')
    ?.addEventListener('click', () => {
      const seccionMapa =
        document.getElementById('mapaChoferSection');

      if (seccionMapa) {
        seccionMapa.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      setTimeout(() => {
        if (mapaChofer) {
          mapaChofer.invalidateSize();
        }
      }, 300);
    });

  cargarMunicipiosEnMapaChofer();
  cargarCircuitosEnMapaChofer();
}


function colorInicialContenedor(dias) {
  const d = Math.max(0, Number(dias ?? 0));

  if (d <= 2) return '#22c55e';
  if (d <= 5) return '#eab308';

  return '#ef4444';
}

function renderizarListaParadasChofer() {
  const contenedorLista =
    document.getElementById('choferListaParadas');

  if (!contenedorLista) return;

  if (!datosChoferActual.contenedores.length) {
    contenedorLista.innerHTML = `
      <p class="chofer-sin-contenedores small mb-0 p-2">
        No hay contenedores pendientes en la ruta.
      </p>`;
    return;
  }

  contenedorLista.innerHTML =
    datosChoferActual.contenedores.map((cont, idx) => {
      const enParada =
        datosChoferActual.contenedorEnParada?.id_contenedor ===
        cont.id_contenedor;

      const estadoRuta = cont.procesado_en_ruta?.accion;

      let badgeHtml =
        `<span class="badge bg-secondary">Pendiente</span>`;

      if (enParada) {
        badgeHtml =
          `<span class="badge bg-warning text-dark">En parada</span>`;
      } else if (estadoRuta === 'levantado') {
        badgeHtml =
          `<span class="badge bg-success">Levantado</span>`;
      } else if (estadoRuta === 'no_levantado') {
        badgeHtml =
          `<span class="badge" style="background:#a855f7;">No levantado</span>`;
      }

      return `
        <button
          type="button"
          class="chofer-stop-item ${enParada ? 'active' : ''}"
          data-stop-id="${cont.id_contenedor}">
          <div>
            <strong>
              #${idx + 1} · ${cont.codigo || ('Cont. ' + cont.id_contenedor)}
            </strong>
            <div class="text-muted" style="font-size:.65rem;">
              Circuito ${cont.circuito || '—'} ·
              ${cont.dias_sin_recoleccion ?? 0} días
            </div>
          </div>
          ${badgeHtml}
        </button>
      `;
    }).join('');

  contenedorLista.querySelectorAll('[data-stop-id]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(
          btn.getAttribute('data-stop-id')
        );

        const marker = marcadoresContenedoresChofer[id];

        if (marker && mapaChofer) {
          mapaChofer.setView(
            marker.getLatLng(),
            17,
            { animate: true }
          );

          marker.openPopup();
        }
      });
    });
}

function dibujarRutaYContenedoresChofer() {
  if (
    !capaRutaChofer ||
    !capaContenedoresChofer ||
    !window.L
  ) {
    return;
  }

  capaRutaChofer.clearLayers();
  capaContenedoresChofer.clearLayers();
  marcadoresContenedoresChofer = {};

  window.L.polygon(POLIGONO_BASE_BUCEO, {
    color: '#1d4ed8',
    weight: 2,
    fillColor: '#2563eb',
    fillOpacity: 0.25,
    interactive: false
  }).addTo(capaRutaChofer);

  window.L.circleMarker(COORD_BASE_BUCEO, {
    radius: 8,
    fillColor: '#1d4ed8',
    color: '#ffffff',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup(
      '<strong>Base Cantón del Buceo</strong><br>Salida y llegada del camión'
    )
    .addTo(capaRutaChofer);

  window.L.polygon(POLIGONO_VERTEDERO, {
    color: '#b45309',
    weight: 2,
    fillColor: '#eab308',
    fillOpacity: 0.28,
    interactive: false
  }).addTo(capaRutaChofer);

  window.L.circleMarker(COORD_VERTEDERO, {
    radius: 8,
    fillColor: '#eab308',
    color: '#0f172a',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup(
      '<strong>Vertedero Felipe Cardoso</strong><br>Punto de descarga final'
    )
    .addTo(capaRutaChofer);

  if (datosChoferActual.geometriaCalles.length > 1) {
    window.L.polyline(
      datosChoferActual.geometriaCalles,
      {
        color: '#16a34a',
        weight: 5,
        opacity: 0.9
      }
    ).addTo(capaRutaChofer);
  }

  datosChoferActual.contenedores.forEach((cont, idx) => {
    if (
      cont.latitud == null ||
      cont.longitud == null
    ) {
      return;
    }

    const lat = Number(cont.latitud);
    const lng = Number(cont.longitud);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return;
    }

    const accion = cont.procesado_en_ruta?.accion;

    const campoIncidenciaDisponible =
      cont.incidencia_violeta !== undefined &&
      cont.incidencia_violeta !== null;

    const incidenciaVioleta = campoIncidenciaDisponible
      ? (
        cont.incidencia_violeta === true ||
        cont.incidencia_violeta === 1 ||
        cont.incidencia_violeta === '1'
      )
      : (
        cont.nivel_recoleccion === 'violeta' ||
        accion === 'no_levantado'
      );

    let colorIcono = colorInicialContenedor(
      cont.dias_sin_recoleccion
    );

    if (incidenciaVioleta) {
      colorIcono = '#a855f7';
    } else if (accion === 'levantado') {
      colorIcono = '#22c55e';
    }

    const estadoVisual = incidenciaVioleta
      ? 'Incidencia pendiente'
      : accion === 'levantado'
        ? 'Recolectado'
        : (cont.estado || 'Sin información');

    const marker = window.L.circleMarker(
      [lat, lng],
      {
        radius: 9,
        fillColor: colorIcono,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.95
      }
    )
      .bindPopup(
        `<strong>Parada #${idx + 1} · ${cont.codigo || ('Contenedor #' + cont.id_contenedor)
        }</strong><br>` +
        `Circuito: ${cont.circuito || '—'}<br>` +
        `Días sin recolección: ${cont.dias_sin_recoleccion ?? 0}<br>` +
        `Última recolección: ${cont.ultimo_registro || 'Sin registro'}<br>` +
        `Estado: ${estadoVisual}`
      )
      .addTo(capaContenedoresChofer);

    marcadoresContenedoresChofer[cont.id_contenedor] = marker;
  });

  renderizarListaParadasChofer();
}


async function asegurarGeometriaCallesChofer() {
  if (
    datosChoferActual.geometriaCalles.length > 1 ||
    !datosChoferActual.contenedores.length
  ) {
    return;
  }

  const contenedoresValidos =
    datosChoferActual.contenedores.filter(
      c =>
        c.latitud != null &&
        c.longitud != null
    );

  if (!contenedoresValidos.length) return;

  const puntosParadas = [
    COORD_BASE_BUCEO,
    ...contenedoresValidos.map(c => [
      Number(c.latitud),
      Number(c.longitud)
    ]),
    COORD_VERTEDERO,
    COORD_BASE_BUCEO
  ];

  datosChoferActual.geometriaCalles = puntosParadas;

  try {
    const queryOsrm = puntosParadas
      .map(p => `${p[1]},${p[0]}`)
      .join(';');

    const urlOsrm =
      `https://router.project-osrm.org/route/v1/driving/${queryOsrm}?overview=full&geometries=geojson`;

    if (puntosParadas.length > 15) {
      console.warn('Ruta extensa sin calles predefinidas: usando paradas directas.');
      return;
    }
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 4500);
    let datosOsrm;
    try {
      const resp = await fetch(urlOsrm, { signal: control.signal });
      if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
      datosOsrm = await resp.json();
    } finally { clearTimeout(limite); }

    if (
      datosOsrm.code === 'Ok' &&
      datosOsrm.routes?.[0]
    ) {
      datosChoferActual.geometriaCalles =
        datosOsrm.routes[0].geometry.coordinates.map(
          coord => [coord[1], coord[0]]
        );

      datosChoferActual.distanciaTotalKm = Number(
        (datosOsrm.routes[0].distance / 1000).toFixed(1)
      );
    }

  } catch (err) {
    console.warn(
      'Usando trazo directo para la ruta del chofer:',
      err
    );
  }
}

function alLlegarAContenedor(contenedor, indice, total) {
  datosChoferActual.contenedorEnParada = contenedor;

  setTexto(
    'choferContenedorActual',
    `Parada ${indice + 1}/${total}: ${contenedor.codigo || ('#' + contenedor.id_contenedor)
    }`
  );

  setTexto(
    'choferContenedorDetalle',
    `Circuito ${contenedor.circuito || '—'} · Seleccioná "Contenedor levantado" o registrá una incidencia para continuar.`
  );

  setInputVal(
    'choferDetUbicacion',
    `${contenedor.codigo || 'Contenedor'} (${contenedor.circuito || 'En ruta'
    })`
  );

  const estadoBadge =
    document.getElementById('choferEstadoViaje');

  if (estadoBadge) {
    estadoBadge.className =
      'chofer-status-badge chofer-status-stop';

    estadoBadge.textContent = 'En recorrido';
  }

  const btnLevantado =
    document.getElementById('btnContenedorLevantado');

  const btnIncidencia =
    document.getElementById('btnAbrirIncidenciaChofer');

  if (btnLevantado) btnLevantado.disabled = false;
  if (btnIncidencia) btnIncidencia.disabled = false;

  const marker =
    marcadoresContenedoresChofer[contenedor.id_contenedor];

  if (marker) {
    marker.openPopup();
  }

  renderizarListaParadasChofer();
}

function bloquearBotonesParada() {
  const btnLevantado =
    document.getElementById('btnContenedorLevantado');

  const btnIncidencia =
    document.getElementById('btnAbrirIncidenciaChofer');

  const formWrap =
    document.getElementById('formIncidenciaChoferWrap');

  if (btnLevantado) btnLevantado.disabled = true;
  if (btnIncidencia) btnIncidencia.disabled = true;

  formWrap?.classList.add('d-none');
}

let guardandoEventoContenedor = false;

async function registrarEventoContenedor({
  accion,
  motivo = null,
  descripcion = null
}) {
  const cont = datosChoferActual.contenedorEnParada;

  if (!cont || guardandoEventoContenedor) return false;

  if (!datosChoferActual.idRecoleccion) {
    alert('No existe una recolección activa. No se puede guardar.');
    return false;
  }

  guardandoEventoContenedor = true;

  const btnLevantado =
    document.getElementById('btnContenedorLevantado');

  const btnIncidencia =
    document.getElementById('btnAbrirIncidenciaChofer');

  const btnConfirmar =
    document.getElementById('btnConfirmarIncidenciaChofer');

  if (btnLevantado) btnLevantado.disabled = true;
  if (btnIncidencia) btnIncidencia.disabled = true;
  if (btnConfirmar) btnConfirmar.disabled = true;

  try {
    const respuesta = await peticionRecoleccion(
      `/api/recolecciones/${datosChoferActual.idRecoleccion}/contenedor`,
      {
        method: 'POST',
        body: {
          id_contenedor: Number(cont.id_contenedor),
          accion,
          motivo,
          descripcion
        }
      }
    );

    if (!respuesta.ok || respuesta.data?.success !== true) {
      const errores = respuesta.data?.errors
        ? Object.values(respuesta.data.errors).flat().join(' ')
        : '';

      throw new Error(
        errores ||
        respuesta.data?.message ||
        `Error HTTP ${respuesta.status}`
      );
    }

    const resultado = respuesta.data.data || {};
    const duplicado = resultado.duplicado === true;
    const procesadoAntes = Boolean(cont.procesado_en_ruta);

    const accionConfirmada = duplicado
      ? (resultado.accion || accion)
      : accion;

    const fecha = resultado.ultimo_registro ||
      new Date().toLocaleDateString('en-CA');

    cont.procesado_en_ruta = {
      accion: accionConfirmada,
      motivo: duplicado
        ? (resultado.motivo ?? cont.procesado_en_ruta?.motivo ?? motivo)
        : motivo,
      fecha
    };

    const valorIncidencia = resultado.incidencia_violeta;

    if (
      valorIncidencia !== undefined &&
      valorIncidencia !== null
    ) {
      cont.incidencia_violeta =
        valorIncidencia === true ||
        valorIncidencia === 1 ||
        valorIncidencia === '1';

    } else if (accionConfirmada === 'no_levantado') {
      cont.incidencia_violeta = true;
    }

    const marker =
      marcadoresContenedoresChofer[cont.id_contenedor];

    if (accionConfirmada === 'levantado') {
      if (!duplicado && !procesadoAntes) {
        datosChoferActual.levantados += 1;
        datosChoferActual.pesoRecolectadoKg += 180;

        if (motivo) {
          datosChoferActual.incidencias += 1;
        }
      }

      cont.ultimo_registro = fecha;
      cont.dias_sin_recoleccion = 0;

      const incidenciaPendiente =
        cont.incidencia_violeta === true;

      cont.nivel_recoleccion = incidenciaPendiente
        ? 'violeta'
        : 'verde';

      if (marker) {
        marker.setStyle({
          fillColor: incidenciaPendiente
            ? '#a855f7'
            : '#22c55e',
          color: '#ffffff'
        });

        marker.bindPopup(
          incidenciaPendiente
            ? '<strong>Contenedor levantado</strong><br>Incidencia pendiente'
            : '<strong>Contenedor levantado</strong>'
        );
      }

    } else if (accionConfirmada === 'no_levantado') {
      if (!duplicado && !procesadoAntes) {
        datosChoferActual.incidencias += 1;
      }

      const incidenciaPendiente =
        cont.incidencia_violeta === true;

      cont.nivel_recoleccion = incidenciaPendiente
        ? 'violeta'
        : (
          resultado.nivel_recoleccion ||
          cont.nivel_recoleccion
        );

      if (marker) {
        marker.setStyle({
          fillColor: incidenciaPendiente
            ? '#a855f7'
            : colorInicialContenedor(
              cont.dias_sin_recoleccion
            ),
          color: '#ffffff'
        });

        marker.bindPopup(
          incidenciaPendiente
            ? '<strong>Contenedor no levantado</strong><br>Incidencia pendiente'
            : '<strong>Contenedor no levantado</strong>'
        );
      }
    }

    datosChoferActual.contenedorEnParada = null;

    document.getElementById('formIncidenciaChoferWrap')
      ?.classList.add('d-none');

    const detalle =
      document.getElementById('incidenciaDetalleChofer');

    if (detalle) detalle.value = '';

    actualizarTableroChofer();
    renderizarListaParadasChofer();

    const estadoBadge =
      document.getElementById('choferEstadoViaje');

    if (estadoBadge) {
      estadoBadge.className =
        'chofer-status-badge chofer-status-route';

      estadoBadge.textContent =
        'En recorrido';
    }

    window.SimuladorChofer?.continuarAlSiguiente();

    return true;

  } catch (error) {
    console.error('Error registrando contenedor:', error);

    alert(
      'No se pudo guardar el registro.\n' +
      error.message +
      '\n\nEl recorrido permanecerá detenido.'
    );

    return false;

  } finally {
    guardandoEventoContenedor = false;

    if (datosChoferActual.contenedorEnParada) {
      if (btnLevantado) btnLevantado.disabled = false;
      if (btnIncidencia) btnIncidencia.disabled = false;
    }

    if (btnConfirmar) btnConfirmar.disabled = false;
  }
}


if (paginaActual === 'chofer.html') {
  iniciarRelojChofer();
  inicializarMapaChofer();
}

async function iniciarPagina() {
  const usuario = await protegerPagina();

  if (paginaActual !== 'chofer.html' || !usuario) {
    return;
  }

  datosChoferActual.usuario = usuario;

  iniciarRelojChofer();
  inicializarMapaChofer();

  let camion = null;
  let rutaDespachada = null;
  let contenedores = [];
  let datosRutaConfirmadosPorApi = false;

  try {
    const resp = await peticionRecoleccion(
      `/api/chofer/ruta?id_chofer=${encodeURIComponent(usuario.id_usuario || '')
      }`
    );

    if (resp.ok && resp.data?.data) {
      datosRutaConfirmadosPorApi = true;
      camion = resp.data.data.camion || null;
      if (camion) {
        camion.recorrido_activo = Boolean(resp.data.data.recoleccion_activa);
      }

      rutaDespachada =
        resp.data.data.ruta_despachada || null;

      contenedores =
        Array.isArray(resp.data.data.contenedores)
          ? resp.data.data.contenedores
          : [];

      if (
        resp.data.data.recoleccion_activa?.id_recoleccion
      ) {
        datosChoferActual.idRecoleccion =
          resp.data.data.recoleccion_activa.id_recoleccion;
      }
    }

  } catch (err) {
    console.warn(
      'Error consultando ruta del chofer en API:',
      err
    );
  }

  let rutasLocales = {};

  try {
    rutasLocales = JSON.parse(
      localStorage.getItem('sigeru_rutas_enviadas_chofer') ||
      '{}'
    );
  } catch (error) {
    console.warn(
      'No se pudo leer el respaldo local de rutas:',
      error
    );
  }

  if (!datosRutaConfirmadosPorApi && !rutaDespachada && camion?.id_camion) {
    const rutaLocal =
      rutasLocales[String(camion.id_camion)] ||
      (camion.matricula
        ? rutasLocales[String(camion.matricula)]
        : null);

    if (rutaLocal) {
      rutaDespachada = rutaLocal;

      if (Array.isArray(rutaLocal.contenedores)) {
        contenedores = rutaLocal.contenedores;
      }
    }
  }

  datosChoferActual.camion = camion;
  datosChoferActual.contenedores = contenedores;

  datosChoferActual.geometriaCalles =
    Array.isArray(rutaDespachada?.geometriaCalles)
      ? rutaDespachada.geometriaCalles
      : [];

  datosChoferActual.distanciaTotalKm = Number(
    rutaDespachada?.distanciaKm ||
    camion?.km_en_turno ||
    0
  );

  datosChoferActual.circuitosAsignados =
    Array.isArray(rutaDespachada?.circuitos)
      ? rutaDespachada.circuitos
      : (camion?.ruta_circuito
        ? [camion.ruta_circuito]
        : []);

  datosChoferActual.levantados =
    contenedores.filter(
      c => c.procesado_en_ruta?.accion === 'levantado'
    ).length;

  datosChoferActual.incidencias = Number(
    rutaDespachada?.incidencias_creadas || 0
  );

  const inputTurno =
    document.getElementById('choferTurnoTop');

  if (inputTurno && camion?.turno) {
    inputTurno.value = camion.turno;
  }

  const textoCircuitos =
    datosChoferActual.circuitosAsignados.length
      ? datosChoferActual.circuitosAsignados.join(', ')
      : 'Sin circuito asignado';

  const nombreCompletoChofer =
    camion?.chofer_nombre ||
    `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();

  setTexto(
    'choferHeaderCamion',
    camion
      ? `${camion.matricula} · ${nombreCompletoChofer}`
      : nombreCompletoChofer
  );

  setTexto(
    'choferMapaCamion',
    camion
      ? `${camion.matricula} (${camion.marca || ''} ${camion.modelo || ''
        })`.trim()
      : 'Camión asignado'
  );

  setTexto(
    'choferMapaCircuitos',
    `Circuito: ${textoCircuitos} · ${contenedores.length
    } contenedores a levantar`
  );

  setTexto(
    'labelCamionMapa',
    camion?.matricula || 'Mi Camión'
  );

  const estadoBadge =
    document.getElementById('choferEstadoViaje');

  if (estadoBadge) {
    const enRecorrido = estadoCamionChoferVisible(camion) === 'En recorrido';
    estadoBadge.className = enRecorrido
      ? 'chofer-status-badge chofer-status-route'
      : 'chofer-status-badge chofer-status-base';
    estadoBadge.textContent = enRecorrido ? 'En recorrido' : 'En base';
  }

  await asegurarGeometriaCallesChofer();

  actualizarTableroChofer();
  cargarCircuitosEnMapaChofer();
  dibujarRutaYContenedoresChofer();

  if (mapaChofer && marcadorCamionChofer) {
    mapaChofer.invalidateSize();

    mapaChofer.setView(
      marcadorCamionChofer.getLatLng(),
      16
    );
  }

  let ultimoEnvioGpsApi = 0;
  let enviandoGpsApi = false;
  let envioGpsPendiente = null;

  function publicarGpsChofer(lat, lng) {
    if (datosChoferActual.finalizandoRecorrido || !datosChoferActual.idRecoleccion) return;

    const camionActual = datosChoferActual.camion;
    const idCamion = Number(camionActual?.id_camion);
    const latitud = Number(lat);
    const longitud = Number(lng);

    if (!Number.isInteger(idCamion) || idCamion <= 0 ||
      !Number.isFinite(latitud) || !Number.isFinite(longitud) ||
      latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180 ||
      (latitud === 0 && longitud === 0)) return;

    const matricula = String(camionActual.matricula || '');
    let gpsGlobal = {};
    try {
      const leido = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');
      gpsGlobal = leido && typeof leido === 'object' ? leido : {};
    } catch (error) {
      console.warn('Respaldo GPS local inválido:', error);
    }

    const infoGps = {
      lat: latitud,
      lng: longitud,
      id_camion: idCamion,
      matricula,
      en_movimiento: true,
      timestamp: Date.now(),
      ubicacion: 'En recorrido'
    };
    gpsGlobal[idCamion] = infoGps;
    if (matricula) gpsGlobal[matricula] = infoGps;
    localStorage.setItem('sigeru_gps_camiones', JSON.stringify(gpsGlobal));
    localStorage.setItem('sigeru_gps_heartbeat', String(Date.now()));

    const ahora = Date.now();
    if (enviandoGpsApi || ahora - ultimoEnvioGpsApi < 2000) return;
    const token = getToken();
    if (!token) {
      console.warn('No se envió GPS: falta token JWT.');
      return;
    }

    ultimoEnvioGpsApi = ahora;
    enviandoGpsApi = true;
    envioGpsPendiente = fetch(`${API_GESTION}/api/camiones/${idCamion}/gps`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ latitud, longitud })
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data.message || `GPS: HTTP ${response.status}`);
      }
    }).catch(error => {
      console.warn('No se pudo enviar GPS a Gestión:', error);
    }).finally(() => {
      enviandoGpsApi = false;
      envioGpsPendiente = null;
    });
  }


  async function finalizarRecorridoCompleto(esManual = false) {
    if (datosChoferActual.finalizandoRecorrido) {
      return false;
    }

    datosChoferActual.finalizandoRecorrido = true;

    const btnIniciar =
      document.getElementById('btnIniciarViajeChofer');

    const btnFinalizar =
      document.getElementById('btnFinalizarRecorridoChofer');

    if (btnFinalizar) {
      btnFinalizar.disabled = true;
    }

    const duracionMs = Date.now() -
      (datosChoferActual.inicioTimestamp || Date.now());

    const minutosTotal = Math.max(
      1,
      Math.round(duracionMs / 60000)
    );

    const horas = Math.floor(minutosTotal / 60);
    const minutos = minutosTotal % 60;

    const asignados =
      datosChoferActual.contenedores.length;

    const levantados =
      datosChoferActual.levantados;

    const noLevantados =
      Math.max(0, asignados - levantados);

    const registroHistorial = {
      id: Date.now(),

      fecha: new Date().toLocaleString(
        'es-UY',
        {
          dateStyle: 'short',
          timeStyle: 'short'
        }
      ),

      circuito:
        datosChoferActual.circuitosAsignados.join(', ') ||
        'Sin circuito',

      estado: !esManual && noLevantados === 0
        ? 'Completada'
        : (esManual
          ? 'Finalizada manualmente'
          : 'Incompleta'),

      levantados,
      noLevantados,

      kmRecorridos:
        `${datosChoferActual.kmRecorridos.toFixed(1)} km`,

      duracion: horas > 0
        ? `${horas}h ${minutos}m`
        : `${minutos} min`
    };

    try {
      if (envioGpsPendiente) await envioGpsPendiente;

      const id = Number(
        datosChoferActual.idRecoleccion
      );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        throw new Error(
          'No existe una recolección activa registrada.'
        );
      }

      const respuesta = await peticionRecoleccion(
        `/api/recolecciones/${id}/finalizar`,
        {
          method: 'POST',
          body: registroHistorial
        }
      );

      if (
        !respuesta.ok ||
        respuesta.data?.success !== true
      ) {
        throw new Error(
          respuesta.data?.message ||
          `Error HTTP ${respuesta.status}`
        );
      }

    } catch (error) {
      console.error(
        'Error al finalizar recorrido:',
        error
      );

      alert(
        `No se pudo confirmar la finalización.\n${error.message
        }\nLa ruta se conserva.`
      );

      if (btnFinalizar) {
        btnFinalizar.disabled = false;
      }

      datosChoferActual.finalizandoRecorrido = false;
      return false;
    }

    window.SimuladorChofer?.detener();

    try {
      const historial = JSON.parse(
        localStorage.getItem(
          'sigeru_historial_rutas_chofer'
        ) || '[]'
      );

      historial.unshift(registroHistorial);

      localStorage.setItem(
        'sigeru_historial_rutas_chofer',
        JSON.stringify(historial)
      );

    } catch (error) {
      console.warn(
        'No se pudo guardar el historial de respaldo:',
        error
      );
    }

    const camionActual = datosChoferActual.camion;

    if (camionActual?.id_camion) {
      try {
        const rutas = JSON.parse(
          localStorage.getItem(
            'sigeru_rutas_enviadas_chofer'
          ) || '{}'
        );

        delete rutas[String(camionActual.id_camion)];

        if (camionActual.matricula) {
          delete rutas[camionActual.matricula];
        }

        localStorage.setItem(
          'sigeru_rutas_enviadas_chofer',
          JSON.stringify(rutas)
        );

      } catch (error) {
        console.warn(
          'No se pudo quitar el despacho de respaldo:',
          error
        );
      }

      try {
        const gpsGlobal = JSON.parse(
          localStorage.getItem(
            'sigeru_gps_camiones'
          ) || '{}'
        );

        const posicionBase = {
          id_camion: Number(camionActual.id_camion),
          matricula: camionActual.matricula || '',
          lat: COORD_BASE_BUCEO[0],
          lng: COORD_BASE_BUCEO[1],
          ubicacion: 'Base (Cantón del Buceo)',
          en_movimiento: false,
          timestamp: Date.now()
        };

        gpsGlobal[camionActual.id_camion] =
          posicionBase;

        if (camionActual.matricula) {
          gpsGlobal[camionActual.matricula] =
            posicionBase;
        }

        localStorage.setItem(
          'sigeru_gps_camiones',
          JSON.stringify(gpsGlobal)
        );

        localStorage.setItem(
          'sigeru_gps_heartbeat',
          String(Date.now())
        );

      } catch (error) {
        console.warn(
          'No se pudo actualizar el GPS local:',
          error
        );
      }

      camionActual.estado = 'En base';
      camionActual.recorrido_activo = false;
      camionActual.id_ruta = null;
    }

    marcadorCamionChofer?.setLatLng(COORD_BASE_BUCEO);

    capaRutaChofer?.clearLayers();
    capaContenedoresChofer?.clearLayers();

    marcadoresContenedoresChofer = {};

    document.getElementById('wazeNavHud')
      ?.classList.add('d-none');

    bloquearBotonesParada();

    const listaParadas =
      document.getElementById('choferListaParadas');

    if (listaParadas) {
      listaParadas.innerHTML = `
        <div class="text-center p-3 text-success">
          <i class="bi bi-check-circle-fill fs-4"></i>
          <div class="fw-bold mt-1">Ruta finalizada</div>
          <small class="text-muted">
            No hay rutas activas pendientes.
          </small>
        </div>
      `;
    }

    setTexto(
      'choferContenedorActual',
      'En Base Cantón del Buceo'
    );

    setTexto(
      'choferContenedorDetalle',
      'Recorrido finalizado. A la espera de una nueva ruta.'
    );

    setInputVal(
      'choferDetUbicacion',
      'Base Cantón del Buceo'
    );

    const estadoBadge =
      document.getElementById('choferEstadoViaje');

    if (estadoBadge) {
      estadoBadge.className =
        'chofer-status-badge chofer-status-base';

      estadoBadge.textContent =
        'En base';
    }

    if (btnIniciar) {
      btnIniciar.classList.remove('d-none');
      btnIniciar.disabled = true;
    }

    if (btnFinalizar) {
      btnFinalizar.classList.add('d-none');
    }

    datosChoferActual.idRecoleccion = null;
    datosChoferActual.contenedorEnParada = null;
    datosChoferActual.contenedores = [];
    datosChoferActual.geometriaCalles = [];
    datosChoferActual.circuitosAsignados = [];
    datosChoferActual.distanciaTotalKm = 0;
    datosChoferActual.kmRecorridos = 0;
    datosChoferActual.levantados = 0;
    datosChoferActual.incidencias = 0;
    datosChoferActual.pesoRecolectadoKg = 0;
    datosChoferActual.finalizandoRecorrido = false;

    actualizarTableroChofer();
    cargarCircuitosEnMapaChofer();

    return true;
  }


  const btnIniciar =
    document.getElementById('btnIniciarViajeChofer');

  const btnFinalizar =
    document.getElementById('btnFinalizarRecorridoChofer');

  btnIniciar?.addEventListener('click', async () => {
    if (btnIniciar.disabled) return;

    if (!datosChoferActual.contenedores.length) {
      if (document.getElementById('avisoSinContenedores')) {
        return;
      }

      const aviso = document.createElement('div');

      aviso.id = 'avisoSinContenedores';
      aviso.className = 'sigeru-aviso-fondo';

      aviso.innerHTML = `
      <div class="sigeru-aviso"
         role="alertdialog"
         aria-modal="true"
         aria-labelledby="avisoTitulo"
         aria-describedby="avisoMensaje">

      <h3 id="avisoTitulo">Aviso</h3>

      <p id="avisoMensaje">
        Todavía no tenés contenedores asignados en tu ruta.
        </p>

          <div class="sigeru-aviso-acciones">
            <button type="button" class="btn btn-success">
            Aceptar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(aviso);

      const boton = aviso.querySelector('button');

      boton.addEventListener('click', () => {
        aviso.remove();
      });

      boton.focus();

      return;
    }

    if (!window.SimuladorChofer?.iniciar) {
      alert('No se cargó el simulador del chofer.');
      return;
    }

    const idCamion = Number(
      datosChoferActual.camion?.id_camion
    );

    if (
      !Number.isInteger(idCamion) ||
      idCamion <= 0
    ) {
      alert('No tenés un camión válido asignado.');
      return;
    }

    btnIniciar.disabled = true;

    try {
      if (!datosChoferActual.idRecoleccion) {
        const respuesta = await peticionRecoleccion(
          '/api/recolecciones/iniciar',
          {
            method: 'POST',
            body: {
              id_camion: idCamion,
              id_ruta: datosChoferActual.camion?.id_ruta
                ? Number(datosChoferActual.camion.id_ruta)
                : null
            }
          }
        );

        const idRecoleccion = Number(
          respuesta.data?.data?.id_recoleccion
        );

        if (
          !respuesta.ok ||
          respuesta.data?.success !== true ||
          !Number.isInteger(idRecoleccion) ||
          idRecoleccion <= 0
        ) {
          throw new Error(
            respuesta.data?.message ||
            `La API no confirmó el inicio (HTTP ${respuesta.status}).`
          );
        }

        datosChoferActual.idRecoleccion =
          idRecoleccion;
      }

      datosChoferActual.inicioTimestamp = Date.now();

      window.SimuladorChofer.iniciar({
        mapa: mapaChofer,
        marcadorCamion: marcadorCamionChofer,
        geometriaCalles: datosChoferActual.geometriaCalles,
        contenedores: datosChoferActual.contenedores,
        distanciaTotalKm: datosChoferActual.distanciaTotalKm,

        onAvanceKm: (kmActuales, lat, lng) => {
          datosChoferActual.kmRecorridos =
            Number(kmActuales) || 0;

          actualizarTableroChofer();

          if (lat != null && lng != null) {
            publicarGpsChofer(lat, lng);
          }
        },

        onLlegarAContenedor: (cont, indice, total) => {
          alLlegarAContenedor(cont, indice, total);
        },

        onNavUpdate: (navInfo) => {
          actualizarWazeHud(navInfo);
        },

        onFinalizarRecorrido: async () => {
          await finalizarRecorridoCompleto(false);
        }
      });

      btnIniciar.classList.add('d-none');

      if (btnFinalizar) {
        btnFinalizar.classList.remove('d-none');
        btnFinalizar.disabled = false;
      }

      if (estadoBadge) {
        estadoBadge.className =
          'chofer-status-badge chofer-status-route';

        estadoBadge.textContent = 'En recorrido';
      }

      datosChoferActual.camion.estado = 'Recolectando';
      datosChoferActual.camion.recorrido_activo = true;

      actualizarTableroChofer();

      const primeraPosicion =
        datosChoferActual.geometriaCalles[0] ||
        COORD_BASE_BUCEO;

      publicarGpsChofer(
        primeraPosicion[0],
        primeraPosicion[1]
      );

    } catch (error) {
      console.error('Error al iniciar recorrido:', error);

      alert(
        error.message ||
        'No se pudo iniciar el recorrido.'
      );

      btnIniciar.disabled = false;
      btnIniciar.classList.remove('d-none');

      if (btnFinalizar) {
        btnFinalizar.classList.add('d-none');
      }
    }
  });

  btnFinalizar?.addEventListener('click', async () => {
    if (
      confirm(
        '¿Deseas finalizar el recorrido de recolección ahora?'
      )
    ) {
      await finalizarRecorridoCompleto(true);
    }
  });


  document.getElementById('btnContenedorLevantado')
    ?.addEventListener('click', async () => {
      await registrarEventoContenedor({
        accion: 'levantado'
      });
    });

  document.getElementById('btnAbrirIncidenciaChofer')
    ?.addEventListener('click', () => {
      document.getElementById('formIncidenciaChoferWrap')
        ?.classList.remove('d-none');
    });

  document.getElementById('btnCancelarIncidenciaChofer')
    ?.addEventListener('click', () => {
      document.getElementById('formIncidenciaChoferWrap')
        ?.classList.add('d-none');
    });

  document.getElementById('btnConfirmarIncidenciaChofer')
    ?.addEventListener('click', async () => {
      const accion =
        document.getElementById('incidenciaAccionChofer')?.value ||
        'no_levantado';

      const motivo = String(
        document.getElementById('incidenciaMotivoChofer')?.value ||
        ''
      ).trim();

      const descripcion = String(
        document.getElementById('incidenciaDetalleChofer')?.value ||
        ''
      ).trim();

      if (accion === 'no_levantado' && !motivo) {
        alert('Seleccioná un motivo para la incidencia.');
        return;
      }

      await registrarEventoContenedor({
        accion,
        motivo: motivo || null,
        descripcion
      });
    });
}


async function renderizarHistorialRutas() {
  const tbody =
    document.getElementById('tablaHistorialRutasBody');

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted py-4">
        Cargando historial...
      </td>
    </tr>
  `;

  let historial = [];

  try {
    const usuario =
      datosChoferActual.usuario || {};

    const camion =
      datosChoferActual.camion || {};

    const qs = camion.id_camion
      ? `?id_camion=${encodeURIComponent(camion.id_camion)}`
      : `?id_chofer=${encodeURIComponent(
        usuario.id_usuario || ''
      )}`;

    const resp = await peticionRecoleccion(
      `/api/chofer/historial-rutas${qs}`
    );

    if (
      resp.ok &&
      Array.isArray(resp.data?.data)
    ) {
      historial = resp.data.data;
    }

  } catch (error) {
    console.warn(
      'No se pudo cargar el historial desde la API:',
      error
    );
  }

  if (!historial.length) {
    try {
      historial = JSON.parse(
        localStorage.getItem(
          'sigeru_historial_rutas_chofer'
        ) || '[]'
      );
    } catch (error) {
      console.warn(
        'No se pudo leer el historial local:',
        error
      );
      historial = [];
    }
  }

  if (!historial.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-3 d-block mb-1"></i>
          Todavía no tenés rutas finalizadas registradas.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = historial.map(r => `
    <tr>
      <td>
        <strong>${r.fecha || '-'}</strong>
      </td>

      <td>
        <span class="badge bg-secondary">
          ${r.circuito || 'Sin circuito'}
        </span>
      </td>

      <td>
        <span class="badge ${(r.estado || '').toLowerCase().includes('final') ||
      r.estado === 'Completada'
      ? 'bg-success'
      : 'bg-warning text-dark'
    }">
          ${r.estado || 'Finalizada'}
        </span>
      </td>

      <td class="text-success fw-bold text-center">
        ${Number(r.levantados || 0)}
      </td>

      <td class="text-danger fw-bold text-center">
        ${Number(r.noLevantados || 0)}
      </td>

      <td>
        ${r.kmRecorridos || '0,0 km'}
      </td>

      <td>
        <i class="bi bi-stopwatch"></i>
        ${r.duracion || '-'}
      </td>
    </tr>
  `).join('');
}

document.getElementById('modalHistorialRutas')
  ?.addEventListener(
    'show.bs.modal',
    renderizarHistorialRutas
  );

function prepararModalIncidenciaChofer() {
  const formulario = document.getElementById(
    'formIncidenciaChoferWrap'
  );

  if (!formulario || formulario.dataset.modalListo === '1') {
    return;
  }

  const tarjeta = document.createElement('div');
  tarjeta.className = 'chofer-incidencia-tarjeta';

  while (formulario.firstChild) {
    tarjeta.appendChild(formulario.firstChild);
  }

  formulario.appendChild(tarjeta);

  document.body.appendChild(formulario);

  formulario.setAttribute('role', 'dialog');
  formulario.setAttribute('aria-modal', 'true');
  formulario.setAttribute(
    'aria-label',
    'Registrar incidencia en contenedor'
  );

  formulario.dataset.modalListo = '1';
}

if (paginaActual === 'chofer.html') {
  prepararModalIncidenciaChofer();
}

iniciarPagina();