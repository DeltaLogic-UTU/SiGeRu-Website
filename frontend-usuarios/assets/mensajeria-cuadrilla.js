(() => {
  'use strict';

  const API = 'http://127.0.0.1:8001/api';
  const $ = id => document.getElementById(id);

  const caja = $('chatCuadrillaMensajes');
  const selector = $('chatCuadrillaContacto');
  const formulario = $('chatCuadrillaForm');
  const entrada = $('chatCuadrillaTexto');
  const estado = $('chatCuadrillaEstado');
  const enviar = $('chatCuadrillaEnviar');

  if (
    !caja || !selector || !formulario ||
    !entrada || !estado || !enviar
  ) {
    return;
  }

  let idPropio = null;
  let idContacto = null;
  let consultando = false;

  function informar(texto, esError = false) {
    estado.textContent = texto;
    estado.classList.toggle('text-danger', esError);
    estado.classList.toggle('text-muted', !esError);
  }

  function tokenActual() {
    return typeof getToken === 'function'
      ? getToken()
      : localStorage.getItem('access_token');
  }

  async function pedir(ruta, metodo = 'GET', datos = null) {
    const token = tokenActual();

    if (!token) {
      throw new Error(
        'Iniciá sesión para usar la mensajería.'
      );
    }

    const respuesta = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(datos
          ? { 'Content-Type': 'application/json' }
          : {})
      },
      ...(datos
        ? { body: JSON.stringify(datos) }
        : {})
    });

    const json = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || json.success !== true) {
      const errores = json.errors
        ? Object.values(json.errors).flat().join(' ')
        : '';

      throw new Error(
        errores ||
        json.message ||
        `Error HTTP ${respuesta.status}`
      );
    }

    return json.data;
  }

  function mostrarMensajes(mensajes) {
    caja.replaceChildren();

    if (!mensajes.length) {
      caja.textContent =
        'Todavía no hay mensajes. Podés iniciar la conversación.';
      return;
    }

    for (const mensaje of mensajes) {
      const propio =
        Number(mensaje.id_remitente) === idPropio;

      const fila = document.createElement('div');
      fila.className = `d-flex mb-2 ${propio
          ? 'justify-content-end'
          : 'justify-content-start'
        }`;

      const burbuja = document.createElement('div');

      burbuja.className = propio
        ? 'bg-success text-white rounded-3 p-2 small'
        : 'bg-body-tertiary rounded-3 p-2 small';

      burbuja.style.maxWidth = '88%';
      burbuja.style.overflowWrap = 'anywhere';
      burbuja.style.whiteSpace = 'pre-wrap';
      burbuja.textContent = mensaje.mensaje || '';

      const fecha = document.createElement('div');
      fecha.className = propio
        ? 'opacity-75 mt-1'
        : 'text-muted mt-1';

      fecha.style.fontSize = '.7rem';
      fecha.textContent = mensaje.fecha_envio || '';

      burbuja.appendChild(fecha);
      fila.appendChild(burbuja);
      caja.appendChild(fila);
    }

    caja.scrollTop = caja.scrollHeight;
  }

  async function actualizarConversacion() {
    if (!idContacto || consultando) return;

    consultando = true;
    const consultado = idContacto;

    try {
      const datos = await pedir(
        `/mensajes/conversacion/${consultado}`
      );

      if (consultado !== idContacto) return;

      mostrarMensajes(
        Array.isArray(datos.mensajes)
          ? datos.mensajes
          : []
      );

      informar('Conversación privada con Administración.');

      await pedir(
        `/mensajes/conversacion/${consultado}/leidos`,
        'PUT'
      );
    } catch (error) {
      informar(error.message, true);
    } finally {
      consultando = false;

      if (consultado !== idContacto && idContacto) {
        actualizarConversacion();
      }
    }
  }

  async function iniciarChat() {
    try {
      const sesion = await pedir('/cuadrilla/mi-panel');

      idPropio = Number(sesion.usuario?.id_usuario);

      if (!Number.isInteger(idPropio) || idPropio <= 0) {
        throw new Error(
          'No se pudo identificar el usuario.'
        );
      }

      const contactos = await pedir('/mensajes/contactos');

      selector.replaceChildren();

      const disponibles = Array.isArray(contactos)
        ? contactos
        : [];

      for (const contacto of disponibles) {
        const opcion = document.createElement('option');

        opcion.value = String(contacto.id_usuario);

        opcion.textContent = [
          contacto.nombre,
          contacto.apellido
        ].filter(Boolean).join(' ') ||
          `Administrador ${contacto.id_usuario}`;

        selector.appendChild(opcion);
      }

      if (!disponibles.length) {
        informar('No hay administradores activos disponibles.');
        caja.textContent = 'Sin contactos disponibles.';
        selector.disabled = true;
        entrada.disabled = true;
        enviar.disabled = true;
        return;
      }

      idContacto = Number(selector.value);

      entrada.disabled = false;
      enviar.disabled = false;

      await actualizarConversacion();
    } catch (error) {
      informar(error.message, true);
    }
  }

  selector.addEventListener('change', async () => {
    idContacto = Number(selector.value) || null;
    caja.textContent = 'Cargando conversación…';
    await actualizarConversacion();
  });

  formulario.addEventListener('submit', async event => {
    event.preventDefault();

    const mensaje = entrada.value.trim();

    if (!idContacto || !mensaje) return;

    if (mensaje.length > 2000) {
      informar(
        'El mensaje supera los 2000 caracteres.',
        true
      );
      return;
    }

    enviar.disabled = true;

    try {
      await pedir('/mensajes/enviar', 'POST', {
        id_destinatario: idContacto,
        mensaje
      });

      entrada.value = '';

      informar('Mensaje enviado.');

      await actualizarConversacion();
    } catch (error) {
      informar(error.message, true);
    } finally {
      enviar.disabled = false;
    }
  });

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      actualizarConversacion();
    }
  }, 30000);

  iniciarChat();
})();
