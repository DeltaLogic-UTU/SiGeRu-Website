const root = document.documentElement;
const savedTheme = localStorage.getItem('sigeru-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches
  ? 'light'
  : 'dark';

root.dataset.theme = savedTheme || preferredTheme;

function updateThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isLight = root.dataset.theme === 'light';
    button.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i><span>${isLight ? 'Oscuro' : 'Claro'}</span>`;
    button.setAttribute('aria-label', isLight ? 'Activar modo oscuro' : 'Activar modo claro');
  });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('sigeru-theme', root.dataset.theme);
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
    (typeof grecaptcha !== 'undefined' &&
      grecaptcha.getResponse().length > 0)
  );
}

function redirectByRole(role) {
  const rol = String(role).toLowerCase();

  const pages = {
    vecino: '../frontend-usuarios/vecino.html',
    administrador: '../frontend-gestion/administrador.html',
    cuadrilla: '../frontend-usuarios/cuadrilla.html',
    operario: '../frontend-usuarios/operario.html',
    chofer: '../frontend-usuarios/chofer.html'
  };

  if (!pages[rol]) return false;

  sessionStorage.setItem('sigeruPerfil', rol);
  sessionStorage.setItem('sigeruAutenticado', 'true');
  window.location.href = pages[rol];

  return true;
}

function localLogin(user, password) {
  const email = String(user).trim().toLowerCase();

  const profileKeys = [
    'sigeru-perfil-administrador',
    'sigeru-perfil-vecino'
  ];

  for (const key of profileKeys) {
    try {
      const profile = JSON.parse(localStorage.getItem(key) || 'null');
      if (
        profile &&
        String(profile.email || '').toLowerCase() === email &&
        profile.password === password
      ) {
        sessionStorage.setItem('sigeruNombre', `${profile.nombre || ''} ${profile.apellido || ''}`.trim());
        sessionStorage.setItem('sigeruEmail', profile.email);
        redirectByRole(profile.rol);
        return true;
      }
    } catch (_) {
      // Si un perfil local está dañado, se ignora y se continúa.
    }
  }

  const users = {
    'vecino@sigeru.uy': { password: 'Sigeru123', role: 'vecino', name: 'Vecino SiGeRU' },
    'cuadrilla@sigeru.uy': { password: 'Sigeru123', role: 'cuadrilla', name: 'Cuadrilla SiGeRU' },
    'operario@sigeru.uy': { password: 'Sigeru123', role: 'operario', name: 'Operario SiGeRU' },
    'chofer@sigeru.uy': { password: 'Sigeru123', role: 'chofer', name: 'Chofer SiGeRU' },
    'admin@sigeru.uy': { password: 'Sigeru123', role: 'administrador', name: 'Administrador SiGeRU' }
  };

  const account = users[email];

  if (account && account.password === password) {
    sessionStorage.setItem('sigeruNombre', account.name);
    sessionStorage.setItem('sigeruEmail', email);
    redirectByRole(account.role);
    return true;
  }

  try {
    const localUsers = JSON.parse(localStorage.getItem('sigeru-usuarios-local') || '[]');
    const localAccount = localUsers.find((item) =>
      String(item.email).toLowerCase() === email &&
      item.estado === 'activo'
    );

    if (localAccount && localAccount.password === password) {
      sessionStorage.setItem(
        'sigeruNombre',
        `${localAccount.nombre || ''} ${localAccount.apellido || ''}`.trim()
      );
      sessionStorage.setItem('sigeruEmail', localAccount.email);
      redirectByRole(localAccount.rol);
      return true;
    }
  } catch (_) {
    return false;
  }

  return false;
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
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

    data.accion = 'login';

    try {
      const response = await fetch(
        '../api-usuarios/validations.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const localSuccess = localLogin(data.usuario, data.password);
        if (!localSuccess) showMessage(message, result.message, true);
        return;
      }

      sessionStorage.setItem('sigeruEmail', result.data?.email || String(data.usuario).trim().toLowerCase());

      if (result.data?.nombre) {
        sessionStorage.setItem('sigeruNombre', result.data.nombre);
      }

      if (!redirectByRole(result.rol)) {
        showMessage(message, 'Rol no válido.', true);
      }
    } catch (error) {
      const success = localLogin(data.usuario, data.password);

      if (!success) {
        showMessage(
          message,
          'Usuario o contraseña incorrectos.',
          true
        );
      }
    }
  });
}

const registroForm = document.getElementById('registroForm');

if (registroForm) {
  registroForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = document.getElementById('registroMensaje');

    const data = Object.fromEntries(
      new FormData(registroForm).entries()
    );

    data.accion = 'registro';

    try {
      const response = await fetch(
        '../api-usuarios/validations.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        showMessage(message, result.message, true);
        return;
      }

      const solicitudes = JSON.parse(localStorage.getItem('sigeru-solicitudes-local') || '[]');
      solicitudes.push({
        id: result.data?.id_solicitud || Date.now(),
        ...data,
        estado: 'pendiente',
        fecha_solicitud: result.data?.fecha_solicitud || new Date().toISOString()
      });
      localStorage.setItem('sigeru-solicitudes-local', JSON.stringify(solicitudes));
      showMessage(message, result.message);
    } catch (error) {
      const solicitudes = JSON.parse(localStorage.getItem('sigeru-solicitudes-local') || '[]');
      solicitudes.push({
        id: Date.now(),
        ...data,
        estado: 'pendiente',
        fecha_solicitud: new Date().toISOString()
      });
      localStorage.setItem('sigeru-solicitudes-local', JSON.stringify(solicitudes));
      showMessage(message, 'Solicitud registrada correctamente.');
    }

    registroForm.reset();
    document.getElementById('licenciaField')?.classList.add('d-none');
  });
}

const recuperacionForm =
  document.getElementById('recuperacionForm');

if (recuperacionForm) {
  recuperacionForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const message = document.getElementById(
      'recuperacionMensaje'
    );

    if (!captchaCompleted(recuperacionForm)) {
      showMessage(
        message,
        'Confirmá el reCAPTCHA para continuar.',
        true
      );
      return;
    }

    showMessage(
      message,
      'Si el correo está registrado, recibirás instrucciones.'
    );

    recuperacionForm.reset();
  });
}

const reporteForm = document.getElementById('reporteForm');

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

const contactoForm = document.getElementById('contactoForm');

if (contactoForm) {
  contactoForm.addEventListener('submit', (event) => {
    event.preventDefault();

    showMessage(
      document.getElementById('contactoMensaje'),
      'Consulta preparada correctamente.'
    );

    contactoForm.reset();
  });
}

const protectedReport = document.querySelector(
  '[data-protected-report]'
);

if (protectedReport) {
  const params = new URLSearchParams(window.location.search);

  const profile =
    sessionStorage.getItem('sigeruPerfil') ||
    params.get('perfil');

  const allowed = document.getElementById('reportePermitido');
  const blocked = document.getElementById('reporteBloqueado');
  const isNeighbor = profile === 'vecino';

  if (allowed && blocked) {
    allowed.style.display = isNeighbor ? 'block' : 'none';
    blocked.style.display = isNeighbor ? 'none' : 'block';
  }
}

document.querySelectorAll('[data-logout]').forEach((link) => {
  link.addEventListener('click', () => {
    sessionStorage.removeItem('sigeruPerfil');
    sessionStorage.removeItem('sigeruAutenticado');
    sessionStorage.removeItem('sigeruNombre');
    sessionStorage.removeItem('sigeruEmail');
  });
});

// Mostrar u ocultar contraseña sin modificar el envío del formulario.
document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const icon = button.querySelector('i');

    if (!input) return;

    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');

    if (icon) {
      icon.classList.toggle('bi-eye', showing);
      icon.classList.toggle('bi-eye-slash', !showing);
    }
  });
});



const perfilSolicitud = document.getElementById('perfilSolicitud');
const licenciaField = document.getElementById('licenciaField');
const licenciaInput = document.getElementById('licenciaInput');

function updateLicenseField() {
  if (!perfilSolicitud || !licenciaField || !licenciaInput) return;
  const isDriver = perfilSolicitud.value === 'chofer';
  licenciaField.classList.toggle('d-none', !isDriver);
  licenciaInput.required = isDriver;
  if (!isDriver) licenciaInput.value = '';
}

perfilSolicitud?.addEventListener('change', updateLicenseField);
updateLicenseField();
