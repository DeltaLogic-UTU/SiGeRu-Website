const API_USUARIOS = 'http://127.0.0.1:8000';

const root = document.documentElement;

const preferredTheme = window.matchMedia(
  '(prefers-color-scheme: light)'
).matches
  ? 'light'
  : 'dark';

root.dataset.theme = preferredTheme;


function updateThemeButtons() {
  document
    .querySelectorAll('[data-theme-toggle]')
    .forEach((button) => {
      const isLight =
        root.dataset.theme === 'light';

      button.innerHTML = `
        <i
          class="bi ${isLight ? 'bi-moon' : 'bi-sun'}"
          aria-hidden="true"
        ></i>
        <span>
          ${isLight ? 'Oscuro' : 'Claro'}
        </span>
      `;

      button.setAttribute(
        'aria-label',
        isLight
          ? 'Activar modo oscuro'
          : 'Activar modo claro'
      );
    });
}


updateThemeButtons();


document
  .querySelectorAll('[data-theme-toggle]')
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        root.dataset.theme =
          root.dataset.theme === 'light'
            ? 'dark'
            : 'light';

        updateThemeButtons();
      }
    );
  });


function showMessage(
  element,
  text,
  error = false
) {
  if (!element) {
    return;
  }

  const content =
    String(text || '').trim();

  element.textContent =
    content;

  element.hidden =
    content === '';

  element.style.display =
    content
      ? 'block'
      : 'none';

  element.classList.toggle(
    'error',
    error
  );
}


function captchaCompleted(form) {
  const local =
    form.querySelector(
      '[name="captchaLocal"]'
    );

  if (local) {
    return local.checked;
  }

  const google =
    form.querySelector(
      '.g-recaptcha'
    );

  return (
    !google ||
    (
      typeof grecaptcha !==
        'undefined' &&
      grecaptcha
        .getResponse()
        .length > 0
    )
  );
}


// [CAMBIO JWT - Paso 0]: Se eliminó la función getCsrfToken() y el envío del header
// 'X-CSRF-TOKEN'. La API ya no usa protección CSRF por cookies, sino que pasará a usar JWT.

async function apiRequest(
  path,
  method = 'GET',
  body = null
) {
  const headers = {
    Accept:
      'application/json'
  };

  if (body !== null) {
    headers['Content-Type'] =
      'application/json';
  }

  const options = {
    method,
    credentials:
      'include',
    headers
  };

  if (body !== null) {
    options.body =
      JSON.stringify(body);
  }

  const response =
    await fetch(
      `${API_USUARIOS}${path}`,
      options
    );

  let result;

  try {
    result =
      await response.json();
  } catch {
    result = {
      success: false,
      message:
        'La API devolvió una respuesta inválida.'
    };
  }

  return {
    response,
    result
  };
}


function getApiError(
  result,
  fallback
) {
  if (
    result?.errors &&
    typeof result.errors ===
      'object'
  ) {
    const errors =
      Object.values(
        result.errors
      )
        .flat()
        .filter(
          value =>
            typeof value ===
            'string'
        );

    if (errors.length) {
      return errors[0];
    }
  }

  return (
    result?.message ||
    fallback
  );
}


function redirectByRole(role) {
  const rol =
    String(role || '')
      .trim()
      .toLowerCase();

  const pages = {
    administrador:
      '../frontend-gestion/administrador.html',

    supervisor:
      '../frontend-gestion/administrador.html',

    vecino:
      '../frontend-usuarios/vecino.html',

    cuadrilla:
      '../frontend-usuarios/cuadrilla.html',

    operario:
      '../frontend-usuarios/operario.html',

    chofer:
      '../frontend-usuarios/chofer.html'
  };

  if (!pages[rol]) {
    return false;
  }

  window.location.href =
    pages[rol];

  return true;
}

const loginForm =
  document.getElementById(
    'loginForm'
  );

if (loginForm) {
  loginForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'loginMensaje'
        );

      if (
        !captchaCompleted(
          loginForm
        )
      ) {
        showMessage(
          message,
          'Confirmá el reCAPTCHA antes de ingresar.',
          true
        );

        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            loginForm
          ).entries()
        );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/login',
            'POST',
            {
              usuario:
                data.usuario,

              password:
                data.password
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'Usuario o contraseña incorrectos.'
            ),
            true
          );

          return;
        }

        if (
          !redirectByRole(
            result.rol
          )
        ) {
          showMessage(
            message,
            'El usuario no tiene una interfaz asignada.',
            true
          );
        }

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const registroForm =
  document.getElementById(
    'registroForm'
  );

if (registroForm) {
  registroForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'registroMensaje'
        );

      const data =
        Object.fromEntries(
          new FormData(
            registroForm
          ).entries()
        );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/registro',
            'POST',
            data
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo registrar la solicitud.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'Solicitud registrada correctamente.'
        );

        registroForm.reset();

        updateLicenseField();

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const recuperacionForm =
  document.getElementById(
    'recuperacionForm'
  );

if (recuperacionForm) {
  recuperacionForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const message =
        document.getElementById(
          'recuperacionMensaje'
        );

      if (
        !captchaCompleted(
          recuperacionForm
        )
      ) {
        showMessage(
          message,
          'Confirmá la verificación de seguridad para continuar.',
          true
        );

        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            recuperacionForm
          ).entries()
        );

      const email =
        String(
          data.email || ''
        )
          .trim()
          .toLowerCase();

      if (!email) {
        showMessage(
          message,
          'Ingresá tu correo electrónico.',
          true
        );

        return;
      }

      showMessage(
        message,
        'Procesando solicitud...'
      );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/recuperar-password',
            'POST',
            {
              email
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo solicitar la recuperación de contraseña.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'
        );

        recuperacionForm.reset();

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const restablecerForm =
  document.getElementById(
    'restablecerForm'
  );

