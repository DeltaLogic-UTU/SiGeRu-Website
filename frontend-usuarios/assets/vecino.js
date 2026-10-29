/**
 * ==========================================================================
 * Lógica de la App Vecinal (Mobile-First) - SiGeRU
 * ==========================================================================
 */

const API_USUARIOS = 'http://127.0.0.1:8000';
const API_GESTION = 'http://127.0.0.1:8001';

// Estado global de la aplicación
const vecinoState = {
  usuario: null,
  contenedores: [],
  reclamos: [],
  contenedorSeleccionado: null,
  ubicacionUsuario: null,
  map: null,
  userMarker: null,
  userCircle: null,
  containerMarkers: [],
  fotoBase64: null
};

// Utilidad para escape HTML
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Calcular distancia Haversine en metros
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ==========================================================================
// 1. INICIALIZACIÓN Y AUTENTICACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.replace('../landing-page/login.html');
    return;
  }

  initTheme();
  setupNavTabs();
  setupCrearReclamoModal();
  await cargarDatosUsuario();
  initMapa();
  await cargarContenedores();
  await cargarMisReclamos();

  // Pedir permiso de geolocalización al abrir la app para situar al usuario
  solicitarGeolocalizacion(false);
});

// Manejo del tema claro/oscuro
function initTheme() {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('sigeru-theme') || 'dark';
  root.dataset.theme = savedTheme;

  const btnTheme = document.getElementById('btnThemeToggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('sigeru-theme', root.dataset.theme);
      actualizarIconoTema();
    });
    actualizarIconoTema();
  }
}

function actualizarIconoTema() {
  const btnTheme = document.getElementById('btnThemeToggle');
  if (!btnTheme) return;
  const isLight = document.documentElement.dataset.theme === 'light';
  btnTheme.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}"></i>`;
}

// Cargar perfil del vecino autenticado
async function cargarDatosUsuario() {
  const token = localStorage.getItem('access_token');
  try {
    const res = await fetch(`${API_USUARIOS}/api/auth/me`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('access_token');
      window.location.replace('../landing-page/login.html');
      return;
    }

    const data = await res.json();
    if (data.success && data.data) {
      vecinoState.usuario = data.data;
      renderPerfil();
    }
  } catch (err) {
    console.warn('Error cargando usuario:', err);
  }
}

function renderPerfil() {
  const u = vecinoState.usuario;
  if (!u) return;

  const nombreEl = document.getElementById('perfilNombre');
  const docEl = document.getElementById('perfilDoc');
  const telEl = document.getElementById('perfilTel');
  const dirEl = document.getElementById('perfilDir');
  const userHeaderEl = document.getElementById('headerUserName');

  const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.trim() || 'Vecino';
  if (nombreEl) nombreEl.value = nombreCompleto;
  if (docEl) docEl.value = u.documento || '—';
  if (telEl) telEl.value = u.telefono || '';
  if (dirEl) dirEl.value = u.direccion || 'Montevideo, Uruguay';
  if (userHeaderEl) userHeaderEl.textContent = nombreCompleto;
}

// ==========================================================================
// 2. NAVEGACIÓN ENTRE PESTAÑAS (TABS)
// ==========================================================================
function setupNavTabs() {
  const navBtns = document.querySelectorAll('.vecino-nav-item[data-tab]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Botón logout
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    window.location.href = '../landing-page/login.html';
  });
}

