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

// =========================================================================
// LÓGICA DEL TABLERO Y MAPA DEL CHOFER (ESTILO ADMINISTRADOR)
// =========================================================================

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
  '#f6483b', // A
  '#10b981', // B
  '#8b5cf6', // C
  '#06b6d4', // CH
  '#f59e0b', // D
  '#ec4899', // E
  '#14b8a6', // F
  '#6366f1'  // G
];

const LETRAS_MUNICIPIOS = ['A', 'B', 'C', 'CH', 'D', 'E', 'F', 'G'];

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

// Intenta consultar la API de Recolección (8002) y, si no está levantada, usa la API de Gestión (8001)
async function peticionRecoleccion(ruta, opciones = {}) {
  const token = getToken();
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOpts = {
    method: opciones.method || 'GET',
    headers,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  };

  try {
    const resp = await fetch(`${API_RECOLECCION}${ruta}`, fetchOpts);
    const json = await resp.json().catch(() => ({}));
    if (resp.ok || resp.status < 500) {
      return { ok: resp.ok, status: resp.status, data: json };
    }
  } catch {
    // Si el puerto 8002 no está corriendo, caemos automáticamente al respaldo en puerto 8001
  }

  const respFallback = await fetch(`${API_GESTION}${ruta}`, fetchOpts);
  const jsonFallback = await respFallback.json().catch(() => ({}));
  return { ok: respFallback.ok, status: respFallback.status, data: jsonFallback };
}