if (restablecerForm) {
  const message =
    document.getElementById(
      'restablecerMensaje'
    );

  const params =
    new URLSearchParams(
      window.location.search
    );

  const token =
    params.get('token');

  const submitButton =
    restablecerForm.querySelector(
      'button[type="submit"]'
    );

  if (!token) {
    showMessage(
      message,
      'El enlace de recuperación no es válido.',
      true
    );

    if (submitButton) {
      submitButton.disabled =
        true;
    }
  }

  restablecerForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      if (!token) {
        return;
      }

      const data =
        Object.fromEntries(
          new FormData(
            restablecerForm
          ).entries()
        );

      const password =
        String(
          data.password || ''
        );

      const confirmation =
        String(
          data.password_confirmation ||
          ''
        );

      if (
        password.length < 8
      ) {
        showMessage(
          message,
          'La contraseña debe tener al menos 8 caracteres.',
          true
        );

        return;
      }

      if (
        password !==
        confirmation
      ) {
        showMessage(
          message,
          'Las contraseñas no coinciden.',
          true
        );

        return;
      }

      showMessage(
        message,
        'Actualizando contraseña...'
      );

      try {
        const {
          response,
          result
        } =
          await apiRequest(
            '/api/restablecer-password',
            'POST',
            {
              token,

              password,

              password_confirmation:
                confirmation
            }
          );

        if (
          !response.ok ||
          !result.success
        ) {
          showMessage(
            message,
            getApiError(
              result,
              'No se pudo actualizar la contraseña.'
            ),
            true
          );

          return;
        }

        showMessage(
          message,
          result.message ||
            'La contraseña fue actualizada correctamente.'
        );

        restablecerForm.reset();

        if (submitButton) {
          submitButton.disabled =
            true;
        }

        setTimeout(
          () => {
            window.location.href =
              'login.html';
          },
          1800
        );

      } catch (error) {
        console.error(
          error
        );

        showMessage(
          message,
          'No se pudo conectar con la API de usuarios.',
          true
        );
      }
    }
  );
}

const reporteForm =
  document.getElementById(
    'reporteForm'
  );

if (reporteForm) {
  reporteForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      showMessage(
        document.getElementById(
          'reporteMensaje'
        ),
        'Reporte enviado y pendiente de revisión.'
      );

      reporteForm.reset();
    }
  );
}

const contactoForm =
  document.getElementById(
    'contactoForm'
  );

if (contactoForm) {
  contactoForm.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      showMessage(
        document.getElementById(
          'contactoMensaje'
        ),
        'Consulta preparada correctamente.'
      );

      contactoForm.reset();
    }
  );
}

const protectedReport =
  document.querySelector(
    '[data-protected-report]'
  );

if (protectedReport) {
  const allowed =
    document.getElementById(
      'reportePermitido'
    );

  const blocked =
    document.getElementById(
      'reporteBloqueado'
    );

  apiRequest(
    '/api/session'
  )
    .then(
      ({
        response,
        result
      }) => {
        const permitted =
          response.ok &&
          result.success &&
          result.usuario?.rol ===
            'vecino';

        if (
          allowed &&
          blocked
        ) {
          allowed.style.display =
            permitted
              ? 'block'
              : 'none';

          blocked.style.display =
            permitted
              ? 'none'
              : 'block';
        }
      }
    )
    .catch(() => {
      if (
        allowed &&
        blocked
      ) {
        allowed.style.display =
          'none';

        blocked.style.display =
          'block';
      }
    });
}

document
  .querySelectorAll(
    '[data-logout]'
  )
  .forEach((link) => {
    link.addEventListener(
      'click',
      async (event) => {
        event.preventDefault();

        const destination =
          link.getAttribute(
            'href'
          ) ||
          '../landing-page/index.html';

        try {
          await apiRequest(
            '/api/logout',
            'POST'
          );

        } finally {
          window.location.href =
            destination;
        }
      }
    );
  });

document
  .querySelectorAll(
    '[data-password-toggle]'
  )
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const input =
          document.getElementById(
            button.dataset
              .passwordToggle
          );

        const icon =
          button.querySelector(
            'i'
          );

        if (!input) {
          return;
        }

        const showing =
          input.type ===
          'text';

        input.type =
          showing
            ? 'password'
            : 'text';

        button.setAttribute(
          'aria-label',
          showing
            ? 'Mostrar contraseña'
            : 'Ocultar contraseña'
        );

        if (icon) {
          icon.classList.toggle(
            'bi-eye',
            showing
          );

          icon.classList.toggle(
            'bi-eye-slash',
            !showing
          );
        }
      }
    );
  });

const perfilSolicitud =
  document.getElementById(
    'perfilSolicitud'
  );

const licenciaField =
  document.getElementById(
    'licenciaField'
  );

const licenciaInput =
  document.getElementById(
    'licenciaInput'
  );


function updateLicenseField() {
  if (
    !perfilSolicitud ||
    !licenciaField ||
    !licenciaInput
  ) {
    return;
  }

  const isDriver =
    perfilSolicitud.value ===
    'chofer';

  licenciaField.classList.toggle(
    'd-none',
    !isDriver
  );

  licenciaInput.required =
    isDriver;

  if (!isDriver) {
    licenciaInput.value =
      '';
  }
}


perfilSolicitud?.addEventListener(
  'change',
  updateLicenseField
);


updateLicenseField();