const API_GESTION_STATS = 'http://127.0.0.1:8001';

const monthInput = document.getElementById('statsMonth');
const errorBox = document.getElementById('statsError');
const rankingBody = document.getElementById('rankingBody');
const rankingNote = document.getElementById('rankingUnlinkedNote');
const loadingText = document.getElementById('statsLoading');

const charts = {};
let lastData = null;

function getStatToken() {
  if (typeof getToken === 'function') {
    return getToken();
  }

  return localStorage.getItem('access_token');
}

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

function monthName(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) {
    return value || '';
  }

  const [year, month] = value.split('-').map(Number);

  const text = new Intl.DateTimeFormat('es-UY', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, decimals = 0) {
  return numberValue(value).toLocaleString('es-UY', {
    maximumFractionDigits: decimals
  });
}

function formatPercent(value) {
  return `${formatNumber(value, 1)} %`;
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]
  );
}

function stateLabel(value) {
  const raw = String(value ?? 'Sin estado').trim();
  const key = raw.toLowerCase().replaceAll(' ', '_');

  const labels = {
    sin_asignar: 'Sin asignar',
    asignado: 'Asignado',
    asignada: 'Asignado',
    completado: 'Completado',
    completada: 'Completado',
    resuelto: 'Resuelto',
    resuelta: 'Resuelto',
    cerrado: 'Cerrado',
    cerrada: 'Cerrado',
    en_curso: 'En curso'
  };

  return labels[key] ||
    raw.charAt(0).toUpperCase() + raw.slice(1);
}

function showError(message = '') {
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.toggle('d-none', !message);
}

function setLoading(loading) {
  if (monthInput) {
    monthInput.disabled = loading;
  }

  if (loadingText) {
    loadingText.classList.toggle('d-none', !loading);
  }
}

function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim() || fallback;
}

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    charts[id] = null;
  }
}

function toggleEmpty(id, emptyId, hasData) {
  const canvas = document.getElementById(id);
  const empty = document.getElementById(emptyId);

  if (canvas) {
    canvas.classList.toggle('d-none', !hasData);
  }

  if (empty) {
    empty.classList.toggle('d-none', hasData);
  }
}