function iniciarRelojChofer() {
  const inputDia = document.getElementById('choferDia');
  const inputHora = document.getElementById('choferHora');

  const actualizar = () => {
    const ahora = new Date();
    if (inputDia) {
      inputDia.value = ahora.toISOString().slice(0, 10);
    }
    if (inputHora) {
      inputHora.value = ahora.toTimeString().slice(0, 5);
    }
  };

  actualizar();
  setInterval(actualizar, 15000);
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function setInputVal(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

function actualizarTableroChofer() {
  const total = datosChoferActual.contenedores.length;
  const procesados = datosChoferActual.contenedores.filter(c => c.procesado_en_ruta).length;
  const pendientes = Math.max(0, total - procesados);
  const kmRestantes = Math.max(
    0,
    datosChoferActual.distanciaTotalKm - datosChoferActual.kmRecorridos
  );

  // 1. Barra superior
  setTexto('choferTotalLevantar', String(pendientes));
  setTexto('choferTotalLevantados', String(datosChoferActual.levantados));
  setTexto('choferTotalIncidencias', String(datosChoferActual.incidencias));
  setTexto('choferKmRecorridos', `${datosChoferActual.kmRecorridos.toFixed(1)} km`);
  setTexto('choferKmRestantes', `${kmRestantes.toFixed(1)} km`);

  // 2. Panel inferior de detalle del camión (igual al Administrador)
  const c = datosChoferActual.camion;
  const u = datosChoferActual.usuario;
  const nombreChofer = c?.chofer_nombre || (u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : '—');
  const textoCircuitos = datosChoferActual.circuitosAsignados.length
    ? datosChoferActual.circuitosAsignados.join(', ')
    : (c?.ruta_circuito || '—');

  setInputVal('choferDetCamion', c ? `${c.matricula} (${c.marca || ''} ${c.modelo || ''})`.trim() : '—');
  setInputVal('choferDetChofer', nombreChofer || '—');
  setInputVal('choferDetEstado', c?.estado || 'En base');
  setInputVal('choferDetTurno', c?.turno || 'Nocturno');
  setInputVal('choferDetCircuito', textoCircuitos);
  setInputVal('choferDetAsignados', String(total));
  setInputVal('choferDetLevantados', String(datosChoferActual.levantados));
  setInputVal('choferDetFaltantes', String(pendientes));
  setInputVal('choferDetPeso', `${Math.round(datosChoferActual.pesoRecolectadoKg)} kg`);
  setInputVal('choferDetCapacidad', c?.capacidad_kg ? `${Math.round(Number(c.capacidad_kg))} kg` : '8000 kg');
  setInputVal('choferDetKm', `${datosChoferActual.kmRecorridos.toFixed(1)} km`);
  setInputVal('choferDetKmRestantes', `${kmRestantes.toFixed(1)} km`);
  setInputVal('choferDetIncidencias', String(datosChoferActual.incidencias));
  setInputVal('choferDetCuadrilla', c?.id_cuadrilla || 'Sin cuadrilla');
}

async function cargarMunicipiosEnMapaChofer() {
  if (!mapaChofer || typeof window.L === 'undefined' || typeof window.proj4 === 'undefined') {
    return;
  }

  try {
    const respuesta = await fetch('../municipios/sig_municipios.json');
    const datos = await respuesta.json();

    window.proj4.defs('EPSG:32721', '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs');

    datos.geometries.forEach((geometria, indice) => {
      const color = COLORES_MUNICIPIOS[indice] || '#10b981';
      const puntosLeaflet = [];
      const puntosOriginales = geometria.coordinates[0];

      for (let i = 0; i < puntosOriginales.length; i += 4) {
        const [x, y] = puntosOriginales[i];
        const [lon, lat] = window.proj4('EPSG:32721', 'EPSG:4326', [x, y]);
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
    console.warn('No se pudieron cargar los municipios en el mapa del chofer:', err);
  }
}

async function cargarCircuitosEnMapaChofer() {
  if (!capaCircuitosChofer || typeof window.L === 'undefined') return;

  try {
    const resp = await fetch(`${API_GESTION}/api/mapa/circuitos`);
    const json = await resp.json();
    const circuitos = Array.isArray(json?.data) ? json.data : [];

    capaCircuitosChofer.clearLayers();

    circuitos.forEach(cir => {
      if (!Array.isArray(cir.coordenadas) || cir.coordenadas.length < 3) return;

      const esDeMiRuta = datosChoferActual.circuitosAsignados
        .map(x => String(x).toUpperCase())
        .includes(String(cir.id_circuito || '').toUpperCase());

      const poligono = window.L.polygon(cir.coordenadas, {
        color: esDeMiRuta ? '#16a34a' : '#0f172a',
        weight: esDeMiRuta ? 3 : 2,
        fillColor: esDeMiRuta ? '#22c55e' : '#0284c7',
        fillOpacity: esDeMiRuta ? 0.22 : 0.12,
        interactive: false
      }).addTo(capaCircuitosChofer);

      poligono.bindTooltip(String(cir.id_circuito || ''), {
        permanent: true,
        direction: 'center',
        className: 'circuito-map-label'
      });
    });
  } catch (err) {
    console.warn('No se pudieron cargar los circuitos en el mapa del chofer:', err);
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
    iconBox.className = 'waze-icon-box ' + (navInfo.tipoMani || 'straight');
  }
  if (iconMani) {
    iconMani.className = 'bi ' + (navInfo.icono || 'bi-arrow-up');
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
  if (!contenedorMapa || mapaChofer || typeof window.L === 'undefined') return;

  // Vista más cercana enfocada en el camión del chofer (zoom 16)
  mapaChofer = window.L.map('choferMapCanvas').setView(COORD_BASE_BUCEO, 16);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapaChofer);

  capaCircuitosChofer = window.L.layerGroup().addTo(mapaChofer);
  capaRutaChofer = window.L.layerGroup().addTo(mapaChofer);
  capaContenedoresChofer = window.L.layerGroup().addTo(mapaChofer);

  // Icono destacado del camión del chofer
  const iconoCamion = window.L.divIcon({
    className: 'chofer-truck-marker',
    html: `<div style="background:#0284c7;color:#fff;padding:4px 10px;border-radius:999px;border:2px solid #fff;font-weight:800;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;"><i class="bi bi-truck"></i> <span id="labelCamionMapa">Mi Camión</span></div>`,
    iconSize: [110, 30],
    iconAnchor: [55, 15]
  });

  marcadorCamionChofer = window.L.marker(COORD_BASE_BUCEO, {
    icon: iconoCamion,
    zIndexOffset: 1000
  }).addTo(mapaChofer);

  // Aseguramos el cálculo de dimensiones de Leaflet
  setTimeout(() => {
    mapaChofer?.invalidateSize();
  }, 150);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      mapaChofer?.invalidateSize();
    });
    observer.observe(contenedorMapa);
  }

  document.getElementById('btnCentrarMiCamion')?.addEventListener('click', () => {
    if (marcadorCamionChofer && mapaChofer) {
      mapaChofer.setView(marcadorCamionChofer.getLatLng(), 17, { animate: true });
    }
  });

  document.getElementById('btnVerTodaLaRuta')?.addEventListener('click', () => {
    if (!mapaChofer) return;
    if (datosChoferActual.geometriaCalles.length > 1) {
      const bounds = window.L.latLngBounds(datosChoferActual.geometriaCalles);
      mapaChofer.fitBounds(bounds, { padding: [35, 35] });
    } else if (datosChoferActual.contenedores.length > 0) {
      const pts = [
        COORD_BASE_BUCEO,
        ...datosChoferActual.contenedores
          .filter(c => c.latitud != null && c.longitud != null)
          .map(c => [Number(c.latitud), Number(c.longitud)])
      ];
      mapaChofer.fitBounds(window.L.latLngBounds(pts), { padding: [35, 35] });
    }
  });

  cargarMunicipiosEnMapaChofer();
  cargarCircuitosEnMapaChofer();
}

function colorInicialContenedor(dias) {
  const d = Number(dias || 3);
  if (d <= 2) return '#22c55e';
  if (d === 3) return '#eab308';
  if (d === 4) return '#f97316';
  if (d === 5) return '#ef4444';
  return '#18181b';
}

function renderizarListaParadasChofer() {
  const contenedorLista = document.getElementById('choferListaParadas');
  if (!contenedorLista) return;

  if (!datosChoferActual.contenedores.length) {
    contenedorLista.innerHTML = `<p class="text-muted small mb-0 p-2">No hay contenedores pendientes en la ruta.</p>`;
    return;
  }

  contenedorLista.innerHTML = datosChoferActual.contenedores.map((cont, idx) => {
    const enParada = datosChoferActual.contenedorEnParada?.id_contenedor === cont.id_contenedor;
    const estadoRuta = cont.procesado_en_ruta?.accion;

    let badgeHtml = `<span class="badge bg-secondary">Pendiente</span>`;
    if (enParada) {
      badgeHtml = `<span class="badge bg-warning text-dark">En parada</span>`;
    } else if (estadoRuta === 'levantado') {
      badgeHtml = `<span class="badge bg-danger">Levantado</span>`;
    } else if (estadoRuta === 'no_levantado') {
      badgeHtml = `<span class="badge" style="background:#a855f7;">No levantado</span>`;
    }

    return `
      <button type="button" class="chofer-stop-item ${enParada ? 'active' : ''}" data-stop-id="${cont.id_contenedor}">
        <div>
          <strong>#${idx + 1} · ${cont.codigo || ('Cont. ' + cont.id_contenedor)}</strong>
          <div class="text-muted" style="font-size:.65rem;">Circuito ${cont.circuito || '—'} · ${cont.dias_sin_recoleccion || 3} días</div>
        </div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  contenedorLista.querySelectorAll('[data-stop-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-stop-id'));
      const marker = marcadoresContenedoresChofer[id];
      if (marker && mapaChofer) {
        mapaChofer.setView(marker.getLatLng(), 17, { animate: true });
        marker.openPopup();
      }
    });
  });
}

function dibujarRutaYContenedoresChofer() {
  if (!capaRutaChofer || !capaContenedoresChofer || !window.L) return;
  capaRutaChofer.clearLayers();
  capaContenedoresChofer.clearLayers();
  marcadoresContenedoresChofer = {};

  // 1. Polígono y marcador de Base Cantón del Buceo
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
    .bindPopup('<strong>Base Cantón del Buceo</strong><br>Salida y llegada del camión')
    .addTo(capaRutaChofer);

  // 2. Polígono y marcador de Vertedero Felipe Cardoso
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
    .bindPopup('<strong>Vertedero Felipe Cardoso</strong><br>Punto de descarga final')
    .addTo(capaRutaChofer);

  // 3. Línea de la ruta por las calles
  if (datosChoferActual.geometriaCalles.length > 1) {
    window.L.polyline(datosChoferActual.geometriaCalles, {
      color: '#16a34a',
      weight: 5,
      opacity: 0.9
    }).addTo(capaRutaChofer);
  }

  // 4. Dibujamos cada contenedor de la ruta
  datosChoferActual.contenedores.forEach((cont, idx) => {
    if (cont.latitud == null || cont.longitud == null) return;

    let colorIcono = colorInicialContenedor(cont.dias_sin_recoleccion);
    if (cont.procesado_en_ruta?.accion === 'levantado') {
      colorIcono = '#ef4444'; // Cuando es levantado correctamente vuelve en rojo
    } else if (cont.procesado_en_ruta?.accion === 'no_levantado') {
      colorIcono = '#a855f7'; // Violeta cuando no se pudo levantar (incidencia)
    }

    const marker = window.L.circleMarker(
      [Number(cont.latitud), Number(cont.longitud)],
      {
        radius: 9,
        fillColor: colorIcono,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.95
      }
    )
      .bindPopup(
        `<strong>Parada #${idx + 1} · ${cont.codigo || ('Contenedor #' + cont.id_contenedor)}</strong><br>` +
        `Circuito: ${cont.circuito || '—'}<br>` +
        `Días sin recolección: ${cont.dias_sin_recoleccion || 3}<br>` +
        `Última recolección: ${cont.ultimo_registro || 'Sin registro'}`
      )
      .addTo(capaContenedoresChofer);

    marcadoresContenedoresChofer[cont.id_contenedor] = marker;
  });

  renderizarListaParadasChofer();
}

// Si el camión tiene contenedores asignados pero todavía no se trazó la geometría de calles por OSRM, la genera automáticamente
async function asegurarGeometriaCallesChofer() {
  if (datosChoferActual.geometriaCalles.length > 1 || !datosChoferActual.contenedores.length) {
    return;
  }

  const contenedoresValidos = datosChoferActual.contenedores.filter(
    c => c.latitud != null && c.longitud != null
  );
  if (!contenedoresValidos.length) return;

  const puntosParadas = [
    COORD_BASE_BUCEO,
    ...contenedoresValidos.map(c => [Number(c.latitud), Number(c.longitud)]),
    COORD_VERTEDERO,
    COORD_BASE_BUCEO
  ];

  datosChoferActual.geometriaCalles = puntosParadas;

  try {
    const queryOsrm = puntosParadas.map(p => `${p[1]},${p[0]}`).join(';');
    const urlOsrm = `https://router.project-osrm.org/route/v1/driving/${queryOsrm}?overview=full&geometries=geojson`;
    const resp = await fetch(urlOsrm);
    const datosOsrm = await resp.json();

    if (datosOsrm.code === 'Ok' && datosOsrm.routes?.[0]) {
      datosChoferActual.geometriaCalles = datosOsrm.routes[0].geometry.coordinates.map(
        coord => [coord[1], coord[0]]
      );
      datosChoferActual.distanciaTotalKm = Number((datosOsrm.routes[0].distance / 1000).toFixed(1));
    }
  } catch (err) {
    console.warn('Usando trazo directo para la ruta del chofer:', err);
  }
}

// Se ejecuta cuando el camión llega a un contenedor y se detiene
function alLlegarAContenedor(contenedor, indice, total) {
  datosChoferActual.contenedorEnParada = contenedor;

  setTexto('choferContenedorActual', `Parada ${indice + 1}/${total}: ${contenedor.codigo || ('#' + contenedor.id_contenedor)}`);
  setTexto('choferContenedorDetalle', `Circuito ${contenedor.circuito || '—'} · Seleccioná "Contenedor levantado" o registrá una incidencia para continuar.`);
  setInputVal('choferDetUbicacion', `${contenedor.codigo || 'Contenedor'} (${contenedor.circuito || 'En ruta'})`);

  const estadoBadge = document.getElementById('choferEstadoViaje');
  if (estadoBadge) {
    estadoBadge.className = 'badge bg-warning text-dark';
    estadoBadge.textContent = 'Detenido en contenedor';
  }

  // Habilitamos los botones de Contenedor levantado y No levantado / Agregar incidencia
  const btnLevantado = document.getElementById('btnContenedorLevantado');
  const btnIncidencia = document.getElementById('btnAbrirIncidenciaChofer');
  if (btnLevantado) btnLevantado.disabled = false;
  if (btnIncidencia) btnIncidencia.disabled = false;

  const marker = marcadoresContenedoresChofer[contenedor.id_contenedor];
  if (marker) {
    marker.openPopup();
  }

  renderizarListaParadasChofer();
}

function bloquearBotonesParada() {
  const btnLevantado = document.getElementById('btnContenedorLevantado');
  const btnIncidencia = document.getElementById('btnAbrirIncidenciaChofer');
  const formWrap = document.getElementById('formIncidenciaChoferWrap');

  if (btnLevantado) btnLevantado.disabled = true;
  if (btnIncidencia) btnIncidencia.disabled = true;
  formWrap?.classList.add('d-none');
}

async function registrarEventoContenedor({ accion, motivo = null, descripcion = null }) {
  const cont = datosChoferActual.contenedorEnParada;
  if (!cont) return;

  bloquearBotonesParada();

  const fechaHoy = new Date().toISOString().slice(0, 10);

  // Enviamos el registro a la API (guarda historial_contenedores, ultimo_registro e incidencia)
  if (datosChoferActual.idRecoleccion) {
    try {
      await peticionRecoleccion(`/api/recolecciones/${datosChoferActual.idRecoleccion}/contenedor`, {
        method: 'POST',
        body: {
          id_contenedor: Number(cont.id_contenedor),
          accion,
          motivo,
          descripcion
        }
      });
    } catch (err) {
      console.warn('Error al guardar contenedor en API:', err);
    }
  }

  cont.procesado_en_ruta = { accion, motivo, fecha: fechaHoy };
  const marker = marcadoresContenedoresChofer[cont.id_contenedor];

  if (accion === 'levantado') {
    datosChoferActual.levantados += 1;
    datosChoferActual.pesoRecolectadoKg += 180;
    cont.ultimo_registro = fechaHoy;
    cont.dias_sin_recoleccion = 1;

    if (motivo) {
      datosChoferActual.incidencias += 1;
    }

    // Cuando es levantado correctamente, el icono del contenedor vuelve en rojo (#ef4444)
    if (marker) {
      marker.setStyle({ fillColor: '#ef4444', color: '#ffffff' });
      marker.bindPopup(
        `<strong>${cont.codigo} · Levantado (Rojo)</strong><br>` +
        `Última recolección: ${fechaHoy}` +
        (motivo ? `<br>Incidencia: ${motivo}` : '')
      );
    }
  } else {
    datosChoferActual.incidencias += 1;
    if (marker) {
      marker.setStyle({ fillColor: '#a855f7', color: '#ffffff' });
      marker.bindPopup(
        `<strong>${cont.codigo} · NO Levantado</strong><br>` +
        `Motivo: ${motivo || 'Incidencia reportada'}` +
        (descripcion ? `<br>Detalle: ${descripcion}` : '')
      );
    }
  }

  datosChoferActual.contenedorEnParada = null;
  actualizarTableroChofer();
  renderizarListaParadasChofer();

  const estadoBadge = document.getElementById('choferEstadoViaje');
  if (estadoBadge) {
    estadoBadge.className = 'badge bg-primary';
    estadoBadge.textContent = 'En camino al siguiente punto';
  }

  // El simulador continúa su recorrido al siguiente contenedor
  if (window.SimuladorChofer) {
    window.SimuladorChofer.continuarAlSiguiente();
  }
}

// Si estamos en chofer.html, inicializamos el reloj y el mapa de inmediato para que nunca quede en blanco
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

  try {
    const resp = await peticionRecoleccion(`/api/chofer/ruta?id_chofer=${encodeURIComponent(usuario.id_usuario || '')}`);
    if (resp.ok && resp.data?.data) {
      camion = resp.data.data.camion || null;
      rutaDespachada = resp.data.data.ruta_despachada || null;
      contenedores = Array.isArray(resp.data.data.contenedores) ? resp.data.data.contenedores : [];
      if (resp.data.data.recoleccion_activa?.id_recoleccion) {
        datosChoferActual.idRecoleccion = resp.data.data.recoleccion_activa.id_recoleccion;
      }
    }
  } catch (err) {
    console.warn('Error consultando ruta del chofer en API:', err);
  }

  // Respaldo con localStorage por si el administrador acaba de enviarla en el mismo navegador
  const rutasLocales = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
  if (!rutaDespachada && Object.keys(rutasLocales).length > 0) {
    const clave = camion?.matricula && rutasLocales[camion.matricula]
      ? camion.matricula
      : Object.keys(rutasLocales)[0];
    rutaDespachada = rutasLocales[clave];
    if ( Array.isArray(rutaDespachada?.contenedores) && rutaDespachada.contenedores.length > 0) {
      contenedores = rutaDespachada.contenedores;
    }
  }

  datosChoferActual.camion = camion;
  datosChoferActual.contenedores = contenedores;
  datosChoferActual.geometriaCalles = Array.isArray(rutaDespachada?.geometriaCalles)
    ? rutaDespachada.geometriaCalles
    : [];
  datosChoferActual.distanciaTotalKm = Number(rutaDespachada?.distanciaKm || camion?.km_en_turno || 0);
  datosChoferActual.circuitosAsignados = Array.isArray(rutaDespachada?.circuitos)
    ? rutaDespachada.circuitos
    : (camion?.ruta_circuito ? [camion.ruta_circuito] : []);

  // Calculamos levantados e incidencias previas si ya había contenedores procesados
  datosChoferActual.levantados = contenedores.filter(c => c.procesado_en_ruta?.accion === 'levantado').length;
  datosChoferActual.incidencias = Number(rutaDespachada?.incidencias_creadas || 0);

  const inputTurno = document.getElementById('choferTurnoTop');
  if (inputTurno && camion?.turno) {
    inputTurno.value = camion.turno;
  }

  const textoCircuitos = datosChoferActual.circuitosAsignados.length
    ? datosChoferActual.circuitosAsignados.join(', ')
    : 'Sin circuito asignado';

  const nombreCompletoChofer = camion?.chofer_nombre || `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();

  setTexto('choferHeaderCamion', camion ? `${camion.matricula} · ${nombreCompletoChofer}` : nombreCompletoChofer);
  setTexto('choferMapaCamion', camion ? `${camion.matricula} (${camion.marca || ''} ${camion.modelo || ''})`.trim() : 'Camión asignado');
  setTexto('choferMapaCircuitos', `Circuito: ${textoCircuitos} · ${contenedores.length} contenedores a levantar`);
  setTexto('labelCamionMapa', camion?.matricula || 'Mi Camión');

  const estadoBadge = document.getElementById('choferEstadoViaje');
  if (estadoBadge && contenedores.length > 0) {
    estadoBadge.className = 'badge bg-info text-dark';
    estadoBadge.textContent = 'Ruta lista';
  }

  // Si tiene contenedores asignados y aún no tenía la polilínea de calles OSRM, la trazamos automáticamente
  await asegurarGeometriaCallesChofer();

  actualizarTableroChofer();
  cargarCircuitosEnMapaChofer();
  dibujarRutaYContenedoresChofer();

  // Enfocamos el mapa cerca del camión del chofer (zoom 16)
  if (mapaChofer && marcadorCamionChofer) {
    mapaChofer.invalidateSize();
    mapaChofer.setView(marcadorCamionChofer.getLatLng(), 16);
  }

  // Botón Iniciar recorrido
  const btnIniciar = document.getElementById('btnIniciarViajeChofer');
  btnIniciar?.addEventListener('click', async () => {
    if (!datosChoferActual.contenedores.length) {
      alert('Todavía no tenés contenedores asignados en tu ruta.');
      return;
    }

    btnIniciar.disabled = true;

    datosChoferActual.inicioTimestamp = Date.now(); // marca el inicio de la ruta 

    if (camion?.id_camion) {
      try {
        const resInicio = await peticionRecoleccion('/api/recolecciones/iniciar', {
          method: 'POST',
          body: {
            id_camion: Number(camion.id_camion),
            id_ruta: camion.id_ruta ? Number(camion.id_ruta) : null
          }
        });
        if (resInicio.ok && resInicio.data?.data?.id_recoleccion) {
          datosChoferActual.idRecoleccion = resInicio.data.data.id_recoleccion;
        }
      } catch (err) {
        console.warn('Aviso al iniciar recolección en API:', err);
      }
    }

    if (estadoBadge) {
      estadoBadge.className = 'badge bg-primary';
      estadoBadge.textContent = 'En recorrido';
    }
    if (datosChoferActual.camion) {
      datosChoferActual.camion.estado = 'Recolectando';
    }
    actualizarTableroChofer();

    // Iniciamos el simulador separado para que mueva el camión por la ruta hasta cada contenedor
    if (window.SimuladorChofer) {
      window.SimuladorChofer.iniciar({
        mapa: mapaChofer,
        marcadorCamion: marcadorCamionChofer,
        geometriaCalles: datosChoferActual.geometriaCalles,
        contenedores: datosChoferActual.contenedores,
        distanciaTotalKm: datosChoferActual.distanciaTotalKm,
               onAvanceKm: (kmActuales, lat, lng) => {
          datosChoferActual.kmRecorridos = kmActuales;
          actualizarTableroChofer();

          // Transmitir posición GPS al Administrador en tiempo real
          if (lat && lng && datosChoferActual.camion) {
            const ahora = Date.now();
            // Emitimos cada 250ms para movimiento fluido sin saturar memoria
            if (!datosChoferActual.ultimoGpsMs || ahora - datosChoferActual.ultimoGpsMs > 250) {
              datosChoferActual.ultimoGpsMs = ahora;

              const idCamion = datosChoferActual.camion.id_camion;
              const matricula = datosChoferActual.camion.matricula;
              const gpsGlobal = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');

              gpsGlobal[idCamion] = {
                lat: Number(lat),
                lng: Number(lng),
                ubicacion: 'En recorrido (' + (datosChoferActual.circuitosAsignados.join(', ') || 'Ruta activa') + ')'
              };

              if (matricula) {
                gpsGlobal[matricula] = gpsGlobal[idCamion];
              }

              // Publica la posición para que el mapa de administrador la capture de inmediato
              localStorage.setItem('sigeru_gps_camiones', JSON.stringify(gpsGlobal));
            }
          }
        },
        onLlegarAContenedor: (cont, indice, total) => {
          alLlegarAContenedor(cont, indice, total);
        },
               onFinalizarRecorrido: async () => {
          datosChoferActual.kmRecorridos = datosChoferActual.distanciaTotalKm;
          if (datosChoferActual.camion) {
            datosChoferActual.camion.estado = 'En base (Libre)';
          }
          setInputVal('choferDetUbicacion', 'Base Cantón del Buceo');
          actualizarTableroChofer();

          // A. Cálculo de métricas requeridas
          const duracionMs = Date.now() - (datosChoferActual.inicioTimestamp || Date.now());
          const minutosTotal = Math.max(1, Math.round(duracionMs / 60000));
          const horas = Math.floor(minutosTotal / 60);
          const minutos = minutosTotal % 60;
          const tiempoTexto = horas > 0 ? `${horas}h ${minutos}m` : `${minutos} min`;

          const totalAsignados = datosChoferActual.contenedores.length;
          const levantados = datosChoferActual.levantados;
          const noLevantados = Math.max(0, totalAsignados - levantados);
          const completada = noLevantados === 0;

          // B. Objeto para el Historial
          const registroHistorial = {
            id: Date.now(),
            fecha: new Date().toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' }),
            circuito: datosChoferActual.circuitosAsignados.join(', ') || 'Sin circuito',
            estado: completada ? 'Completada' : 'Incompleta',
            levantados: levantados,
            noLevantados: noLevantados,
            kmRecorridos: `${datosChoferActual.distanciaTotalKm.toFixed(1)} km`,
            duracion: tiempoTexto
          };

          // C. Guardar en localStorage de respaldo
          const historial = JSON.parse(localStorage.getItem('sigeru_historial_rutas_chofer') || '[]');
          historial.unshift(registroHistorial);
          localStorage.setItem('sigeru_historial_rutas_chofer', JSON.stringify(historial));

          // D. Guardar en el Backend (sin alterar la BD)
          if (datosChoferActual.idRecoleccion) {
            await peticionRecoleccion(`/api/recolecciones/${datosChoferActual.idRecoleccion}/finalizar`, {
              method: 'POST',
              body: registroHistorial
            }).catch(() => {});
          }

          // E. QUITAR LA RUTA DE LA PANTALLA
          if (capaRutaChofer) capaRutaChofer.clearLayers();
          if (capaContenedoresChofer) capaContenedoresChofer.clearLayers();
          marcadoresContenedoresChofer = {};

          // Ocultar HUD Waze de navegación
          document.getElementById('wazeNavHud')?.classList.add('d-none');

          // Limpiar lista de paradas en el panel lateral
          const listaParadas = document.getElementById('choferListaParadas');
          if (listaParadas) {
            listaParadas.innerHTML = `
              <div class="text-center p-3 text-success">
                <i class="bi bi-check-circle-fill fs-4"></i>
                <div class="fw-bold mt-1">Ruta finalizada</div>
                <small class="text-muted">No hay rutas activas pendientes.</small>
              </div>`;
          }

          // Restablecer textos de parada y badge
          setTexto('choferContenedorActual', 'En Base Cantón del Buceo');
          setTexto('choferContenedorDetalle', 'Recorrido finalizado y descargado en Vertedero. A la espera de una nueva ruta.');

          if (estadoBadge) {
            estadoBadge.className = 'badge bg-success';
            estadoBadge.textContent = 'En base (Libre)';
          }

          // Limpiar la ruta despachada para que no vuelva si refresca
          localStorage.removeItem('sigeru_rutas_enviadas_chofer');
          datosChoferActual.contenedores = [];
          datosChoferActual.geometriaCalles = [];

                    // Regresar el camión a la Base Cantón del Buceo en el mapa del Administrador
          if (datosChoferActual.camion) {
            const idCamion = datosChoferActual.camion.id_camion;
            const matricula = datosChoferActual.camion.matricula;
            const gpsGlobal = JSON.parse(localStorage.getItem('sigeru_gps_camiones') || '{}');

            gpsGlobal[idCamion] = {
              lat: COORD_BASE_BUCEO[0],
              lng: COORD_BASE_BUCEO[1],
              ubicacion: 'Base (Cantón del Buceo)'
            };
            if (matricula) gpsGlobal[matricula] = gpsGlobal[idCamion];
            localStorage.setItem('sigeru_gps_camiones', JSON.stringify(gpsGlobal));
          }

                    // Borrar la ruta despachada para que el Administrador vea borrarse el trazado al instante
          const rutasDespachadas = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
          if (datosChoferActual.camion?.matricula) {
            delete rutasDespachadas[datosChoferActual.camion.matricula];
          }
          if (datosChoferActual.camion?.id_camion) {
            delete rutasDespachadas[datosChoferActual.camion.id_camion];
          }
          localStorage.setItem('sigeru_rutas_enviadas_chofer', JSON.stringify(rutasDespachadas));
        }
      });
    }
  });

  // Botón Contenedor levantado
  document.getElementById('btnContenedorLevantado')?.addEventListener('click', () => {
    registrarEventoContenedor({ accion: 'levantado' });
  });

  // Botón Abrir formulario de incidencia (No levantado / con motivo)
  document.getElementById('btnAbrirIncidenciaChofer')?.addEventListener('click', () => {
    document.getElementById('formIncidenciaChoferWrap')?.classList.remove('d-none');
  });

  // Botón Cancelar incidencia
  document.getElementById('btnCancelarIncidenciaChofer')?.addEventListener('click', () => {
    document.getElementById('formIncidenciaChoferWrap')?.classList.add('d-none');
  });

  // Botón Confirmar incidencia
  document.getElementById('btnConfirmarIncidenciaChofer')?.addEventListener('click', () => {
    const accion = document.getElementById('incidenciaAccionChofer')?.value || 'no_levantado';
    const motivo = document.getElementById('incidenciaMotivoChofer')?.value || 'No se pudo levantar';
    const descripcion = document.getElementById('incidenciaDetalleChofer')?.value || '';

    const inputDetalle = document.getElementById('incidenciaDetalleChofer');
    if (inputDetalle) inputDetalle.value = '';

    registrarEventoContenedor({ accion, motivo, descripcion });
  });
}

// Renderiza el historial de rutas dentro del modal
function renderizarHistorialRutas() {
  const tbody = document.getElementById('tablaHistorialRutasBody');
  if (!tbody) return;

  const historial = JSON.parse(localStorage.getItem('sigeru_historial_rutas_chofer') || '[]');
  if (!historial.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-3 d-block mb-1"></i>
          Todavía no tenés rutas finalizadas registradas.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = historial.map(r => `
    <tr>
      <td><strong>${r.fecha}</strong></td>
      <td><span class="badge bg-secondary">${r.circuito}</span></td>
      <td>
        <span class="badge ${r.estado === 'Completada' ? 'bg-success' : 'bg-warning text-dark'}">
          ${r.estado}
        </span>
      </td>
      <td class="text-success fw-bold text-center">${r.levantados}</td>
      <td class="text-danger fw-bold text-center">${r.noLevantados}</td>
      <td>${r.kmRecorridos}</td>
      <td><i class="bi bi-stopwatch"></i> ${r.duracion}</td>
    </tr>
  `).join('');
}

// Escuchar la apertura del modal para refrescar la tabla
document.getElementById('modalHistorialRutas')?.addEventListener('show.bs.modal', renderizarHistorialRutas);

iniciarPagina();
