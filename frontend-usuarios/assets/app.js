const API_SESION_USUARIOS = 'http://127.0.0.1:8000';
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

// Funciones para obtener y eliminar el token JWT almacenado en localStorage.
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
    // Eliminamos el token JWT de localStorage al cerrar sesión
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

// =========================================================================
// LÓGICA DEL TABLERO Y MAPA DEL CHOFER
// =========================================================================

let mapaChofer = null;
let marcadorCamionChofer = null;
let capaRutaChofer = null;
let marcadoresContenedoresChofer = {};
let datosChoferActual = {
  camion: null,
  idRecoleccion: null,
  contenedores: [],
  geometriaCalles: [],
  distanciaTotalKm: 0,
  kmRecorridos: 0,
  levantados: 0,
  incidencias: 0,
  contenedorEnParada: null
};

async function peticionRecoleccion(ruta, opciones = {}) {
  const token = getToken();
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_RECOLECCION}${ruta}`, {
    method: opciones.method || 'GET',
    headers,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });

  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data: json };
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

function actualizarBarraSuperiorChofer() {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const pendientes = Math.max(
    0,
    datosChoferActual.contenedores.length - datosChoferActual.levantados
  );
  const kmRestantes = Math.max(
    0,
    datosChoferActual.distanciaTotalKm - datosChoferActual.kmRecorridos
  );

  setText('choferTotalLevantar', String(pendientes));
  setText('choferTotalLevantados', String(datosChoferActual.levantados));
  setText('choferTotalIncidencias', String(datosChoferActual.incidencias));
  setText('choferKmRecorridos', `${datosChoferActual.kmRecorridos.toFixed(1)} km`);
  setText('choferKmRestantes', `${kmRestantes.toFixed(1)} km`);
}

function inicializarMapaChofer() {
  const contenedorMapa = document.getElementById('choferMapCanvas');
  if (!contenedorMapa || !window.L) return;

  // Vista más cercana enfocada en el camión del chofer (zoom 16)
  mapaChofer = window.L.map('choferMapCanvas').setView(COORD_BASE_BUCEO, 16);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(mapaChofer);

  capaRutaChofer = window.L.layerGroup().addTo(mapaChofer);

  // Icono del camión del chofer
  const iconoCamion = window.L.divIcon({
    className: 'chofer-truck-marker',
    html: `<div style="background:#0284c7;color:#fff;padding:4px 8px;border-radius:999px;border:2px solid #fff;font-weight:800;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.45);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;"><i class="bi bi-truck"></i> <span id="labelCamionMapa">Mi Camión</span></div>`,
    iconSize: [100, 28],
    iconAnchor: [50, 14]
  });

  marcadorCamionChofer = window.L.marker(COORD_BASE_BUCEO, {
    icon: iconoCamion,
    zIndexOffset: 1000
  }).addTo(mapaChofer);

  document.getElementById('btnCentrarMiCamion')?.addEventListener('click', () => {
    if (marcadorCamionChofer && mapaChofer) {
      mapaChofer.setView(marcadorCamionChofer.getLatLng(), 17, { animate: true });
    }
  });

  document.getElementById('btnVerTodaLaRuta')?.addEventListener('click', () => {
    if (mapaChofer && datosChoferActual.geometriaCalles.length > 1) {
      const bounds = window.L.latLngBounds(datosChoferActual.geometriaCalles);
      mapaChofer.fitBounds(bounds, { padding: [35, 35] });
    }
  });
}

function colorInicialContenedor(dias) {
  const d = Number(dias || 3);
  if (d <= 2) return '#22c55e';
  if (d === 3) return '#eab308';
  if (d === 4) return '#f97316';
  if (d === 5) return '#ef4444';
  return '#18181b';
}

function dibujarRutaYContenedoresChofer() {
  if (!capaRutaChofer || !window.L) return;
  capaRutaChofer.clearLayers();
  marcadoresContenedoresChofer = {};

  // Marcadores de Base y Vertedero
  window.L.circleMarker(COORD_BASE_BUCEO, {
    radius: 8,
    fillColor: '#1d4ed8',
    color: '#ffffff',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup('<strong>Base Cantón del Buceo</strong><br>Salida y llegada')
    .addTo(capaRutaChofer);

  window.L.circleMarker(COORD_VERTEDERO, {
    radius: 8,
    fillColor: '#eab308',
    color: '#0f172a',
    weight: 3,
    fillOpacity: 1
  })
    .bindPopup('<strong>Vertedero Felipe Cardoso</strong><br>Punto de descarga')
    .addTo(capaRutaChofer);

  // Línea de la ruta por las calles
  if (datosChoferActual.geometriaCalles.length > 1) {
    window.L.polyline(datosChoferActual.geometriaCalles, {
      color: '#16a34a',
      weight: 5,
      opacity: 0.88
    }).addTo(capaRutaChofer);
  }

  // Dibujamos cada contenedor de la ruta
  datosChoferActual.contenedores.forEach((cont, idx) => {
    if (cont.latitud == null || cont.longitud == null) return;

    let colorIcono = colorInicialContenedor(cont.dias_sin_recoleccion);
    if (cont.procesado_en_ruta?.accion === 'levantado') {
      colorIcono = '#ef4444'; // Cuando es levantado correctamente vuelve en rojo
    } else if (cont.procesado_en_ruta?.accion === 'no_levantado') {
      colorIcono = '#a855f7'; // Violeta cuando quedó con incidencia no levantado
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
        `Días sin recolección: ${cont.dias_sin_recoleccion || 3}`
      )
      .addTo(capaRutaChofer);

    marcadoresContenedoresChofer[cont.id_contenedor] = marker;
  });
}

// Se ejecuta cuando el camión (o el simulador) llega a un contenedor y frena
function alLlegarAContenedor(contenedor, indice, total) {
  datosChoferActual.contenedorEnParada = contenedor;

  const titulo = document.getElementById('choferContenedorActual');
  const detalle = document.getElementById('choferContenedorDetalle');
  const estadoBadge = document.getElementById('choferEstadoViaje');

  if (titulo) {
    titulo.textContent = `Parada ${indice + 1}/${total}: ${contenedor.codigo || ('#' + contenedor.id_contenedor)}`;
  }
  if (detalle) {
    detalle.textContent = `Circuito ${contenedor.circuito || '—'} · Elegí si fue levantado o registrá incidencia para continuar.`;
  }
  if (estadoBadge) {
    estadoBadge.className = 'badge bg-warning text-dark';
    estadoBadge.textContent = 'Detenido en contenedor';
  }

  // Habilitamos los botones de Contenedor levantado y Agregar incidencia
  const btnLevantado = document.getElementById('btnContenedorLevantado');
  const btnIncidencia = document.getElementById('btnAbrirIncidenciaChofer');
  if (btnLevantado) btnLevantado.disabled = false;
  if (btnIncidencia) btnIncidencia.disabled = false;

  const marker = marcadoresContenedoresChofer[contenedor.id_contenedor];
  if (marker) {
    marker.openPopup();
  }
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

  // Enviamos el registro a la API de Recolección (guarda historial, fecha última vez recolectado e incidencia)
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

  const marker = marcadoresContenedoresChofer[cont.id_contenedor];

  if (accion === 'levantado') {
    datosChoferActual.levantados += 1;
    if (motivo) {
      datosChoferActual.incidencias += 1;
    }
    // Cuando es levantado correctamente, el icono del contenedor vuelve en rojo
    if (marker) {
      marker.setStyle({ fillColor: '#ef4444', color: '#ffffff' });
      marker.bindPopup(
        `<strong>${cont.codigo} · Levantado</strong><br>` +
        `Última recolección: ${new Date().toISOString().slice(0, 10)}` +
        (motivo ? `<br>Obs: ${motivo}` : '')
      );
    }
  } else {
    datosChoferActual.incidencias += 1;
    if (marker) {
      marker.setStyle({ fillColor: '#a855f7', color: '#ffffff' });
      marker.bindPopup(
        `<strong>${cont.codigo} · NO Levantado</strong><br>` +
        `Motivo: ${motivo || 'Incidencia reportada'}`
      );
    }
  }

  actualizarBarraSuperiorChofer();

  const estadoBadge = document.getElementById('choferEstadoViaje');
  if (estadoBadge) {
    estadoBadge.className = 'badge bg-primary';
    estadoBadge.textContent = 'En camino al siguiente punto';
  }

  // Le avisamos al simulador externo que ya terminamos con este contenedor y puede avanzar al siguiente
  if (window.SimuladorChofer) {
    window.SimuladorChofer.continuarAlSiguiente();
  }
}

async function iniciarPagina() {
  const usuario = await protegerPagina();

  if (paginaActual !== 'chofer.html' || !usuario) {
    return;
  }

  iniciarRelojChofer();
  inicializarMapaChofer();

  // Consultamos la ruta asignada al chofer en la API 8002
  let camion = null;
  let rutaDespachada = null;
  let contenedores = [];

  try {
    const resp = await peticionRecoleccion(`/api/chofer/ruta?id_chofer=${encodeURIComponent(usuario.id_usuario || '')}`);
    if (resp.ok && resp.data?.data) {
      camion = resp.data.data.camion || null;
      rutaDespachada = resp.data.data.ruta_despachada || null;
      contenedores = resp.data.data.contenedores || [];
      if (resp.data.data.recoleccion_activa?.id_recoleccion) {
        datosChoferActual.idRecoleccion = resp.data.data.recoleccion_activa.id_recoleccion;
      }
    }
  } catch (err) {
    console.warn('No se pudo consultar API 8002, verificando localStorage:', err);
  }

  // Respaldo con localStorage por si el administrador acaba de enviarla en el mismo navegador
  const rutasLocales = JSON.parse(localStorage.getItem('sigeru_rutas_enviadas_chofer') || '{}');
  if (!rutaDespachada && Object.keys(rutasLocales).length > 0) {
    const clave = camion?.matricula && rutasLocales[camion.matricula]
      ? camion.matricula
      : Object.keys(rutasLocales)[0];
    rutaDespachada = rutasLocales[clave];
    if (!contenedores.length && Array.isArray(rutaDespachada?.contenedores)) {
      contenedores = rutaDespachada.contenedores;
    }
  }

  datosChoferActual.camion = camion;
  datosChoferActual.contenedores = contenedores;
  datosChoferActual.geometriaCalles = rutaDespachada?.geometriaCalles || [];
  datosChoferActual.distanciaTotalKm = Number(rutaDespachada?.distanciaKm || camion?.km_en_turno || 0);

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const inputTurno = document.getElementById('choferTurnoTop');
  if (inputTurno && camion?.turno) {
    inputTurno.value = camion.turno;
  }

  const textoCircuitos = Array.isArray(rutaDespachada?.circuitos)
    ? rutaDespachada.circuitos.join(', ')
    : (camion?.ruta_circuito || 'Sin ruta asignada');

  setText('choferMapaCamion', camion ? `${camion.matricula} (${camion.marca || ''} ${camion.modelo || ''})`.trim() : 'Camión asignado');
  setText('choferMapaCircuitos', `Circuitos: ${textoCircuitos}`);
  setText('labelCamionMapa', camion?.matricula || 'Mi Camión');

  setText('choferCamionResumen', camion?.matricula || 'Camión asignado');
  setText('choferCamionTexto', `${camion?.marca || ''} ${camion?.modelo || ''}`.trim() || 'Vehículo operativo');
  setText('choferEstadoResumen', camion?.estado || 'Activo');
  setText('choferRutaResumen', textoCircuitos);
  setText('choferTurnoResumen', camion?.turno || 'Diurno');
  setText('choferVehiculo', camion ? `${camion.matricula} · ${camion.marca || ''} ${camion.modelo || ''}` : 'Sin vehículo');
  setText('choferRuta', textoCircuitos);
  setText('choferEstado', `${camion?.estado || 'En base'} · ${contenedores.length} contenedores en ruta`);

  actualizarBarraSuperiorChofer();
  dibujarRutaYContenedoresChofer();

  // Botón Iniciar recorrido
  const btnIniciar = document.getElementById('btnIniciarViajeChofer');
  btnIniciar?.addEventListener('click', async () => {
    if (!datosChoferActual.contenedores.length) {
      alert('Todavía no tenés una ruta con contenedores enviada por el Administrador.');
      return;
    }

    btnIniciar.disabled = true;

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

    const estadoBadge = document.getElementById('choferEstadoViaje');
    if (estadoBadge) {
      estadoBadge.className = 'badge bg-primary';
      estadoBadge.textContent = 'En recorrido';
    }

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
          actualizarBarraSuperiorChofer();
        },
        onLlegarAContenedor: (cont, indice, total) => {
          alLlegarAContenedor(cont, indice, total);
        },
        onFinalizarRecorrido: async () => {
          datosChoferActual.kmRecorridos = datosChoferActual.distanciaTotalKm;
          actualizarBarraSuperiorChofer();
          setText('choferContenedorActual', 'Recorrido finalizado');
          setText('choferContenedorDetalle', 'Descarga en Vertedero Felipe Cardoso completada y de regreso en Base Cantón del Buceo.');
          if (estadoBadge) {
            estadoBadge.className = 'badge bg-success';
            estadoBadge.textContent = 'Viaje completado';
          }
          if (datosChoferActual.idRecoleccion) {
            await peticionRecoleccion(`/api/recolecciones/${datosChoferActual.idRecoleccion}/finalizar`, {
              method: 'POST'
            }).catch(() => {});
          }
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

iniciarPagina();