function switchTab(tabName) {
  // Ocultar todas las páginas
  document.querySelectorAll('.vecino-tab-page').forEach(page => {
    page.classList.remove('active');
  });

  // Desactivar botones de navegación
  document.querySelectorAll('.vecino-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Activar la página seleccionada
  const targetPage = document.getElementById(`page${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Si se abre el mapa, refrescar dimensiones para evitar tiles grises
  if (tabName === 'mapa' && vecinoState.map) {
    setTimeout(() => {
      vecinoState.map.invalidateSize();
    }, 200);
  }

  // Si se abre reclamos, refrescar lista
  if (tabName === 'reclamos') {
    cargarMisReclamos();
  }
}

// ==========================================================================
// 3. MAPA LEAFLET Y CONTENEDORES
// ==========================================================================
function initMapa() {
  const mapEl = document.getElementById('vecinoMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Coordenadas base (Centro de Montevideo / Zona Pocitos - Buceo)
  const defaultLat = -34.901113;
  const defaultLng = -56.164531;

  vecinoState.map = L.map('vecinoMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([defaultLat, defaultLng], 15);

  // Control de zoom en posición inferior izquierda
  L.control.zoom({ position: 'bottomleft' }).addTo(vecinoState.map);

  // Capa base de mapas OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(vecinoState.map);

  // Botón flotante: Geolocalizar
  document.getElementById('btnGeolocalizar')?.addEventListener('click', () => {
    solicitarGeolocalizacion(true);
  });

  // Botón flotante: Contenedor más cercano
  document.getElementById('btnContenedorCercano')?.addEventListener('click', () => {
    seleccionarContenedorMasCercano();
  });

  // Botón cerrar Bottom Sheet
  document.getElementById('btnCerrarBottomSheet')?.addEventListener('click', () => {
    cerrarBottomSheet();
  });

  // Botón reportar desde Bottom Sheet
  document.getElementById('btnReportarContenedorBS')?.addEventListener('click', () => {
    abrirModalCrearReclamoConContenedor(vecinoState.contenedorSeleccionado);
  });
}

// Solicitar geolocalización del usuario
function solicitarGeolocalizacion(centrar = false) {
  if (!navigator.geolocation) {
    if (centrar) alert('Tu navegador no soporta geolocalización.');
    return;
  }

  const btnGeo = document.getElementById('btnGeolocalizar');
  if (btnGeo) btnGeo.classList.add('loading');

  navigator.geolocation.getCurrentPosition(
    position => {
      if (btnGeo) btnGeo.classList.remove('loading');
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy || 40;

      vecinoState.ubicacionUsuario = { lat, lng };

      // Dibujar marcador de usuario (Punto azul con animación pulsante)
      const userHtml = `
        <div class="user-pulse-marker">
          <div class="core"></div>
          <div class="pulse"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-icon-container',
        html: userHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      if (vecinoState.userMarker) {
        vecinoState.userMarker.setLatLng([lat, lng]);
      } else {
        vecinoState.userMarker = L.marker([lat, lng], {
          icon: userIcon,
          zIndexOffset: 1000
        }).addTo(vecinoState.map);
      }

      // Círculo de proximidad/precisión igual que en Figma
      if (vecinoState.userCircle) {
        vecinoState.userCircle.setLatLng([lat, lng]);
        vecinoState.userCircle.setRadius(Math.max(accuracy, 120));
      } else {
        vecinoState.userCircle = L.circle([lat, lng], {
          radius: Math.max(accuracy, 120),
          color: '#0284c7',
          weight: 1.5,
          fillColor: '#38bdf8',
          fillOpacity: 0.15
        }).addTo(vecinoState.map);
      }

      if (centrar && vecinoState.map) {
        vecinoState.map.setView([lat, lng], 16, { animate: true });
      }

      // Actualizar distancia en el bottom sheet si está abierto
      if (vecinoState.contenedorSeleccionado) {
        actualizarDistanciaBottomSheet(vecinoState.contenedorSeleccionado);
      }
    },
    error => {
      if (btnGeo) btnGeo.classList.remove('loading');
      console.warn('Geolocalización no disponible:', error.message);
      if (centrar) {
        alert('No se pudo obtener tu ubicación precisa. Verificá los permisos de ubicación en tu navegador.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// Cargar contenedores desde la API
async function cargarContenedores() {
  try {
    const res = await fetch(`${API_GESTION}/api/mapa/contenedores`);
    if (!res.ok) throw new Error('Error al consultar contenedores.');

    const json = await res.json();
    const data = Array.isArray(json) ? json : (json.data || []);
    vecinoState.contenedores = data.filter(c => c.latitud && c.longitud);

    renderContenedoresEnMapa(vecinoState.contenedores);
  } catch (err) {
    console.warn('No se pudieron cargar los contenedores:', err);
  }
}

// Renderizar marcadores de contenedores en el mapa
function renderContenedoresEnMapa(contenedores) {
  if (!vecinoState.map) return;

  // Limpiar marcadores previos
  vecinoState.containerMarkers.forEach(m => m.remove());
  vecinoState.containerMarkers = [];

  // Ícono personalizado para los contenedores (estilo verde circular)
  const containerIcon = L.divIcon({
    className: 'custom-container-marker',
    html: `
      <div style="
        width: 30px; 
        height: 30px; 
        border-radius: 50%; 
        background: #15803d; 
        border: 2px solid #ffffff; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.35); 
        display: flex; 
        align-items: center; 
        justify-content: center;
        color: #ffffff;
        font-size: 0.85rem;
      ">
        <i class="bi bi-trash3-fill"></i>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  contenedores.forEach(c => {
    const marker = L.marker([Number(c.latitud), Number(c.longitud)], {
      icon: containerIcon
    }).addTo(vecinoState.map);

    marker.on('click', () => {
      seleccionarContenedor(c);
    });

    vecinoState.containerMarkers.push(marker);
  });
}

// Seleccionar un contenedor al hacer clic o al buscar el más cercano
function seleccionarContenedor(c) {
  vecinoState.contenedorSeleccionado = c;

  // Centrar mapa
  if (vecinoState.map) {
    vecinoState.map.panTo([Number(c.latitud), Number(c.longitud)], { animate: true });
  }

  // Llenar Bottom Sheet
  const bs = document.getElementById('contenedorBottomSheet');
  const codigoEl = document.getElementById('bsContenedorCodigo');
  const tipoEl = document.getElementById('bsContenedorTipo');
  const dirEl = document.getElementById('bsContenedorDireccion');
  const barrioEl = document.getElementById('bsContenedorBarrio');

  if (codigoEl) codigoEl.textContent = c.codigo || `Contenedor #${c.id_contenedor}`;
  if (tipoEl) tipoEl.textContent = `Tipo: ${c.tipo || 'General'}`;
  
  const direccion = [c.calle, c.esquina ? `esq. ${c.esquina}` : ''].filter(Boolean).join(' ') || 'Ubicación registrada';
  if (dirEl) dirEl.textContent = direccion;
  if (barrioEl) barrioEl.textContent = c.barrio || 'Zona urbana';

  actualizarDistanciaBottomSheet(c);

  if (bs) bs.classList.add('show');
}

function actualizarDistanciaBottomSheet(c) {
  const distEl = document.getElementById('bsContenedorDistancia');
  if (!distEl) return;

  if (vecinoState.ubicacionUsuario) {
    const dist = calcularDistanciaMetros(
      vecinoState.ubicacionUsuario.lat,
      vecinoState.ubicacionUsuario.lng,
      Number(c.latitud),
      Number(c.longitud)
    );
    distEl.innerHTML = `<i class="bi bi-geo-alt-fill text-primary"></i> A <strong>${dist} metros</strong> de ti`;
  } else {
    distEl.innerHTML = `<i class="bi bi-geo-alt"></i> Pulsa en "Mi ubicación" para ver la distancia`;
  }
}

function cerrarBottomSheet() {
  const bs = document.getElementById('contenedorBottomSheet');
  if (bs) bs.classList.remove('show');
}

// Encontrar y seleccionar el contenedor más cercano
function seleccionarContenedorMasCercano() {
  if (!vecinoState.ubicacionUsuario) {
    solicitarGeolocalizacion(true);
    // Esperar a que se actualice
    setTimeout(() => {
      if (vecinoState.ubicacionUsuario) {
        seleccionarContenedorMasCercano();
      }
    }, 1500);
    return;
  }

  if (!vecinoState.contenedores.length) {
    alert('No hay contenedores registrados en el mapa.');
    return;
  }

  let contenedorMasCercano = null;
  let menorDistancia = Infinity;

  vecinoState.contenedores.forEach(c => {
    const dist = calcularDistanciaMetros(
      vecinoState.ubicacionUsuario.lat,
      vecinoState.ubicacionUsuario.lng,
      Number(c.latitud),
      Number(c.longitud)
    );

    if (dist < menorDistancia) {
      menorDistancia = dist;
      contenedorMasCercano = c;
    }
  });

  if (contenedorMasCercano) {
    seleccionarContenedor(contenedorMasCercano);
  }
}

// ==========================================================================
// 4. CREACIÓN DE RECLAMOS / INCIDENCIAS (MODAL Y CÁMARA)
// ==========================================================================
function setupCrearReclamoModal() {
  // Botón flotante central FAB (Cámara)
  document.getElementById('btnFabCrearReclamo')?.addEventListener('click', () => {
    abrirModalCrearReclamoConContenedor(vecinoState.contenedorSeleccionado);
  });

  // Manejo de la subida / captura de foto
  const inputFoto = document.getElementById('inputFotoReclamo');
  const btnTomarFoto = document.getElementById('btnTomarFoto');
  const previewImg = document.getElementById('previewFotoReclamo');
  const previewWrap = document.getElementById('previewFotoWrap');
  const btnQuitarFoto = document.getElementById('btnQuitarFoto');

  btnTomarFoto?.addEventListener('click', () => {
    inputFoto?.click();
  });

  inputFoto?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      vecinoState.fotoBase64 = e.target?.result;
      if (previewImg) previewImg.src = vecinoState.fotoBase64;
      if (previewWrap) previewWrap.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  });

  btnQuitarFoto?.addEventListener('click', () => {
    vecinoState.fotoBase64 = null;
    if (inputFoto) inputFoto.value = '';
    if (previewWrap) previewWrap.classList.add('d-none');
    if (previewImg) previewImg.src = '';
  });

  // Envío del formulario de Reclamo
  const form = document.getElementById('formCrearReclamo');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    await enviarReclamo();
  });
}

function abrirModalCrearReclamoConContenedor(c) {
  cerrarBottomSheet();

  const modalEl = document.getElementById('modalCrearReclamo');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  const inputContenedorId = document.getElementById('reclamoContenedorId');
  const inputContenedorCodigo = document.getElementById('reclamoContenedorCodigo');
  const inputBarrio = document.getElementById('reclamoBarrio');
  const inputCalle = document.getElementById('reclamoCalle');
  const inputEsquina = document.getElementById('reclamoEsquina');
  const selectTipo = document.getElementById('reclamoTipo');
  const inputDesc = document.getElementById('reclamoComentario');

  // Si hay un contenedor seleccionado, autocompletar barrio, calle y esquina
  if (c) {
    if (inputContenedorId) inputContenedorId.value = c.id_contenedor || '';
    if (inputContenedorCodigo) inputContenedorCodigo.value = c.codigo || `Contenedor #${c.id_contenedor}`;
    if (inputBarrio) inputBarrio.value = c.barrio || 'Zona Urbana';
    if (inputCalle) inputCalle.value = c.calle || '';
    if (inputEsquina) inputEsquina.value = c.esquina || '';
  } else {
    if (inputContenedorId) inputContenedorId.value = '';
    if (inputContenedorCodigo) inputContenedorCodigo.value = 'Sin contenedor específico';
    if (inputBarrio && !inputBarrio.value) inputBarrio.value = 'Centro';
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function enviarReclamo() {
  const token = localStorage.getItem('access_token');
  const msgEl = document.getElementById('reclamoMensaje');
  const btnSubmit = document.getElementById('btnSubmitReclamo');

  const tipo = document.getElementById('reclamoTipo')?.value;
  const barrio = document.getElementById('reclamoBarrio')?.value?.trim();
  const calle = document.getElementById('reclamoCalle')?.value?.trim();
  const esquina = document.getElementById('reclamoEsquina')?.value?.trim();
  const comentario = document.getElementById('reclamoComentario')?.value?.trim();
  const idContenedor = document.getElementById('reclamoContenedorId')?.value || null;

  if (!tipo || !barrio || !calle) {
    mostrarMensaje(msgEl, 'Por favor completa el tipo de problema, barrio y calle.', true);
    return;
  }

  const categorias = {
    'Contenedor desbordado': 'Contenedores',
    'Contenedor roto': 'Contenedores',
    'Residuos fuera de lugar': 'Residuos',
    'Demora en la recolección': 'Recolección',
    'Riesgo sanitario / contaminación biológica': 'Riesgo sanitario'
  };

  const categoria = categorias[tipo] || 'Contenedores';
  const referencia = esquina ? `${calle} y ${esquina}` : calle;

  const payload = {
    tipo,
    categoria,
    zona: barrio,
    referencia,
    descripcion: comentario || tipo,
    id_contenedor: idContenedor ? Number(idContenedor) : null,
    foto: vecinoState.fotoBase64 || null
  };

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Enviando reclamo...';
  }

  try {
    const res = await fetch(`${API_GESTION}/api/reclamos`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok || !result.success) {
      throw new Error(result.message || 'No se pudo registrar el reclamo.');
    }

    mostrarMensaje(msgEl, '¡Reclamo enviado con éxito! Ha sido registrado para asignación.', false);

    // Resetear foto y formulario
    document.getElementById('btnQuitarFoto')?.click();
    document.getElementById('formCrearReclamo')?.reset();

    setTimeout(() => {
      const modalEl = document.getElementById('modalCrearReclamo');
      if (modalEl && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      mostrarMensaje(msgEl, '');
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-send-fill me-2"></i> Generar reclamo';
      }

      // Cambiar a la pestaña de reclamos para que el vecino vea su reporte
      switchTab('reclamos');
    }, 1200);

  } catch (err) {
    mostrarMensaje(msgEl, err.message, true);
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="bi bi-send-fill me-2"></i> Generar reclamo';
    }
  }
}

function mostrarMensaje(el, texto, esError = false) {
  if (!el) return;
  el.textContent = texto;
  el.className = `alert mt-3 ${esError ? 'alert-danger' : 'alert-success'} ${texto ? '' : 'd-none'}`;
}

// ==========================================================================
// 5. LISTA DE RECLAMOS ("TUS RECLAMOS")
// ==========================================================================
async function cargarMisReclamos() {
  const token = localStorage.getItem('access_token');
  const container = document.getElementById('listaMisReclamos');
  const countBadge = document.getElementById('totalReclamosBadge');
  const perfilCount = document.getElementById('perfilCantidadReclamos');

  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-5 text-muted">
      <div class="spinner-border spinner-border-sm text-success me-2"></div>
      Cargando tus reclamos...
    </div>
  `;

  try {
    const res = await fetch(`${API_GESTION}/api/reclamos`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Error al cargar reclamos.');

    const json = await res.json();
    vecinoState.reclamos = Array.isArray(json) ? json : (json.data || []);

    if (countBadge) countBadge.textContent = vecinoState.reclamos.length;
    if (perfilCount) perfilCount.textContent = vecinoState.reclamos.length;

    renderListaReclamos(vecinoState.reclamos);
  } catch (err) {
    container.innerHTML = `
      <div class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i> No se pudieron cargar tus reclamos.
      </div>
    `;
  }
}

function renderListaReclamos(reclamos) {
  const container = document.getElementById('listaMisReclamos');
  if (!container) return;

  if (!reclamos.length) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-chat-square-text text-muted fs-1 d-block mb-3"></i>
        <h3 class="fs-6 fw-bold">Aún no realizaste ningún reclamo</h3>
        <p class="text-muted small">Selecciona un contenedor en el mapa o pulsa el botón de la cámara para reportar una incidencia.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = reclamos.map((r, index) => {
    let badgeClass = 'status-sin_asignar';
    let badgeIcon = 'bi-clock-history';
    let estadoTexto = 'Pendiente de asignación';

    if (r.estado === 'asignado') {
      badgeClass = 'status-asignado';
      badgeIcon = 'bi-truck';
      estadoTexto = 'Cuadrilla asignada';
    } else if (r.estado === 'completado') {
      badgeClass = 'status-completado';
      badgeIcon = 'bi-check-circle-fill';
      estadoTexto = 'Resuelto / Atendido';
    }

    const fechaFormateada = r.fecha_reporte 
      ? new Date(r.fecha_reporte).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Fecha reciente';

    return `
      <div class="reclamo-card" onclick="verDetalleReclamo(${index})">
        <div class="reclamo-card-head">
          <div>
            <span class="small text-muted d-block">Nº Reclamo: <strong>${escapeHtml(r.id_reclamo)}</strong></span>
            <strong class="fs-6 text-body">${escapeHtml(r.tipo || r.categoria)}</strong>
          </div>
          <span class="reclamo-badge-status ${badgeClass}">
            <i class="bi ${badgeIcon}"></i> ${estadoTexto}
          </span>
        </div>
        
        <div class="small text-muted mt-2">
          <i class="bi bi-geo-alt-fill text-success"></i> ${escapeHtml(r.referencia || r.zona || 'Ubicación registrada')}
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
          <small class="text-muted"><i class="bi bi-calendar3"></i> ${fechaFormateada}</small>
          <button type="button" class="btn btn-sm btn-outline-success">
            Ver detalle <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Modal Información del Reclamo (Detalles)
window.verDetalleReclamo = function(index) {
  const r = vecinoState.reclamos[index];
  if (!r) return;

  const modalEl = document.getElementById('modalDetalleReclamo');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  document.getElementById('detalleRecId').textContent = r.id_reclamo;
  document.getElementById('detalleRecTipo').textContent = r.tipo || r.categoria;
  document.getElementById('detalleRecFecha').textContent = r.fecha_reporte || '—';
  document.getElementById('detalleRecUbicacion').textContent = `${r.zona || ''} - ${r.referencia || ''}`;
  document.getElementById('detalleRecComentario').textContent = r.descripcion || 'Sin comentarios adicionales.';
  document.getElementById('detalleRecEstado').textContent = r.estado === 'completado' ? 'Completado' : (r.estado === 'asignado' ? 'Asignado' : 'Sin asignar');

  const wrapSolucion = document.getElementById('detalleRecSolucionWrap');
  if (r.resultado) {
    wrapSolucion.classList.remove('d-none');
    document.getElementById('detalleRecSolucion').textContent = r.resultado;
  } else {
    wrapSolucion.classList.add('d-none');
  }

  const wrapFoto = document.getElementById('detalleRecFotoWrap');
  const imgFoto = document.getElementById('detalleRecFoto');
  if (r.foto) {
    wrapFoto.classList.remove('d-none');
    imgFoto.src = r.foto;
  } else {
    wrapFoto.classList.add('d-none');
    imgFoto.src = '';
  }

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
};
