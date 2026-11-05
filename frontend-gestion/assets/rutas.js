const API_GESTION_RUTAS = 'http://127.0.0.1:8001';
const MAX_DIAS_FRECUENCIA = 14;

const $ruta = id => document.getElementById(id);

let rutasActuales = [];
let rutasExpandidas = false;
let historialLimite = 20;
let historialCargado = false;

const escRuta = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

function fechaRuta(value) {
  if (!value) return '—';

  const partes = String(value).slice(0, 10).split('-');

  if (partes.length !== 3) {
    return escRuta(value);
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function numeroRuta(value) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
}

function diasFrecuenciaRuta(value) {
  const frecuencia = String(value ?? '').trim();

  const match = frecuencia.match(
    /^Cada\s+(\d+)\s+d[ií]as?$/iu
  );

  if (match) {
    return Math.max(1, Math.min(30, Number(match[1])));
  }

  if (/^Cada\s+d[ií]a$/iu.test(frecuencia)) {
    return 1;
  }

  return 3;
}

function prepararSelectorFrecuenciaRuta() {
  const selector = $ruta('frecuenciaRutaDias');
  if (!selector) return;

  selector.replaceChildren();

  const indicacion = new Option(
    'Seleccioná una frecuencia',
    ''
  );

  indicacion.disabled = true;
  selector.add(indicacion);

  for (
    let dias = 1;
    dias <= MAX_DIAS_FRECUENCIA;
    dias++
  ) {
    selector.add(new Option(
      dias === 1
        ? 'Cada día'
        : `Cada ${dias} días`,
      String(dias)
    ));
  }
}

async function apiRutas(path, options = {}) {
  const token = typeof getToken === 'function'
    ? getToken()
    : null;

  if (!token) {
    throw new Error(
      'Iniciá sesión para consultar las rutas.'
    );
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const respuesta = await fetch(
    `${API_GESTION_RUTAS}/api/${path}`,
    {
      ...options,
      headers
    }
  );

  const json = await respuesta.json().catch(
    () => ({})
  );

  if (!respuesta.ok || json.success === false) {
    const errores = json.errors
      ? Object.values(json.errors).flat().join(' ')
      : '';

    throw new Error(
      errores ||
      json.message ||
      `Error HTTP ${respuesta.status}`
    );
  }

  return json.data ?? [];
}

function badgeRuta(estado) {
  const estilos = {
    'Pendiente': 'bg-secondary',
    'Asignada': 'bg-info text-dark',
    'En curso': 'bg-primary',
    'Finalizada': 'bg-success',
    'Vencida': 'bg-danger',
    'Hoy': 'bg-warning text-dark',
    'Al día': 'bg-success'
  };

  const clase = estilos[estado] || 'bg-secondary';

  return `
    <span class="badge ${clase}">
      ${escRuta(estado || 'Pendiente')}
    </span>
  `;
}

function asignacionRuta(ruta) {
  if (!ruta.camion_asignado) {
    return '<span class="text-muted-custom">Sin asignar</span>';
  }

  return `
    <div class="rutas-asignacion">
      <strong>
        <i class="bi bi-truck"></i>
        ${escRuta(ruta.camion_asignado)}
      </strong>
      <span class="small text-muted-custom">
        Chofer: ${escRuta(ruta.chofer_asignado || '—')}
      </span>
    </div>
  `;
}


function filtrarRutas() {
  const texto = $ruta('rutaFiltroTexto')
    .value.trim().toLocaleLowerCase();

  const municipio = $ruta('rutaFiltroMunicipio').value;
  const estado = $ruta('rutaFiltroEstado').value;

  const filtradas = rutasActuales.filter(ruta => {
    const busqueda =
      `${ruta.circuito || ''} ${ruta.nombre || ''}`
        .toLocaleLowerCase();

    return (
      (!texto || busqueda.includes(texto)) &&
      (!municipio || ruta.municipio === municipio) &&
      (
        !estado ||
        (ruta.estado_operacion || 'Pendiente') === estado
      )
    );
  });

  const rutasVisibles = rutasExpandidas
    ? filtradas
    : filtradas.slice(0, 4);

  const cuerpo = $ruta('rutasTableBody');

  cuerpo.innerHTML = rutasVisibles.map(ruta => {
    const id = numeroRuta(ruta.id_ruta);
    const estado = ruta.estado_operacion || 'Pendiente';

    return `
      <tr>
        <td>
          <strong>
            ${escRuta(ruta.circuito || '—')}
          </strong>
          <div class="small text-muted-custom">
            ${escRuta(ruta.nombre || '')}
          </div>
        </td>

        <td>
          ${escRuta(ruta.municipio || '—')}
        </td>

        <td>
          <span class="rutas-frecuencia">
            ${escRuta(ruta.frecuencia || 'Cada 3 días')}
          </span>
        </td>

        <td>
          ${numeroRuta(ruta.contenedores)}
        </td>

        <td>
          ${fechaRuta(ruta.ultima_recoleccion)}
        </td>

        <td>
          <div>
            ${fechaRuta(ruta.proxima_recoleccion)}
          </div>
          <div class="mt-1">
            ${badgeRuta(ruta.estado_planificacion)}
          </div>
        </td>

        <td>
          ${asignacionRuta(ruta)}
        </td>

        <td>
          ${badgeRuta(estado)}
        </td>

        <td>
          <div class="rutas-acciones">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              data-editar-frecuencia="${id}"
              aria-label="Editar frecuencia del circuito ${escRuta(ruta.circuito)}"
              title="Editar frecuencia"
            >
              <i class="bi bi-pencil-square"></i>
              Editar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `
    <tr>
      <td colspan="9" class="text-center text-muted py-4">
        No hay rutas con estos filtros.
      </td>
    </tr>
  `;

  const contar = estado =>
    rutasActuales.filter(
      r => (r.estado_operacion || 'Pendiente') === estado
    ).length;

  $ruta('rutasResumen').innerHTML = `
    <span>
      Mostrando
      <strong>${rutasVisibles.length}</strong>
      de ${filtradas.length} rutas filtradas
      (${rutasActuales.length} en total)
    </span>

    <span>
      Pendientes:
      <strong>${contar('Pendiente')}</strong>
    </span>

    <span>
      Asignadas:
      <strong>${contar('Asignada')}</strong>
    </span>

    <span>
      En curso:
      <strong>${contar('En curso')}</strong>
    </span>

    <span>
      Finalizadas:
      <strong>${contar('Finalizada')}</strong>
    </span>
  `;

  actualizarDesplegableRutas(filtradas.length);
}


function actualizarDesplegableRutas(totalFiltradas) {
  let boton = $ruta('btnVerMasRutas');

  if (!boton) {
    const tabla = $ruta('rutasTableBody')
      .closest('table');

    if (!tabla) return;

    const wrapper =
      tabla.closest('.table-responsive') || tabla;

    const contenedor = document.createElement('div');

    contenedor.className = 'text-center py-3';
    contenedor.id = 'contenedorVerMasRutas';

    boton = document.createElement('button');

    boton.id = 'btnVerMasRutas';
    boton.type = 'button';
    boton.className = 'btn btn-outline btn-sm';

    contenedor.appendChild(boton);

    wrapper.insertAdjacentElement(
      'afterend',
      contenedor
    );

    boton.addEventListener('click', () => {
      rutasExpandidas = !rutasExpandidas;
      filtrarRutas();
    });
  }

  const contenedor = boton.parentElement;

  contenedor.hidden = totalFiltradas <= 4;

  if (totalFiltradas <= 4) {
    rutasExpandidas = false;
    return;
  }

  if (rutasExpandidas) {
    boton.innerHTML = `
      <i class="bi bi-chevron-up"></i>
      Mostrar menos
    `;

    boton.setAttribute('aria-expanded', 'true');
  } else {
    boton.innerHTML = `
      <i class="bi bi-chevron-down"></i>
      Ver todas las rutas (${totalFiltradas})
    `;

    boton.setAttribute('aria-expanded', 'false');
  }
}


async function cargarHistorial() {
  const parametros = new URLSearchParams({
    limite: String(historialLimite)
  });

  const ruta = $ruta('rutaHistorialFiltro').value;
  const estado = $ruta('rutaHistorialEstado').value;
  const mes = $ruta('rutaHistorialMes').value;

  if (ruta) {
    parametros.set('id_ruta', ruta);
  }

  if (estado) {
    parametros.set('estado', estado);
  }

  if (mes) {
    parametros.set('mes', mes);
  }

  const cuerpo = $ruta('rutasHistoryBody');

  cuerpo.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-3">
        Cargando historial...
      </td>
    </tr>
  `;

  try {
    const items = await apiRutas(
      `rutas/historial?${parametros.toString()}`
    );

    if (!Array.isArray(items)) {
      throw new Error(
        'El historial tiene un formato incorrecto.'
      );
    }

    cuerpo.innerHTML = items.map(item => `
      <tr>
        <td>
          ${fechaRuta(item.fecha_fin || item.fecha_inicio)}
        </td>

        <td>
          ${escRuta(item.circuito || '—')}
        </td>

        <td>
          ${escRuta(item.matricula || '—')}
        </td>

        <td>
          ${escRuta(item.id_cuadrilla || '—')}
        </td>

        <td>
          ${numeroRuta(item.contenedores_recolectados)}
        </td>

        <td>
          ${numeroRuta(item.peso_recolectado_kg)
        .toLocaleString('es-UY')} kg
        </td>

        <td>
          ${badgeRuta(item.estado)}
        </td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          No hay registros para estos filtros.
        </td>
      </tr>
    `;

    $ruta('historialConteo').textContent =
      `${items.length} registros mostrados`;

    $ruta('historialMas').disabled =
      items.length < historialLimite ||
      historialLimite >= 250;

    historialCargado = true;

  } catch (error) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger py-3">
          ${escRuta(error.message)}
        </td>
      </tr>
    `;

    $ruta('historialConteo').textContent =
      'No se pudo cargar el historial.';

    $ruta('historialMas').disabled = true;
  }
}


async function cargarRutas() {
  const anteriorMunicipio =
    $ruta('rutaFiltroMunicipio').value;

  const anteriorHistorial =
    $ruta('rutaHistorialFiltro').value;

  const datos = await apiRutas('rutas');

  if (!Array.isArray(datos)) {
    throw new Error(
      'La API devolvió un formato de rutas incorrecto.'
    );
  }

  rutasActuales = datos;

  const municipios = [
    ...new Set(
      rutasActuales
        .map(r => r.municipio)
        .filter(Boolean)
    )
  ].sort();

  $ruta('rutaFiltroMunicipio').innerHTML =
    '<option value="">Todos</option>' +
    municipios.map(m => `
      <option value="${escRuta(m)}">
        ${escRuta(m)}
      </option>
    `).join('');

  $ruta('rutaFiltroMunicipio').value =
    municipios.includes(anteriorMunicipio)
      ? anteriorMunicipio
      : '';

  $ruta('rutaHistorialFiltro').innerHTML =
    '<option value="">Todas</option>' +
    rutasActuales.map(r => `
      <option value="${numeroRuta(r.id_ruta)}">
        ${escRuta(r.circuito || r.nombre)}
      </option>
    `).join('');

  $ruta('rutaHistorialFiltro').value = anteriorHistorial;

  filtrarRutas();

  if (historialCargado) {
    await cargarHistorial();
  }
}


function abrirModalFrecuencia(id) {
  const ruta = rutasActuales.find(
    r => numeroRuta(r.id_ruta) === Number(id)
  );

  if (!ruta) {
    alert('No se encontró la ruta.');
    return;
  }

  $ruta('frecuenciaRutaId').value = ruta.id_ruta;

  $ruta('frecuenciaRutaNombre').textContent =
    `Circuito ${ruta.circuito || '—'} — ${ruta.nombre || ''}`;

  const dias = diasFrecuenciaRuta(ruta.frecuencia);
  const selector = $ruta('frecuenciaRutaDias');

  const dentroDelCiclo =
    dias >= 1 && dias <= MAX_DIAS_FRECUENCIA;

  selector.value = dentroDelCiclo ? String(dias) : '';

  const mensaje = $ruta('frecuenciaRutaMensaje');

  if (dentroDelCiclo) {
    mensaje.textContent = '';
    mensaje.className = 'small mt-2';
  } else {
    mensaje.textContent =
      `La frecuencia actual (${ruta.frecuencia}) supera los 14 días. ` +
      'Seleccioná una nueva frecuencia para modificarla.';

    mensaje.className = 'small mt-2 text-warning';
  }

  bootstrap.Modal.getOrCreateInstance(
    $ruta('modalFrecuenciaRuta')
  ).show();
}

async function guardarFrecuencia(evento) {
  evento.preventDefault();

  const id = Number(
    $ruta('frecuenciaRutaId').value
  );

  const dias = Number(
    $ruta('frecuenciaRutaDias').value
  );

  const boton = $ruta('btnGuardarFrecuencia');
  const mensaje = $ruta('frecuenciaRutaMensaje');

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !Number.isInteger(dias) ||
    dias < 1 ||
    dias > MAX_DIAS_FRECUENCIA
  ) {
    mensaje.textContent =
      'Seleccioná una frecuencia válida.';

    mensaje.className = 'small mt-2 text-danger';
    return;
  }

  boton.disabled = true;

  mensaje.textContent = 'Guardando frecuencia...';
  mensaje.className = 'small mt-2';

  try {
    await apiRutas(
      `rutas/${id}/frecuencia`,
      {
        method: 'PATCH',
        body: JSON.stringify({ dias })
      }
    );

    const rutaEditada = rutasActuales.find(
      ruta => numeroRuta(ruta.id_ruta) === id
    );

    if (rutaEditada) {
      rutaEditada.frecuencia = `Cada ${dias} días`;
      filtrarRutas();
    }

    try {
      await cargarRutas();

    } catch (error) {
      mensaje.textContent =
        'La frecuencia se guardó, pero no se pudo ' +
        'actualizar el listado: ' + error.message;

      mensaje.className = 'small mt-2 text-warning';
      return;
    }

    bootstrap.Modal.getOrCreateInstance(
      $ruta('modalFrecuenciaRuta')
    ).hide();

  } catch (error) {
    mensaje.textContent = error.message;
    mensaje.className = 'small mt-2 text-danger';

  } finally {
    boton.disabled = false;
  }
}


$ruta('btnRefrescarRutas').addEventListener(
  'click',
  async () => {
    try {
      await cargarRutas();
    } catch (error) {
      alert(error.message);
    }
  }
);

[
  'rutaFiltroTexto',
  'rutaFiltroMunicipio',
  'rutaFiltroEstado'
].forEach(id => {
  $ruta(id).addEventListener('input', () => {
    rutasExpandidas = false;
    filtrarRutas();
  });
});

$ruta('rutasTableBody').addEventListener(
  'click',
  evento => {
    const boton = evento.target.closest(
      '[data-editar-frecuencia]'
    );

    if (!boton) return;

    abrirModalFrecuencia(
      boton.dataset.editarFrecuencia
    );
  }
);

$ruta('formFrecuenciaRuta').addEventListener(
  'submit',
  guardarFrecuencia
);

$ruta('historialRutasCollapse').addEventListener(
  'shown.bs.collapse',
  () => {
    if (!historialCargado) {
      cargarHistorial();
    }
  }
);

[
  'rutaHistorialFiltro',
  'rutaHistorialEstado',
  'rutaHistorialMes'
].forEach(id => {
  $ruta(id).addEventListener('change', () => {
    historialLimite = 20;
    cargarHistorial();
  });
});

$ruta('historialMas').addEventListener(
  'click',
  () => {
    historialLimite = Math.min(
      250,
      historialLimite + 20
    );

    cargarHistorial();
  }
);

prepararSelectorFrecuenciaRuta();

cargarRutas().catch(error => {
  $ruta('rutasTableBody').innerHTML = `
    <tr>
      <td colspan="9" class="text-center text-danger py-4">
        ${escRuta(error.message)}
      </td>
    </tr>
  `;
});
