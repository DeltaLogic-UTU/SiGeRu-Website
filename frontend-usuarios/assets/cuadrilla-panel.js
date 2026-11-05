(() => {
  'use strict';

  const BASE = 'http://127.0.0.1:8001';
  const API = `${BASE}/api`;
  const $ = id => document.getElementById(id);
  const list = value => Array.isArray(value) ? value : [];

  const safe = value => String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );

  const text = (value, fallback = 'No indicado') =>
    value === null || value === undefined || value === ''
      ? fallback
      : String(value);

  const normalizeCode = value =>
    String(value ?? '').trim().toUpperCase();

  const personName = person =>
    [person?.nombre, person?.apellido].filter(Boolean).join(' ');

  let panel = null;
  let tasks = [];
  let containers = [];
  let circuits = [];
  let historyEntries = [];

  let selectedTask = null;
  let selectedDetail = null;
  let previewURL = null;
  let loading = false;
  let mapaCentrado = false;
  const INTERVALO_ACTUALIZACION = 30000;

  let map = null;
  let circuitLayer = null;
  let containerLayer = null;
  let taskLayer = null;
  let truckLayer = null;

  let mapErrors = [];

  function jwt() {
    if (typeof getToken === 'function') {
      const token = getToken();
      if (token) return token;
    }

    return localStorage.getItem('access_token');
  }

  async function api(path, method = 'GET', body = null) {
    const token = jwt();

    if (!token) {
      throw new Error(
        'No hay una sesión activa. Iniciá sesión nuevamente.'
      );
    }

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    };

    const options = { method, headers, cache: 'no-store' };

    if (body instanceof FormData) {
      options.body = body;
    } else if (body !== null) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;

    try {
      response = await fetch(API + path, options);
    } catch {
      throw new Error(
        'No se pudo conectar con la API Gestión (puerto 8001).'
      );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      const validation =
        Object.values(result.errors || {}).flat()[0];

      throw new Error(
        validation ||
        result.message ||
        `Error HTTP ${response.status}`
      );
    }

    return result.data ?? result;
  }

  function notify(message, error = false) {
    const element = $('cqAlert');
    if (!element) return;

    element.textContent = message;
    element.className =
      `alert ${error ? 'alert-danger' : 'alert-success'}`;
  }

  function clearNotice() {
    const element = $('cqAlert');
    if (!element) return;

    element.className = 'alert d-none';
    element.textContent = '';
  }

  function empty(message) {
    return `<div class="cq-empty">${safe(message)}</div>`;
  }

  function row(label, value) {
    return `
      <div class="cq-item">
        <div class="cq-item-subtitle">${safe(label)}</div>
        <div class="cq-item-title">${safe(text(value))}</div>
      </div>
    `;
  }

  function formatDate(value) {
    if (!value || value === 'Pendiente') {
      return 'No registrada';
    }

    const parsed = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    if (String(value).includes(':')) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return parsed.toLocaleString('es-UY', options);
  }

  function point(lat, lng) {
    if (
      lat === null || lat === undefined || lat === '' ||
      lng === null || lng === undefined || lng === ''
    ) {
      return null;
    }

    const a = Number(lat);
    const b = Number(lng);

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      Math.abs(a) > 90 ||
      Math.abs(b) > 180 ||
      (a === 0 && b === 0)
    ) {
      return null;
    }

    return [a, b];
  }

  function coordinates(item) {
    if (!item || typeof item !== 'object') return null;

    return point(
      item.latitud ?? item.lat ?? item.latitude,
      item.longitud ?? item.lng ?? item.lon ?? item.longitude
    );
  }

  function containerCoordinates(container) {
    return (
      coordinates(container) ||
      coordinates(container?.ubicacion)
    );
  }

  function address(item) {
    if (!item) return '';

    if (
      typeof item.ubicacion === 'string' &&
      item.ubicacion.trim()
    ) {
      return item.ubicacion.trim();
    }

    const location =
      item.ubicacion && typeof item.ubicacion === 'object'
        ? item.ubicacion
        : item;

    return [
      location.calle ?? item.calle,
      location.altura ?? item.altura,
      location.barrio ?? item.barrio,
      location.zona ?? item.zona,
      location.referencia ?? item.referencia
    ].filter(Boolean).join(', ');
  }

  function mapsLink(item) {
    const location = coordinates(item);
    const destination = location
      ? location.join(',')
      : address(item);

    return destination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      : '';
  }

  function imageURL(value) {
    if (!value || typeof value !== 'string') return null;

    try {
      const raw = value.trim();

      const url = /^https?:\/\//i.test(raw)
        ? new URL(raw)
        : new URL(
          raw.startsWith('/')
            ? raw
            : `/storage/${raw.replace(/^storage\//, '')}`,
          BASE
        );

      const allowed = [
        new URL(BASE).origin,
        window.location.origin
      ];

      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }

      return allowed.includes(url.origin)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function photo(value, label) {
    const url = imageURL(value);
    if (!url) return '';

    return `
      <div class="mt-3">
        <div class="cq-item-subtitle mb-2">
          ${safe(label)}
        </div>
        <a href="${safe(url)}"
           target="_blank"
           rel="noopener noreferrer">
          <img
            src="${safe(url)}"
            alt="${safe(label)}"
            class="cq-detail-photo"
            loading="lazy">
        </a>
      </div>
    `;
  }

  function modal(id) {
    return bootstrap.Modal.getOrCreateInstance($(id));
  }

  function openInfo(title, html) {
    $('cqInfoTitle').textContent = title;
    $('cqInfoBody').innerHTML = html;
    modal('cqInfoModal').show();
  }

  function geometry(raw) {
    if (!raw) return null;

    if (typeof raw !== 'string') return raw;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function polygonPoint(value) {
    if (Array.isArray(value)) {
      return point(value[0], value[1]);
    }

    if (value && typeof value === 'object') {
      return coordinates(value);
    }

    return null;
  }

  function collectPolygons(node, output = []) {
    if (!Array.isArray(node) || !node.length) {
      return output;
    }

    if (polygonPoint(node[0])) {
      const polygon = node.map(polygonPoint).filter(Boolean);

      if (polygon.length >= 3) {
        output.push(polygon);
      }

      return output;
    }

    node.forEach(child => collectPolygons(child, output));
    return output;
  }

  function polygons(raw) {
    const data = geometry(raw);
    if (!data) return [];

    if (data.type === 'Feature') {
      return polygons(data.geometry);
    }

    if (data.type === 'FeatureCollection') {
      return list(data.features).flatMap(polygons);
    }

    if (data.type === 'Polygon') {
      return list(data.coordinates)
        .map(ring =>
          list(ring)
            .map(p => point(p[1], p[0]))
            .filter(Boolean)
        )
        .filter(ring => ring.length >= 3);
    }

    if (data.type === 'MultiPolygon') {
      return list(data.coordinates).flatMap(coords =>
        polygons({
          type: 'Polygon',
          coordinates: coords
        })
      );
    }

    return collectPolygons(data);
  }

  function splitCodes(value) {
    if (value == null) return [];

    if (Array.isArray(value)) {
      return value.flatMap(splitCodes);
    }

    if (typeof value === 'object') {
      return splitCodes(
        value.id_circuito ??
        value.codigo ??
        value.circuito
      );
    }

    const raw = String(value).trim();

    if (!raw) return [];

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        return splitCodes(parsed);
      } catch {
      }
    }

    return raw
      .split(/[,;|]/)
      .map(normalizeCode)
      .filter(Boolean);
  }


  function activeRoutes() {
    return list(panel?.rutas).filter(route =>
      ['ASIGNADA', 'EN CURSO'].includes(normalizeCode(route.estado)) &&
      !route.fecha_finalizacion
    );
  }


  function truckIsCollecting(truck) {
    const idRuta = Number(truck?.id_ruta);
    if (!Number.isInteger(idRuta) || idRuta <= 0) return false;

    const activo = truck?.recorrido_activo;
    if (activo !== undefined && activo !== null) {
      return activo === true || activo === 1 || activo === '1';
    }

    return ['RECOLECTANDO', 'EN RECORRIDO', 'EN RUTA']
      .includes(normalizeCode(truck?.estado));
  }


  function linkedTruckCodes() {
    const codes = new Set();

    list(panel?.camiones).forEach(truck => {
      splitCodes(truck.circuito).forEach(code => codes.add(code));
      splitCodes(truck.circuitos).forEach(code => codes.add(code));
      splitCodes(truck.ruta_circuito).forEach(code => codes.add(code));
    });

    return codes;
  }

  function assignedCodes() {
    const codes = new Set();
    const byId = new Map(
      containers
        .filter(container => container.id_contenedor != null)
        .map(container => [String(container.id_contenedor), container])
    );


    tasks.forEach(task => {
      splitCodes(task.circuito).forEach(code => codes.add(code));

      const container = byId.get(String(task.id_contenedor));
      if (container) {
        splitCodes(container.circuito).forEach(code => codes.add(code));
      }
    });


    activeRoutes().forEach(route => {
      splitCodes(route.circuito).forEach(code => codes.add(code));
      splitCodes(route.circuitos).forEach(code => codes.add(code));
    });


    linkedTruckCodes().forEach(code => codes.add(code));
    return codes;
  }

  function circuitCode(circuit) {
    return normalizeCode(
      circuit.id_circuito ??
      circuit.codigo ??
      circuit.circuito
    );
  }

  function assignedCircuits() {
    const codes = assignedCodes();
    if (!codes.size) return [];
    return circuits.filter(circuit => codes.has(circuitCode(circuit)));
  }

  function assignedContainers() {

    const taskIds = new Set(
      tasks
        .filter(task => task.id_contenedor != null)
        .map(task => String(task.id_contenedor))
    );


    const routeCodes = linkedTruckCodes();
    activeRoutes().forEach(route => {
      splitCodes(route.circuito).forEach(code => routeCodes.add(code));
      splitCodes(route.circuitos).forEach(code => routeCodes.add(code));
    });

    if (!taskIds.size && !routeCodes.size) return [];

    return containers.filter(container =>
      taskIds.has(String(container.id_contenedor)) ||
      splitCodes(container.circuito).some(code => routeCodes.has(code))
    );
  }

  function circuitMunicipality(code) {
    const circuit = circuits.find(item =>
      circuitCode(item) === normalizeCode(code)
    );

    return circuit?.municipio ?? null;
  }


  function initMap() {
    if (typeof L === 'undefined') {
      if ($('cqMapNote')) {
        $('cqMapNote').textContent =
          'No se pudo cargar Leaflet.';
      }
      return;
    }

    if (!$('cqMap')) return;

    map = L.map('cqMap', {
      scrollWheelZoom: false
    }).setView([-34.9, -56.16], 11);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    ).addTo(map);

    circuitLayer = L.featureGroup().addTo(map);
    containerLayer = L.featureGroup().addTo(map);
    taskLayer = L.featureGroup().addTo(map);
    truckLayer = L.featureGroup().addTo(map);

    [
      ['cqShowCircuitos', circuitLayer],
      ['cqShowContainers', containerLayer],
      ['cqShowTasks', taskLayer],
      ['cqShowTrucks', truckLayer]
    ].forEach(([id, layer]) => {
      const checkbox = $(id);
      if (!checkbox) return;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          layer.addTo(map);
        } else {
          map.removeLayer(layer);
        }

        fitMap();
      });
    });

    $('cqMapFit')?.addEventListener('click', fitMap);

    setTimeout(() => map.invalidateSize(), 150);
  }

  function renderCircuits() {
    if (!map) return;

    circuitLayer.clearLayers();

    assignedCircuits().forEach(circuit => {
      const code = circuitCode(circuit);

      const shapes = polygons(
        circuit.coordenadas ??
        circuit.geometria ??
        circuit.poligono
      );

      shapes.forEach(shape => {
        L.polygon(shape, {
          color: '#087c61',
          weight: 2,
          fillColor: '#27b58b',
          fillOpacity: 0.19
        })
          .bindPopup(`
            <strong>Circuito ${safe(code)}</strong>
            <div>Municipio:
              ${safe(text(circuit.municipio))}
            </div>
            <div>Zona:
              ${safe(text(circuit.zona))}
            </div>
            <div>Estado:
              ${safe(text(circuit.estado))}
            </div>
            <div>Contenedores registrados:
              ${safe(text(circuit.total_contenedores, '0'))}
            </div>
          `)
          .addTo(circuitLayer);
      });
    });
  }

  function containerColor(container) {
    const incidenciaVioleta =
      container.incidencia_violeta === true ||
      container.incidencia_violeta === 1 ||
      container.incidencia_violeta === '1' ||
      container.nivel_recoleccion === 'violeta';

    if (incidenciaVioleta) {
      return '#a855f7';
    }

    const days = Number(container.dias_sin_recoleccion);

    if (!Number.isFinite(days) || days < 0) {
      return '#64748b';
    }

    if (days <= 2) return '#159b72';
    if (days <= 5) return '#e2a23b';

    return '#d84e52';
  }

  function renderContainers() {
    if (!map) return;

    containerLayer.clearLayers();

    assignedContainers().forEach(container => {
      const location = containerCoordinates(container);
      if (!location) return;

      const municipio =
        container.municipio ??
        container.ubicacion?.municipio ??
        circuitMunicipality(container.circuito);

      const incidenciaVioleta =
        containerColor(container) === '#a855f7';

      L.circleMarker(location, {
        radius: 5,
        color: '#ffffff',
        weight: 1,
        fillColor: containerColor(container),
        fillOpacity: 0.95
      })
        .bindPopup(`
        <strong>Contenedor
          ${safe(text(container.codigo))}
        </strong>

        <div>Circuito:
          ${safe(text(container.circuito))}
        </div>

        <div>Municipio:
          ${safe(text(municipio))}
        </div>

        <div>Barrio:
          ${safe(text(
          container.barrio ??
          container.ubicacion?.barrio
        ))}
        </div>

        <div>Estado:
          ${incidenciaVioleta
            ? 'Incidencia pendiente'
            : safe(text(container.estado))}
        </div>

        <div>Días sin recolección:
          ${safe(text(container.dias_sin_recoleccion))}
        </div>
      `)
        .addTo(containerLayer);
    });

    renderContainersSummary();
  }

  function renderContainersSummary() {
    const element = $('cqContainersSummary');
    if (!element) return;

    const assigned = assignedCircuits();
    const visibleContainers = assignedContainers();

    if (!assigned.length) {
      element.innerHTML = empty(
        'No se encontraron circuitos vinculados a las rutas asignadas.'
      );
      return;
    }

    element.innerHTML = assigned.map(circuit => {
      const code = circuitCode(circuit);

      const matching = visibleContainers.filter(container =>
        normalizeCode(container.circuito) === code
      );

      const located = matching.filter(container =>
        containerCoordinates(container)
      ).length;

      return `
        <article class="cq-item">
          <div class="cq-item-title">
            Circuito ${safe(code)}
          </div>

          <div class="cq-item-subtitle">
            Municipio: ${safe(text(circuit.municipio))}
          </div>

          <div class="cq-item-subtitle">
            Zona: ${safe(text(circuit.zona))}
          </div>

          <div class="cq-item-subtitle">
            Contenedores: ${matching.length}
          </div>

          <div class="cq-item-subtitle">
            Ubicados en mapa: ${located}
          </div>
        </article>
      `;
    }).join('');
  }

  function truckCoordinates(truck) {
    const direct = coordinates(truck);
    if (direct) return direct;

    const gps = truck.gps;
    if (!gps) return null;

    if (typeof gps === 'object') {
      return coordinates(gps);
    }

    const parsed = geometry(gps);

    if (parsed && typeof parsed === 'object') {
      return coordinates(parsed);
    }

    const values = String(gps).split(',');

    return values.length === 2
      ? point(values[0], values[1])
      : null;
  }

  function taskKey(task) {
    return `${task.kind}:${task.id}`;
  }

  function taskTitle(task) {
    return text(
      task.tipo || task.categoria,
      task.kind === 'reclamo' ? 'Reclamo' : 'Incidencia'
    );
  }

  function renderMap(centrar = false) {
    if (!map) return;

    renderCircuits();
    renderContainers();

    taskLayer.clearLayers();
    truckLayer.clearLayers();

    tasks.forEach(task => {
      const location = coordinates(task);
      if (!location) return;

      const marker = L.circleMarker(location, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor:
          task.kind === 'reclamo'
            ? '#df982e'
            : '#d34d55',
        fillOpacity: 1
      });

      marker.bindPopup(`
        <strong>${safe(taskTitle(task))}</strong>
        <div>${safe(task.kind)} N.º ${safe(task.id)}</div>
        <div>${safe(address(task) || 'Ubicación registrada')}</div>
        <button
          type="button"
          class="btn btn-success btn-sm mt-2"
          data-map-task="${safe(taskKey(task))}">
          Ver tarea
        </button>
      `);

      marker.addTo(taskLayer);
    });

    list(panel?.camiones).forEach(truck => {
      const location = truckCoordinates(truck);
      if (!location) return;

      L.marker(location)
        .bindPopup(`
          <strong>Camión ${safe(text(truck.matricula))}</strong>
          <div>Estado: ${safe(text(truck.estado))}</div>
          <div>${safe(
          truckIsCollecting(truck)
            ? 'Acompañando recorrido activo'
            : 'Vinculado a la cuadrilla; sin recorrido activo confirmado'
        )}</div>
          <div>Circuito asignado: ${safe(text(truck.circuito))}</div>
          <div>Ruta actual: ${safe(text(truck.id_ruta, 'Sin ruta'))}</div>
        `)
        .addTo(truckLayer);
    });

    [
      ['cqShowCircuitos', circuitLayer],
      ['cqShowContainers', containerLayer],
      ['cqShowTasks', taskLayer],
      ['cqShowTrucks', truckLayer]
    ].forEach(([id, layer]) => {
      const checkbox = $(id);

      if (!checkbox || checkbox.checked) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);
      }
    });


    if (centrar) fitMap();

    const note = $('cqMapNote');

    if (note) {
      const codes = assignedCodes();

      let message =
        `${assignedCircuits().length} circuitos asignados · ` +
        `${circuitLayer.getLayers().length} polígonos · ` +
        `${containerLayer.getLayers().length} contenedores ubicados · ` +
        `${taskLayer.getLayers().length} tareas ubicadas · ` +
        `${truckLayer.getLayers().length} camiones con GPS.`;

      if (!codes.size) {
        message +=
          ' No hay circuitos identificados en las rutas asignadas.';
      }

      const sinUbicacion = tasks.length - taskLayer.getLayers().length;
      if (sinUbicacion > 0) {
        message += ` ${sinUbicacion} tarea(s) sin coordenadas registradas; ` +
          'siguen disponibles en la lista.';
      }

      if (mapErrors.length) {
        message += ' ' + mapErrors.join(' ');
      }

      note.textContent = message;
    }
  }

  function fitMap() {
    if (!map) return;

    map.invalidateSize();

    const layers = [
      circuitLayer,
      containerLayer,
      taskLayer,
      truckLayer
    ]
      .filter(layer => layer && map.hasLayer(layer))
      .flatMap(layer => layer.getLayers());

    if (!layers.length) return;

    const bounds = L.featureGroup(layers).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15), {
        maxZoom: 15,
        padding: [20, 20]
      });
    }
  }


  function extractArray(data, keys) {
    if (Array.isArray(data)) return data;

    for (const key of keys) {
      if (Array.isArray(data?.[key])) {
        return data[key];
      }
    }

    return [];
  }

  async function loadMapData() {
    mapErrors = [];
    const results = await Promise.allSettled([
      api('/mapa/contenedores'),
      api('/mapa/circuitos')
    ]);

    if (results[0].status === 'fulfilled') {
      containers = extractArray(results[0].value, [
        'contenedores', 'items', 'resultados'
      ]);
    } else {

      containers = [];
      mapErrors.push('No se pudieron actualizar los contenedores; se ocultaron los datos anteriores.');
      console.error('Contenedores:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      circuits = extractArray(results[1].value, [
        'circuitos', 'items', 'resultados'
      ]);
    } else {
      circuits = [];
      mapErrors.push('No se pudieron actualizar los circuitos; se ocultaron los datos anteriores.');
      console.error('Circuitos:', results[1].reason);
    }
  }

  function completeLocations() {
    const byId = new Map();

    containers.forEach(container => {
      if (container.id_contenedor != null) {
        byId.set(String(container.id_contenedor), container);
      }
    });

    tasks.forEach(task => {
      if (
        coordinates(task) ||
        task.id_contenedor == null
      ) {
        return;
      }

      const container = byId.get(String(task.id_contenedor));
      if (!container) return;

      const location = containerCoordinates(container);
      if (!location) return;

      task.latitud = location[0];
      task.longitud = location[1];

      const source =
        typeof container.ubicacion === 'object' &&
          container.ubicacion
          ? container.ubicacion
          : container;

      task.calle ||= source.calle ?? container.calle;
      task.barrio ||= source.barrio ?? container.barrio;
    });
  }


  function renderCrews() {
    $('cqCrews').innerHTML = list(panel?.cuadrillas).map(crew => `
      <article class="cq-item">
        <div class="d-flex justify-content-between gap-2">
          <strong class="cq-item-title">
            Cuadrilla ${safe(crew.id_cuadrilla)}
          </strong>
          <span class="cq-item-subtitle">
            ${safe(text(crew.estado))}
          </span>
        </div>

        <div class="cq-item-subtitle mt-1">
          Responsable:
          ${safe(
      [crew.responsable_nombre, crew.responsable_apellido]
        .filter(Boolean).join(' ') || 'Sin asignar'
    )}
        </div>

        <button
          type="button"
          class="btn btn-outline-success btn-sm mt-2"
          data-info-type="crew"
          data-info-id="${safe(crew.id_cuadrilla)}">
          Ver equipo
        </button>
      </article>
    `).join('') || empty('No hay cuadrillas asignadas.');
  }

  function renderTrucks() {
    $('cqTrucks').innerHTML = list(panel?.camiones).map(truck => `
      <article class="cq-item">
        <div class="d-flex justify-content-between gap-2">
          <strong class="cq-item-title">
            ${safe(text(truck.matricula, 'Camión'))}
          </strong>
          <span class="cq-item-subtitle">
            ${safe(text(truck.estado))}
          </span>
        </div>

        <div class="cq-item-subtitle">
          Circuito asignado: ${safe(text(truck.circuito))}
        </div>
        <div class="cq-item-subtitle">
          ${truckIsCollecting(truck)
        ? 'En recorrido'
        : 'Camión vinculado · Sin recolección iniciada'}
        </div>

        <button
          type="button"
          class="btn btn-outline-success btn-sm mt-2"
          data-info-type="truck"
          data-info-id="${safe(truck.id_camion)}">
          Ver camión
        </button>
      </article>
    `).join('') || empty('No hay camiones vinculados.');
  }

  function renderRoutes() {
    $('cqRoutes').innerHTML = activeRoutes().map(route => {
      const codes = splitCodes(route.circuitos ?? route.circuito);
      const municipalities = [
        ...new Set(codes.map(circuitMunicipality).filter(Boolean))
      ];
      const enCurso = normalizeCode(route.estado) === 'EN CURSO';
      const idAsignacion = Number(route.id_asignacion);

      return `
        <article class="cq-item">
          <div class="cq-item-title">
            ${safe(text(route.nombre || route.circuito, 'Ruta'))}
          </div>
          <div class="cq-item-subtitle">
            Circuitos: ${safe(codes.join(', ') || 'No indicados')}
          </div>
          <div class="cq-item-subtitle">
            Municipio: ${safe(municipalities.join(', ') || text(route.municipio))}
          </div>
          <div class="cq-item-subtitle">
            Estado: ${safe(text(route.estado))}
          </div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn btn-outline-success btn-sm"
              data-info-type="route" data-info-id="${safe(route.id_ruta)}">
              Ver ruta
            </button>
            ${Number.isInteger(idAsignacion) && idAsignacion > 0 ? `
              <button type="button" class="btn btn-success btn-sm"
                data-iniciar-recorrido="${idAsignacion}"
                data-estado-recorrido="${safe(route.estado)}">
                <i class="bi ${enCurso ? 'bi-arrow-right-circle' : 'bi-play-circle'}"></i>
                ${enCurso ? 'Continuar' : 'Iniciar'}
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('') || empty('No hay rutas asignadas o en curso.');
  }

  let iniciandoRecorrido = false;

  async function iniciarRutaCuadrilla(boton) {
    if (boton.disabled || iniciandoRecorrido) return;

    const id = Number(boton.dataset.iniciarRecorrido);
    if (!Number.isInteger(id) || id <= 0) return;

    const destino = `cuadrilla-en-curso.html?asignacion=${id}`;
    if (normalizeCode(boton.dataset.estadoRecorrido) === 'EN CURSO') {
      window.location.href = destino;
      return;
    }

    iniciandoRecorrido = true;
    boton.disabled = true;

    try {
      await api(`/cuadrilla/recorridos/${id}/iniciar`, 'POST');
      alert('Recorrido iniciado.');
      window.location.href = destino;
    } catch (error) {
      notify(error.message || 'No se pudo iniciar la ruta.', true);
      boton.disabled = false;
    } finally {
      iniciandoRecorrido = false;
    }
  }

  function showInfo(type, id) {
    if (type === 'crew') {
      const crew = list(panel?.cuadrillas).find(item =>
        String(item.id_cuadrilla) === String(id)
      );

      if (!crew) return;

      const members = list(crew.integrantes);

      openInfo(`Cuadrilla ${id}`, [
        row('Estado', crew.estado),
        row('Turno', crew.turno),
        row('Responsable', [
          crew.responsable_nombre,
          crew.responsable_apellido
        ].filter(Boolean).join(' ')),
        row('Integrantes activos', members.length),
        '<h3 class="h6 mt-3">Equipo</h3>',
        members.map(member =>
          row('Integrante', personName(member))
        ).join('') || empty('Sin integrantes registrados.')
      ].join(''));
    }

    if (type === 'truck') {
      const truck = list(panel?.camiones).find(item =>
        String(item.id_camion) === String(id)
      );

      if (!truck) return;

      openInfo(`Camión ${text(truck.matricula)}`, [
        row('Matrícula', truck.matricula),
        row('Estado', truck.estado),
        row('Chofer', [
          truck.chofer_nombre,
          truck.chofer_apellido
        ].filter(Boolean).join(' ')),
        row('Circuito', truck.circuito),
        row('Ruta', truck.id_ruta),
        row('Cuadrilla', truck.id_cuadrilla),
        row('GPS', truckCoordinates(truck)?.join(', '))
      ].join(''));
    }

    if (type === 'route') {
      const route = list(panel?.rutas).find(item =>
        String(item.id_ruta) === String(id)
      );

      if (!route) return;

      const codes = splitCodes(
        route.circuitos ?? route.circuito
      );

      const municipalities = [
        ...new Set(
          codes.map(circuitMunicipality).filter(Boolean)
        )
      ];

      openInfo(`Ruta ${text(route.nombre || id)}`, [
        row('Identificador', route.id_ruta),
        row('Nombre', route.nombre),
        row('Circuitos', codes.join(', ')),
        row(
          'Municipio',
          municipalities.join(', ') || route.municipio
        ),
        row('Estado', route.estado),
        row('Prioridad', route.prioridad),
        row('Cuadrilla', route.id_cuadrilla)
      ].join(''));
    }
  }


  function buildTasks() {
    tasks = [
      ...list(panel?.reclamos).map(item => ({
        ...item,
        kind: 'reclamo',
        id: item.id ?? item.id_reclamo
      })),

      ...list(panel?.incidencias).map(item => ({
        ...item,
        kind: 'incidencia',
        id: item.id ?? item.id_incidencia
      }))
    ];

    tasks.sort((a, b) =>
      new Date(b.fecha_reporte || 0) -
      new Date(a.fecha_reporte || 0)
    );
  }

  function renderMetrics() {
    $('cqClaimsCount').textContent =
      list(panel?.reclamos).length;

    $('cqIncidentsCount').textContent =
      list(panel?.incidencias).length;

    $('cqTasksCount').textContent = tasks.length;
  }

  function renderCrewFilter() {
    const select = $('cqTaskCrew');
    const previous = select.value;

    select.innerHTML = `
      <option value="all">Todas mis cuadrillas</option>
      ${list(panel?.cuadrillas).map(crew => `
        <option value="${safe(crew.id_cuadrilla)}">
          Cuadrilla ${safe(crew.id_cuadrilla)}
        </option>
      `).join('')}
    `;

    if ([...select.options].some(option =>
      option.value === previous
    )) {
      select.value = previous;
    }
  }

  function filteredTasks() {
    const query = $('cqTaskSearch').value.trim().toLowerCase();
    const type = $('cqTaskType').value;
    const crew = $('cqTaskCrew').value;

    return tasks.filter(task => {
      if (type !== 'all' && task.kind !== type) return false;

      if (
        crew !== 'all' &&
        String(task.id_cuadrilla) !== crew
      ) {
        return false;
      }

      const searchable = [
        task.id,
        task.tipo,
        task.categoria,
        task.descripcion,
        typeof task.ubicacion === 'string'
          ? task.ubicacion
          : '',
        task.calle,
        task.barrio,
        task.zona,
        task.referencia,
        task.id_contenedor,
        task.circuito
      ].join(' ').toLowerCase();

      return !query || searchable.includes(query);
    });
  }

  function renderTasks() {
    const filtered = filteredTasks();

    $('cqTasksSummary').textContent =
      `${filtered.length} de ${tasks.length} tareas`;

    $('cqTasks').innerHTML = filtered.map(task => {
      const key = taskKey(task);
      const destination = mapsLink(task);

      return `
        <article class="cq-item">
          <div class="d-flex justify-content-between gap-2">
            <strong class="cq-item-title">
              ${safe(taskTitle(task))}
            </strong>

            <span class="badge text-bg-secondary">
              ${task.kind === 'reclamo'
          ? 'Reclamo'
          : 'Incidencia'}
            </span>
          </div>

          <div class="cq-item-subtitle mt-1">
            N.º ${safe(task.id)} ·
            Cuadrilla ${safe(text(task.id_cuadrilla))}
          </div>

          <p class="small mt-2 mb-1">
            ${safe(text(task.descripcion, 'Sin descripción'))}
          </p>

          <div class="cq-item-subtitle">
            <i class="bi bi-geo-alt"></i>
            ${safe(address(task) || 'Sin ubicación registrada')}
          </div>

          <div class="cq-task-actions">
            <button
              type="button"
              class="btn btn-outline-success btn-sm"
              data-task-action="view"
              data-task-key="${safe(key)}">
              Ver detalle
            </button>

            <button
              type="button"
              class="btn btn-success btn-sm"
              data-task-action="resolve"
              data-task-key="${safe(key)}">
              Resolver
            </button>

            ${destination ? `
              <a
                class="btn btn-outline-secondary btn-sm"
                href="${safe(destination)}"
                target="_blank"
                rel="noopener noreferrer">
                Cómo llegar
              </a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('') || empty(
      'No hay tareas que coincidan con los filtros.'
    );
  }

  function findTask(key) {
    return tasks.find(task => taskKey(task) === key);
  }

  function taskDetails(task) {
    const fields = [
      row('Tipo de tarea', task.kind),
      row('Identificador', task.id),
      row('Estado', task.estado),
      row('Cuadrilla', task.id_cuadrilla),
      row('Tipo', task.tipo),
      row('Descripción', task.descripcion),
      row('Fecha de reporte', formatDate(task.fecha_reporte)),
      row('Ubicación', address(task))
    ];

    if (task.kind === 'reclamo') {
      fields.push(
        row('Categoría', task.categoria),
        row('Prioridad', task.prioridad),
        row('Zona', task.zona),
        row('Referencia', task.referencia),
        row('Contenedor', task.id_contenedor),
        photo(task.foto, 'Fotografía del reclamo')
      );
    } else {
      fields.push(
        row('Contenedor', task.id_contenedor),
        row('Camión', task.id_camion),
        row('Recurso', task.tipo_recurso)
      );
    }

    const destination = mapsLink(task);

    if (destination) {
      fields.push(`
        <a
          href="${safe(destination)}"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-outline-success btn-sm mt-3">
          Cómo llegar
        </a>
      `);
    }

    return fields.join('');
  }

  function renderSelectedDetail() {
    const task = findTask(selectedDetail);

    if (!task) {
      selectedDetail = null;
      $('cqTaskDetail').innerHTML = empty(
        'Seleccioná una tarea para consultar sus datos.'
      );
      return;
    }

    $('cqTaskDetail').innerHTML = `
      <div class="cq-item-title">
        ${safe(taskTitle(task))} · N.º ${safe(task.id)}
      </div>

      <p class="cq-small mt-2">
        ${safe(text(task.descripcion, 'Sin descripción'))}
      </p>

      <div class="cq-item-subtitle">
        ${safe(address(task) || 'Sin ubicación registrada')}
      </div>

      <div class="cq-task-actions">
        <button
          type="button"
          class="btn btn-outline-success btn-sm"
          data-task-action="view"
          data-task-key="${safe(selectedDetail)}">
          Ver información completa
        </button>

        <button
          type="button"
          class="btn btn-success btn-sm"
          data-task-action="resolve"
          data-task-key="${safe(selectedDetail)}">
          Resolver tarea
        </button>
      </div>
    `;
  }

  function openTaskDetail(key) {
    const task = findTask(key);
    if (!task) return;

    selectedDetail = key;
    renderSelectedDetail();

    $('cqDetailTitle').textContent =
      `${taskTitle(task)} · N.º ${task.id}`;

    $('cqDetailBody').innerHTML = taskDetails(task);
    $('cqDetailResolve').dataset.taskKey = key;

    modal('cqDetailModal').show();
  }


  function clearPreview() {
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }

    previewURL = null;

    $('cqResolvePhotoPreview').removeAttribute('src');
    $('cqResolvePhotoPreview').classList.add('d-none');
  }

  function openResolve(key) {
    const task = findTask(key);

    if (!task) {
      notify('La tarea ya no está disponible.', true);
      return;
    }

    selectedTask = key;

    $('cqResolveForm').reset();
    $('cqResolveError').classList.add('d-none');
    $('cqResolveError').textContent = '';

    clearPreview();

    $('cqResolveTitle').textContent =
      `Resolver ${task.kind} N.º ${task.id}`;

    $('cqResolveInfo').textContent =
      `${taskTitle(task)} · ${address(task) || 'Sin dirección'}`;

    $('cqResolveText').maxLength =
      task.kind === 'reclamo' ? 255 : 2000;

    $('cqResolvePhotoGroup').hidden =
      task.kind !== 'reclamo';

    $('cqResolvePhoto').disabled =
      task.kind !== 'reclamo';

    const detail = $('cqDetailModal');

    if (detail.classList.contains('show')) {
      detail.addEventListener(
        'hidden.bs.modal',
        () => modal('cqResolveModal').show(),
        { once: true }
      );

      modal('cqDetailModal').hide();
    } else {
      modal('cqResolveModal').show();
    }
  }

  async function submitResolve(event) {
    event.preventDefault();

    const task = findTask(selectedTask);
    if (!task) return;

    const result = $('cqResolveText').value.trim();

    if (result.length < 5) {
      $('cqResolveError').textContent =
        'Describí el trabajo realizado con al menos 5 caracteres.';

      $('cqResolveError').classList.remove('d-none');
      return;
    }

    const button = $('cqResolveSave');
    button.disabled = true;

    try {
      const form = new FormData();

      if (task.kind === 'reclamo') {
        form.append('resultado', result);

        const file = $('cqResolvePhoto').files[0];

        if (file) {
          if (![
            'image/jpeg',
            'image/png',
            'image/webp'
          ].includes(file.type)) {
            throw new Error(
              'La fotografía debe ser JPG, PNG o WebP.'
            );
          }

          if (file.size > 5 * 1024 * 1024) {
            throw new Error(
              'La fotografía no puede superar 5 MB.'
            );
          }

          form.append('foto_resultado', file);
        }
      } else {
        form.append('resolucion', result);
      }

      const endpoint = task.kind === 'reclamo'
        ? `/cuadrilla/reclamos/${encodeURIComponent(task.id)}/resolver`
        : `/cuadrilla/incidencias/${encodeURIComponent(task.id)}/resolver`;

      await api(endpoint, 'POST', form);

      modal('cqResolveModal').hide();
      selectedTask = null;

      const updated = await loadPanel();

      if (updated) {
        await loadHistory();
        notify('La tarea fue completada correctamente.');
      } else {
        notify(
          'La tarea se completó, pero no se pudo actualizar el panel.',
          true
        );
      }
    } catch (error) {
      $('cqResolveError').textContent = error.message;
      $('cqResolveError').classList.remove('d-none');
    } finally {
      button.disabled = false;
    }
  }


  async function loadHistory() {
    const crews = list(panel?.cuadrillas);
    const element = $('cqHistory');

    if (!crews.length) {
      element.innerHTML = empty(
        'No hay cuadrillas para consultar.'
      );
      return;
    }

    element.innerHTML = empty('Cargando historial…');

    const results = await Promise.allSettled(
      crews.map(async crew => ({
        crew: crew.id_cuadrilla,
        data: await api(
          `/cuadrillas/${encodeURIComponent(crew.id_cuadrilla)}/historiales`
        )
      }))
    );

    const entries = [];
    let failures = 0;

    results.forEach(result => {
      if (result.status !== 'fulfilled') {
        failures++;
        console.warn(
          'Error al consultar historial:',
          result.reason
        );
        return;
      }

      const { crew, data } = result.value;

      list(data.reclamos).forEach(item => {
        if (
          normalizeCode(item.estado) !== 'COMPLETADO'
        ) return;

        entries.push({
          kind: 'Reclamo',
          id: item.reclamo ?? item.id_reclamo,
          crew,
          state: item.estado,
          when:
            item.finalizacion ??
            item.fecha_finalizacion,
          details: item
        });
      });

      list(data.incidencias).forEach(item => {
        if (
          normalizeCode(item.estado) !== 'RESUELTA'
        ) return;

        entries.push({
          kind: 'Incidencia',
          id: item.id_incidencia,
          crew,
          state: item.estado,
          when:
            item.fecha_resolucion ??
            item.fecha_finalizacion,
          details: item
        });
      });

      list(data.limpieza).forEach(item => {
        if (
          normalizeCode(item.estado) !== 'FINALIZADA'
        ) return;

        entries.push({
          kind: 'Limpieza de circuito',
          id: item.circuito ?? item.id_ruta,
          crew,
          state: item.estado,
          when:
            item.finalizacion ??
            item.fecha_finalizacion,
          details: item
        });
      });
    });

    entries.sort((a, b) =>
      new Date(b.when || 0) -
      new Date(a.when || 0)
    );

    historyEntries = entries;

    element.innerHTML = entries.map((entry, index) => `
      <article class="cq-item">
        <div class="cq-item-title">
          ${safe(entry.kind)} ${safe(text(entry.id, ''))}
        </div>

        <div class="cq-item-subtitle">
          Cuadrilla ${safe(entry.crew)} ·
          ${safe(entry.state)}
        </div>

        <div class="cq-item-subtitle">
          ${safe(formatDate(entry.when))}
        </div>

        <button
          type="button"
          class="btn btn-outline-success btn-sm mt-2"
          data-history-index="${index}">
          Ver registro
        </button>
      </article>
    `).join('') || empty(
      'Todavía no hay trabajos completados.'
    );

    if (failures) {
      element.insertAdjacentHTML('afterbegin', `
        <p class="cq-small text-warning">
          No se pudo consultar el historial de
          ${failures} cuadrilla(s).
        </p>
      `);
    }
  }

  function openHistory(index) {
    const entry = historyEntries[index];
    if (!entry) return;

    const item = entry.details;

    const fields = [
      row('Cuadrilla', entry.crew),
      row('Estado', entry.state),
      row(
        'Fecha de finalización',
        formatDate(entry.when)
      )
    ];

    if (entry.kind === 'Reclamo') {
      fields.push(
        row('Reclamo', item.reclamo ?? item.id_reclamo),
        row('Tipo', item.tipo),
        row('Categoría', item.categoria),
        row('Descripción', item.descripcion),
        row('Prioridad', item.prioridad),
        row('Ubicación', item.ubicacion),
        row('Zona', item.zona),
        row('Referencia', item.referencia),
        row('Resultado del trabajo', item.resultado),
        photo(item.foto, 'Fotografía original'),
        photo(
          item.foto_resultado,
          'Fotografía del trabajo completado'
        )
      );
    } else if (entry.kind === 'Incidencia') {
      fields.push(
        row('Incidencia', item.id_incidencia),
        row('Código', item.codigo),
        row('Tipo', item.tipo),
        row('Descripción', item.descripcion),
        row(
          'Resolución',
          item.resolucion ?? item.detalle_resolucion
        )
      );
    } else {
      fields.push(
        row('Circuito', item.circuito),
        row('Ruta', item.nombre),
        row('Municipio', item.municipio),
        row('Prioridad', item.prioridad),
        row(
          'Asignación',
          formatDate(
            item.asignacion ?? item.fecha_asignacion
          )
        )
      );
    }

    openInfo(
      `${entry.kind} ${text(entry.id, '')}`,
      fields.join('')
    );
  }


  async function loadPanel() {
    if (loading) return false;

    loading = true;
    $('cqRefresh').disabled = true;

    try {
      const nuevoPanel = await api('/cuadrilla/mi-panel');
      if (!nuevoPanel || typeof nuevoPanel !== 'object' || Array.isArray(nuevoPanel)) {
        throw new Error('La API devolvió un panel de cuadrilla inválido.');
      }

      let errorRecorridos = null;
      try {
        const rutasVigentes = await api('/cuadrilla/recorridos');
        if (!Array.isArray(rutasVigentes)) {
          throw new Error('Respuesta de recorridos inválida.');
        }

        const rutasPanel = list(nuevoPanel.rutas);
        nuevoPanel.rutas = rutasVigentes.map(asignacion => ({
          ...rutasPanel.find(route =>
            String(route.id_ruta) === String(asignacion.id_ruta) &&
            String(route.id_cuadrilla) === String(asignacion.id_cuadrilla)
          ),
          ...asignacion
        }));
      } catch (error) {
        console.warn('No se pudieron consultar recorridos:', error);
        errorRecorridos =
          'No se pudieron actualizar los recorridos manuales. ' +
          'Las demás funciones continúan disponibles.';
      }

      panel = nuevoPanel;
      buildTasks();

      await loadMapData();
      if (errorRecorridos) mapErrors.push(errorRecorridos);
      completeLocations();

      $('cqUser').textContent =
        personName(panel.usuario) ||
        'Usuario de cuadrilla';

      renderMetrics();
      renderCrews();
      renderTrucks();
      renderRoutes();
      renderCrewFilter();
      renderTasks();
      renderSelectedDetail();
      renderMap(!mapaCentrado);
      if (map) mapaCentrado = true;

      if (mapErrors.length) {
        notify(mapErrors.join(' '), true);
      } else {
        clearNotice();
      }

      return true;
    } catch (error) {
      console.error('Error del panel:', error);
      notify(error.message, true);
      return false;
    } finally {
      loading = false;
      $('cqRefresh').disabled = false;
    }
  }


  function firmaActividad() {
    const pendientes = tasks.map(task => taskKey(task));
    const recorridos = activeRoutes().map(route =>
      `ruta:${route.id_asignacion ?? route.id_ruta}:${route.estado}`
    );

    return [...pendientes, ...recorridos].sort().join('|');
  }

  async function refreshAll(forceHistory = false) {
    if (loading) return false;
    const anterior = firmaActividad();
    const updated = await loadPanel();
    if (updated && (forceHistory || anterior !== firmaActividad())) {
      await loadHistory();
    }
    return updated;
  }

  function setupEvents() {
    $('cqRefresh').addEventListener('click', () => refreshAll(true));

    $('cqHistoryRefresh').addEventListener(
      'click',
      loadHistory
    );

    [
      'cqTaskSearch',
      'cqTaskType',
      'cqTaskCrew'
    ].forEach(id => {
      $(id).addEventListener(
        id === 'cqTaskSearch' ? 'input' : 'change',
        renderTasks
      );
    });

    document.addEventListener('click', event => {
      const taskButton =
        event.target.closest('[data-task-action]');

      if (taskButton) {
        const key = taskButton.dataset.taskKey;

        if (taskButton.dataset.taskAction === 'view') {
          openTaskDetail(key);
        } else {
          openResolve(key);
        }

        return;
      }

      const botonRecorrido =
        event.target.closest('[data-iniciar-recorrido]');
      if (botonRecorrido) {
        iniciarRutaCuadrilla(botonRecorrido);
        return;
      }

      const infoButton =
        event.target.closest('[data-info-type]');

      if (infoButton) {
        showInfo(
          infoButton.dataset.infoType,
          infoButton.dataset.infoId
        );
        return;
      }

      const historyButton =
        event.target.closest('[data-history-index]');

      if (historyButton) {
        openHistory(
          Number(historyButton.dataset.historyIndex)
        );
        return;
      }

      const mapButton =
        event.target.closest('[data-map-task]');

      if (mapButton) {
        openTaskDetail(mapButton.dataset.mapTask);
      }
    });

    $('cqDetailResolve').addEventListener('click', () => {
      const key = $('cqDetailResolve').dataset.taskKey;
      if (key) openResolve(key);
    });

    $('cqResolveForm').addEventListener(
      'submit',
      submitResolve
    );

    $('cqResolvePhoto').addEventListener('change', event => {
      clearPreview();

      const file = event.target.files[0];
      if (!file) return;

      previewURL = URL.createObjectURL(file);

      $('cqResolvePhotoPreview').src = previewURL;
      $('cqResolvePhotoPreview').classList.remove('d-none');
    });

    $('cqResolveModal').addEventListener(
      'hidden.bs.modal',
      () => {
        selectedTask = null;
        clearPreview();
      }
    );

    document.querySelectorAll(
      '.cq-header-navigation a[href^="#"]'
    ).forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(
          link.getAttribute('href')
        );

        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        if (target.id === 'cqMapSection' && map) {
          setTimeout(() => {
            map.invalidateSize();
            fitMap();
          }, 350);
        }
      });
    });
  }


  document.addEventListener('DOMContentLoaded', async () => {
    setupEvents();
    initMap();

    await refreshAll(true);

    const refreshWhenVisible = () => {
      if (
        document.hidden ||
        loading ||
        document.querySelector('.modal.show')
      ) return;
      refreshAll().catch(error => console.error('Actualización de cuadrillas:', error));
    };

    setInterval(refreshWhenVisible, INTERVALO_ACTUALIZACION);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
  });

})();
