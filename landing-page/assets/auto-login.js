/**
 * =========================================================================
 * MÓDULO INDEPENDIENTE DE INICIO DE SESIÓN AUTOMÁTICO (MODO DESARROLLO/DEMO)
 * =========================================================================
 * Este archivo es 100% independiente para facilitar pruebas rápidas.
 * Para ELIMINARLO completamente en el futuro, solo se debe:
 * 1. Borrar este archivo (assets/auto-login.js)
 * 2. Quitar la línea <script src="assets/auto-login.js"></script> en login.html
 * =========================================================================
 */
(function () {
  const API_USUARIOS = 'http://127.0.0.1:8000';

  const USUARIOS_DEMO = [
    {
      grupo: 'Choferes de camión',
      usuarios: [
        { email: 'albert@sigeru.uy', rol: 'chofer', nombre: 'Albert Einstein', detalle: 'Camión SBK-3265 · Scania P250 (Circuito CH_102)', badge: 'Scania P250' },
        { email: 'leonardo@sigeru.uy', rol: 'chofer', nombre: 'Leonardo da Vinci', detalle: 'Camión SAE-5268 · Iveco Eurocargo (Circuito C_102)', badge: 'Iveco Eurocargo' },
        { email: 'frida@sigeru.uy', rol: 'chofer', nombre: 'Frida Kahlo', detalle: 'Camión SCE-1235 · VW Constellation (En base)', badge: 'VW Constellation' },
        { email: 'julio@sigeru.uy', rol: 'chofer', nombre: 'Julio Cortázar', detalle: 'Camión SDT-5632 · Scania P280 (Dirigiéndose a vertedero)', badge: 'Scania P280' },
        { email: 'chofer@sigeru.uy', rol: 'chofer', nombre: 'Chofer Demo', detalle: 'Usuario general de pruebas para chofer', badge: 'Demo' }
      ]
    },
    {
      grupo: 'Administración y Supervisión',
      usuarios: [
        { email: 'admin@sigeru.uy', rol: 'administrador', nombre: 'Administrador General', detalle: 'Gestión operativa completa, mapa y rutas', badge: 'Gestión' }
      ]
    },
    {
      grupo: 'Operativa e Instalaciones',
      usuarios: [
        { email: 'cuadrilla@sigeru.uy', rol: 'cuadrilla', nombre: 'Cuadrilla de Recolección', detalle: 'Servicio de recolección y reclamos', badge: 'Cuadrilla' },
        { email: 'operario@sigeru.uy', rol: 'operario', nombre: 'Operario de Instalaciones', detalle: 'Control de plantas y mantenimiento', badge: 'Operario' }
      ]
    },
    {
      grupo: 'Vecinos',
      usuarios: [
        { email: 'vecino@sigeru.uy', rol: 'vecino', nombre: 'Vecino Demo', detalle: 'Reportes ciudadanos y seguimiento', badge: 'Vecino' },
        { email: 'prueba@sigeru.uy', rol: 'vecino', nombre: 'Vecino Prueba 1', detalle: 'Usuario vecino verificado', badge: 'Vecino' }
      ]
    }
  ];

  const PAGINAS_POR_ROL = {
    administrador: '../frontend-gestion/administrador.html',
    supervisor: '../frontend-gestion/administrador.html',
    chofer: '../frontend-usuarios/chofer.html',
    cuadrilla: '../frontend-usuarios/cuadrilla.html',
    operario: '../frontend-usuarios/operario.html',
    vecino: '../frontend-usuarios/vecino.html'
  };

  // Estilos encapsulados para que no dependa de editar style.css
  function inyectarEstilos() {
    if (document.getElementById('autoLoginDevStyles')) return;
    const style = document.createElement('style');
    style.id = 'autoLoginDevStyles';
    style.textContent = `
      .dev-autologin-box {
        margin-top: 1.5rem;
        padding: 1.1rem;
        border-radius: 14px;
        background: color-mix(in srgb, var(--panel, #10291f) 92%, #0284c7 8%);
        border: 2px dashed rgba(2, 132, 199, .45);
        box-shadow: 0 8px 24px rgba(0, 0, 0, .22);
      }
      .dev-autologin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: .5rem;
        margin-bottom: .75rem;
        padding-bottom: .45rem;
        border-bottom: 1px solid var(--line, rgba(255, 255, 255, .1));
      }
      .dev-autologin-title {
        display: flex;
        align-items: center;
        gap: .45rem;
        font-size: .88rem;
        font-weight: 800;
        color: var(--secondary, #38bdf8);
        margin: 0;
      }
      .dev-autologin-tag {
        font-size: .65rem;
        padding: .2rem .5rem;
        border-radius: 999px;
        background: rgba(2, 132, 199, .2);
        color: #38bdf8;
        font-weight: 700;
        letter-spacing: .02em;
      }
      .dev-autologin-desc {
        font-size: .74rem;
        color: var(--muted, #94a3b8);
        margin-bottom: .75rem;
        line-height: 1.35;
      }
      .dev-autologin-controls {
        display: flex;
        flex-direction: column;
        gap: .55rem;
      }
      .dev-autologin-select {
        font-size: .8rem;
        font-weight: 600;
        padding: .45rem .6rem;
        border-radius: 9px;
      }
      .dev-autologin-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: .45rem;
        font-size: .84rem;
        font-weight: 800;
        padding: .55rem 1rem;
        border-radius: 9px;
        background: #0284c7;
        border: none;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(2, 132, 199, .4);
        cursor: pointer;
        transition: all .15s ease;
      }
      .dev-autologin-btn:hover {
        background: #0369a1;
        transform: translateY(-1px);
      }
      .dev-autologin-btn:disabled {
        opacity: .65;
        cursor: not-allowed;
        transform: none;
      }
      .dev-pills-label {
        font-size: .68rem;
        font-weight: 800;
        color: var(--muted, #94a3b8);
        text-transform: uppercase;
        margin-top: .6rem;
        margin-bottom: .35rem;
        display: block;
      }
      .dev-pills-grid {
        display: flex;
        flex-wrap: wrap;
        gap: .35rem;
      }
      .dev-pill-btn {
        padding: .3rem .55rem;
        border-radius: 8px;
        border: 1px solid var(--line, rgba(255, 255, 255, .15));
        background: var(--soft, rgba(255, 255, 255, .05));
        color: var(--text, #f1f5f9);
        font-size: .7rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: .3rem;
        cursor: pointer;
        transition: all .15s ease;
      }
      .dev-pill-btn:hover {
        background: rgba(2, 132, 199, .25);
        border-color: #0284c7;
        color: #ffffff;
      }
      .dev-autologin-alert {
        margin-top: .5rem;
        padding: .4rem .6rem;
        border-radius: 8px;
        font-size: .74rem;
        font-weight: 600;
        display: none;
      }
      .dev-autologin-alert.show { display: block; }
      .dev-autologin-alert.loading { background: rgba(2, 132, 199, .2); color: #38bdf8; }
      .dev-autologin-alert.error { background: rgba(239, 68, 68, .2); color: #f87171; }
    `;
    document.head.appendChild(style);
  }

  // Realiza la petición de login directo a la API de Laravel
  async function ejecutarLoginAutomatico(email, botonTrigger) {
    const alertBox = document.getElementById('devAutoLoginAlert');
    if (alertBox) {
      alertBox.className = 'dev-autologin-alert show loading';
      alertBox.textContent = `Iniciando sesión como ${email}...`;
    }

    if (botonTrigger) {
      botonTrigger.disabled = true;
    }

    try {
      const resp = await fetch(`${API_USUARIOS}/api/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario: email,
          password: 'Sigeru123'
        })
      });

      const resultado = await resp.json().catch(() => ({}));

      if (!resp.ok || !resultado.success) {
        throw new Error(resultado?.message || 'Error en las credenciales del usuario.');
      }

      // Guardamos el token JWT recibido
      if (resultado.data?.access_token) {
        localStorage.setItem('access_token', resultado.data.access_token);
      }

      if (alertBox) {
        alertBox.className = 'dev-autologin-alert show loading';
        alertBox.textContent = `¡Acceso concedido! Redirigiendo a la interfaz de ${resultado.rol}...`;
      }

      const rol = String(resultado.rol || '').trim().toLowerCase();
      const paginaDestino = PAGINAS_POR_ROL[rol] || '../frontend-usuarios/chofer.html';

      setTimeout(() => {
        window.location.href = paginaDestino;
      }, 350);

    } catch (err) {
      console.error('Error en login automático:', err);
      if (alertBox) {
        alertBox.className = 'dev-autologin-alert show error';
        alertBox.textContent = `No se pudo ingresar: ${err.message}`;
      }
      if (botonTrigger) {
        botonTrigger.disabled = false;
      }
    }
  }

  function renderizarModulo() {
    inyectarEstilos();

    const contenedorDestino = document.getElementById('moduloAutoLogin') || document.querySelector('.login-card') || document.querySelector('main');
    if (!contenedorDestino) return;

    let optionsHtml = '';
    USUARIOS_DEMO.forEach(g => {
      optionsHtml += `<optgroup label="${g.grupo}">`;
      g.usuarios.forEach(u => {
        optionsHtml += `<option value="${u.email}">${u.nombre} (${u.email}) — ${u.detalle}</option>`;
      });
      optionsHtml += `</optgroup>`;
    });

    const pills = [
      { email: 'admin@sigeru.uy', label: 'Administrador', icon: 'bi-shield-lock-fill' },
      { email: 'albert@sigeru.uy', label: 'Albert (Scania P250)', icon: 'bi-truck' },
      { email: 'leonardo@sigeru.uy', label: 'Leonardo (Iveco)', icon: 'bi-truck' },
      { email: 'frida@sigeru.uy', label: 'Frida (VW)', icon: 'bi-truck' },
      { email: 'julio@sigeru.uy', label: 'Julio (Scania P280)', icon: 'bi-truck' },
      { email: 'cuadrilla@sigeru.uy', label: 'Cuadrilla', icon: 'bi-people-fill' },
      { email: 'operario@sigeru.uy', label: 'Operario', icon: 'bi-gear-fill' },
      { email: 'vecino@sigeru.uy', label: 'Vecino', icon: 'bi-person-fill' }
    ];

    let pillsHtml = pills.map(p => `
      <button type="button" class="dev-pill-btn" data-autologin-email="${p.email}">
        <i class="bi ${p.icon}"></i>
        <span>${p.label}</span>
      </button>
    `).join('');

    const htmlCard = `
      <!-- [INICIO BLOQUE ACCESO RÁPIDO AUTOMÁTICO - FÁCIL DE BORRAR] -->
      <div class="dev-autologin-box">
        <div class="dev-autologin-header">
          <h3 class="dev-autologin-title">
            <i class="bi bi-lightning-charge-fill"></i>
            Acceso Rápido Automático
          </h3>
          <span class="dev-autologin-tag">Pruebas / Demo</span>
        </div>
        <p class="dev-autologin-desc">
          Elegí cualquier usuario para iniciar sesión en <strong>1 clic</strong> sin tener que escribir usuario ni completar captcha:
        </p>

        <div class="dev-autologin-controls">
          <select id="devAutoLoginSelect" class="form-select dev-autologin-select">
            ${optionsHtml}
          </select>

          <button type="button" id="btnDevAutoLogin" class="dev-autologin-btn">
            <i class="bi bi-box-arrow-in-right"></i>
            <span>Ingresar automáticamente</span>
          </button>
        </div>

        <span class="dev-pills-label">O acceso inmediato directo:</span>
        <div class="dev-pills-grid">
          ${pillsHtml}
        </div>

        <div id="devAutoLoginAlert" class="dev-autologin-alert"></div>
      </div>
      <!-- [FIN BLOQUE ACCESO RÁPIDO AUTOMÁTICO] -->
    `;

    // Si existe el contenedor designado lo llenamos; si no, lo insertamos al final de la tarjeta de login
    if (document.getElementById('moduloAutoLogin')) {
      document.getElementById('moduloAutoLogin').innerHTML = htmlCard;
    } else {
      const divWrap = document.createElement('div');
      divWrap.id = 'moduloAutoLogin';
      divWrap.innerHTML = htmlCard;
      contenedorDestino.appendChild(divWrap);
    }

    // Event listener del botón principal
    document.getElementById('btnDevAutoLogin')?.addEventListener('click', (e) => {
      const email = document.getElementById('devAutoLoginSelect')?.value;
      if (email) {
        ejecutarLoginAutomatico(email, e.currentTarget);
      }
    });

    // Event listeners de las pastillas/pills rápidas
    document.querySelectorAll('[data-autologin-email]').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-autologin-email');
        if (email) {
          // Actualizamos también el select por coherencia visual
          const select = document.getElementById('devAutoLoginSelect');
          if (select) select.value = email;
          ejecutarLoginAutomatico(email, btn);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderizarModulo);
  } else {
    renderizarModulo();
  }
})();