function createChart({
  id,
  emptyId,
  type,
  labels,
  values,
  label,
  horizontal = false
}) {
  destroyChart(id);

  const canvas = document.getElementById(id);

  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  const numericValues = values.map(numberValue);

  const hasData = numericValues.some(
    value => value > 0
  );

  toggleEmpty(id, emptyId, hasData);

  if (!hasData) {
    return;
  }

  const text = cssVar('--text', '#f3fff8');
  const muted = cssVar('--muted', '#b7cfc4');
  const line = cssVar('--line', 'rgba(255,255,255,.12)');
  const primary = cssVar('--primary', '#33c27f');
  const secondary = cssVar('--secondary', '#6ee7b7');

  const palette = [
    '#33c27f',
    '#38bdf8',
    '#f59e0b',
    '#a855f7',
    '#ef4444',
    '#14b8a6',
    '#f97316'
  ];

  const circular = type === 'doughnut' || type === 'pie';
  const lineChart = type === 'line';

  charts[id] = new Chart(canvas, {
    type,

    data: {
      labels,

      datasets: [{
        label,
        data: numericValues,

        backgroundColor: circular
          ? labels.map(
            (_, index) => palette[index % palette.length]
          )
          : lineChart
            ? `${primary}22`
            : labels.map(
              (_, index) => palette[index % palette.length]
            ),

        borderColor: lineChart ? secondary : line,
        borderWidth: lineChart ? 2 : 1,
        fill: lineChart,

        tension: lineChart ? 0.28 : undefined,
        pointRadius: lineChart ? 2.5 : undefined,
        pointHoverRadius: lineChart ? 4 : undefined
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',

      plugins: {
        legend: {
          display: circular,
          position: 'bottom',

          labels: {
            color: text,
            usePointStyle: true,
            boxWidth: 9,
            padding: 14,
            font: {
              size: 11
            }
          }
        },

        tooltip: {
          callbacks: {
            label(context) {
              const prefix = circular
                ? `${context.label}: `
                : '';

              return `${prefix}${formatNumber(context.raw)}`;
            }
          }
        }
      },

      scales: circular ? {} : {
        x: {
          beginAtZero: horizontal,

          ticks: {
            color: muted,
            maxRotation: lineChart ? 0 : 35,
            autoSkip: true,
            maxTicksLimit: lineChart ? 12 : 10,
            precision: 0,
            font: {
              size: 10
            }
          },

          grid: {
            color: line
          }
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: muted,
            precision: 0,
            font: {
              size: 10
            }
          },

          grid: {
            color: line
          }
        }
      }
    }
  });
}

function renderSummary(data) {
  const reclamos = data.reclamos || {};
  const sistema = data.sistema || {};
  const desbordamientos = data.desbordamientos || {};

  setText(
    'statRecibidos',
    formatNumber(reclamos.recibidos)
  );

  setText(
    'statPendientes',
    formatNumber(reclamos.pendientes)
  );

  setText(
    'statResueltos',
    formatNumber(reclamos.resueltos)
  );

  setText(
    'statTasaResolucion',
    formatPercent(reclamos.tasa_resolucion_pct)
  );

  const variation =
    reclamos.variacion_vs_mes_anterior_pct;

  if (variation === null || variation === undefined) {
    setText(
      'statVariacion',
      'Sin base de comparación'
    );
  } else {
    const numeric = numberValue(variation);
    const sign = numeric > 0 ? '+' : '';

    setText(
      'statVariacion',
      `${sign}${formatNumber(numeric, 1)} % vs. mes anterior`
    );
  }

  setText(
    'statPendientesDetalle',
    `${formatNumber(reclamos.sin_asignar)} sin asignar · ${formatNumber(reclamos.asignados)} asignados`
  );

  setText(
    'statResueltosDetalle',
    `${formatNumber(reclamos.resueltos)} finalizados en el período`
  );

  setText(
    'statTasaDetalle',
    `${formatNumber(reclamos.resueltos)} de ${formatNumber(reclamos.recibidos)} reclamos`
  );

  setText(
    'statContenedores',
    formatNumber(sistema.contenedores_activos)
  );

  setText(
    'statCamiones',
    formatNumber(sistema.camiones_activos)
  );

  setText(
    'statCuadrillas',
    formatNumber(sistema.cuadrillas)
  );

  setText(
    'statIncidencias',
    formatNumber(sistema.incidencias_mes)
  );

  setText(
    'statDesbordamientos',
    formatNumber(desbordamientos.total_mes)
  );

  setText(
    'statsUsuariosTotal',
    formatNumber(data.usuarios?.total)
  );
}

function renderCharts(data) {
  const porTipo = Array.isArray(data.reclamos_por_tipo)
    ? data.reclamos_por_tipo
    : [];

  const porEstado = Array.isArray(data.reclamos_por_estado)
    ? data.reclamos_por_estado
    : [];

  const porDia = Array.isArray(data.reclamos_por_dia)
    ? data.reclamos_por_dia
    : [];

  const porRol = Array.isArray(data.usuarios?.por_rol)
    ? data.usuarios.por_rol
    : [];

  createChart({
    id: 'chartPeriodo',
    emptyId: 'emptyPeriodo',
    type: 'line',

    labels: porDia.map(item => {
      const parts = String(item.fecha || '').split('-');

      return parts.length === 3
        ? `${parts[2]}/${parts[1]}`
        : item.fecha;
    }),

    values: porDia.map(item => item.total),
    label: 'Reclamos'
  });

  createChart({
    id: 'chartEstado',
    emptyId: 'emptyEstado',
    type: 'doughnut',
    labels: porEstado.map(
      item => stateLabel(item.estado)
    ),
    values: porEstado.map(item => item.total),
    label: 'Reclamos'
  });

  createChart({
    id: 'chartTipo',
    emptyId: 'emptyTipo',
    type: 'bar',
    labels: porTipo.map(
      item => item.tipo || 'Sin tipo'
    ),
    values: porTipo.map(item => item.total),
    label: 'Reclamos',
    horizontal: porTipo.length > 4
  });

  createChart({
    id: 'chartUsuariosRol',
    emptyId: 'emptyUsuariosRol',
    type: 'bar',
    labels: porRol.map(
      item => item.rol || 'Sin rol'
    ),
    values: porRol.map(item => item.total),
    label: 'Usuarios',
    horizontal: true
  });
}

function renderRanking(data) {
  if (!rankingBody) return;

  const ranking = Array.isArray(
    data.ranking_desbordamientos
  )
    ? data.ranking_desbordamientos
    : [];

  if (!ranking.length) {
    rankingBody.innerHTML = `
      <tr>
        <td colspan="4" class="stats-table-empty">
          No hay contenedores con reportes de desbordamiento vinculados en este mes.
        </td>
      </tr>
    `;
  } else {
    rankingBody.innerHTML = ranking.map(
      (item, index) => `
        <tr>
          <td>
            <span class="stats-rank">${index + 1}</span>
          </td>

          <td>
            <strong>
              ${escapeHtml(
        item.codigo ||
        `Contenedor #${item.id_contenedor}`
      )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
        item.circuito || 'Sin circuito'
      )}
          </td>

          <td>
            <strong>
              ${formatNumber(item.reportes)}
            </strong>
          </td>
        </tr>
      `
    ).join('');
  }

  const unlinked = numberValue(
    data.desbordamientos?.sin_contenedor
  );

  if (rankingNote) {
    if (unlinked > 0) {
      rankingNote.textContent =
        `${formatNumber(unlinked)} reporte${unlinked === 1 ? '' : 's'} de desbordamiento no tiene${unlinked === 1 ? '' : 'n'} un contenedor vinculado y no participa${unlinked === 1 ? '' : 'n'} del ranking.`;

      rankingNote.classList.remove('d-none');
    } else {
      rankingNote.textContent = '';
      rankingNote.classList.add('d-none');
    }
  }
}

function renderStats(data) {
  lastData = data;

  setText(
    'statsMonthTitle',
    `Resumen de ${monthName(
      data.mes || monthInput?.value
    )}`
  );

  renderSummary(data);
  renderCharts(data);
  renderRanking(data);
}

async function loadStats() {
  showError('');
  setLoading(true);

  const token = getStatToken();

  if (!token) {
    window.location.replace(
      '../landing-page/login.html'
    );

    return;
  }

  const month = monthInput?.value || currentMonth();

  try {
    const response = await fetch(
      `${API_GESTION_STATS}/api/estadisticas?mes=${encodeURIComponent(month)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.status === 401) {
      localStorage.removeItem('access_token');

      window.location.replace(
        '../landing-page/login.html'
      );

      return;
    }

    const result = await response.json()
      .catch(() => ({}));

    if (!response.ok || !result.success) {
      const detail = result.error
        ? ` ${result.error}`
        : '';

      throw new Error(
        (result.message ||
          `Error HTTP ${response.status}.`) +
        detail
      );
    }

    if (monthInput && result.data?.mes) {
      monthInput.value = result.data.mes;
    }

    renderStats(result.data || {});

  } catch (error) {
    console.error(
      'Error cargando estadísticas:',
      error
    );

    showError(
      error.message ||
      'No se pudieron cargar las estadísticas.'
    );

    if (rankingBody) {
      rankingBody.innerHTML = `
        <tr>
          <td
            colspan="4"
            class="stats-table-empty text-danger"
          >
            No se pudo cargar el ranking.
          </td>
        </tr>
      `;
    }

  } finally {
    setLoading(false);
  }
}

if (monthInput) {
  monthInput.value = currentMonth();
  monthInput.max = currentMonth();

  monthInput.addEventListener(
    'change',
    loadStats
  );
}

const themeObserver = new MutationObserver(
  mutations => {
    const changed = mutations.some(
      mutation =>
        mutation.attributeName === 'data-theme'
    );

    if (changed && lastData) {
      renderCharts(lastData);
    }
  }
);

themeObserver.observe(
  document.documentElement,
  {
    attributes: true,
    attributeFilter: ['data-theme']
  }
);

loadStats();
