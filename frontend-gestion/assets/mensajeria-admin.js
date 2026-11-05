(() => {
  'use strict';

  const API_GESTION = 'http://127.0.0.1:8001/api';
  const API_USUARIOS = 'http://127.0.0.1:8000/api';

  const $ = id => document.getElementById(id);

  const modal = $('mensajesAdminModal');
  const buscar = $('mensajesAdminBuscar');
  const lista = $('mensajesAdminContactos');
  const contactoActual = $('mensajesAdminContactoActual');
  const historial = $('mensajesAdminHistorial');
  const estado = $('mensajesAdminEstado');
  const formulario = $('mensajesAdminForm');
  const entrada = $('mensajesAdminTexto');
  const enviar = $('mensajesAdminEnviar');
  const badge = $('mensajesAdminTotalPendientes');

  if (
    !modal || !buscar || !lista ||
    !contactoActual || !historial ||
    !estado || !formulario || !entrada || !enviar
  ) {
    return;
  }

  let miId = null;
  let idContacto = null;
  let contactos = [];

  let cargandoContactos = false;
  let consultandoConversacion = false;
  let enviando = false;
  let identificando = null;

  function tokenActual() {
    const token = typeof getToken === 'function'
      ? getToken()
      : null;

    return token || localStorage.getItem('access_token');
  }

  async function pedir(
    ruta,
    metodo = 'GET',
    datos = null,
    origen = 'gestion'
  ) {
    const token = tokenActual();

    if (!token) {
      throw new Error('No hay una sesión activa.');
    }

    const base = origen === 'usuarios'
      ? API_USUARIOS
      : API_GESTION;

    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(datos !== null
          ? { 'Content-Type': 'application/json' }
          : {})
      },
      ...(datos !== null
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

  async function identificarAdministrador() {
    if (miId) return;

    if (!identificando) {
      identificando = (async () => {
        const perfil = await pedir(
          '/perfil',
          'GET',
          null,
          'usuarios'
        );

        if (
          String(perfil?.rol).toLowerCase() !==
          'administrador'
        ) {
          throw new Error(
            'La mensajería requiere permisos de administrador.'
          );
        }

        miId = Number(perfil.id_usuario);

        if (!Number.isInteger(miId) || miId <= 0) {
          throw new Error(
            'No se pudo identificar al administrador.'
          );
        }
      })().finally(() => {
        identificando = null;
      });
    }

    await identificando;
  }

  function informar(texto, error = false) {
    estado.textContent = texto;
    estado.classList.toggle('text-danger', error);
    estado.classList.toggle('text-muted', !error);
  }

  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function nombreCompleto(usuario) {
    return [
      usuario.nombre,
      usuario.apellido
    ].filter(Boolean).join(' ') ||
      `Usuario ${usuario.id_usuario}`;
  }

  function nombreRol(rol) {
    const roles = {
      administrador: 'Administración',
      cuadrilla: 'Cuadrilla',
      barrendero: 'Barrendero',
      operario: 'Operario'
    };

    return roles[normalizar(rol)] || rol;
  }

  function limpiarSeleccion() {
    idContacto = null;

    contactoActual.textContent =
      'Seleccioná un contacto';

    historial.textContent =
      'Seleccioná una conversación para ver los mensajes.';

    entrada.value = '';
    entrada.disabled = true;
    enviar.disabled = true;
  }


  function actualizarContador() {
    if (!badge) return;

    const total = contactos.reduce(
      (acumulado, contacto) =>
        acumulado + Number(contacto.sin_leer || 0),
      0
    );

    badge.textContent = total > 99
      ? '99+'
      : String(total);

    badge.hidden = total === 0;
    badge.title = `${total} mensajes sin leer`;
  }


  function dibujarContactos() {
    lista.replaceChildren();

    const termino = normalizar(buscar.value.trim());

    const filtrados = contactos.filter(contacto => {
      const texto = normalizar(
        `${nombreCompleto(contacto)} ${nombreRol(contacto.rol)
        }`
      );

      return texto.includes(termino);
    });

    if (!filtrados.length) {
      const mensaje = document.createElement('p');
      mensaje.className = 'text-muted small p-2';

      mensaje.textContent = termino
        ? 'No hay contactos que coincidan con la búsqueda.'
        : 'No hay personal operativo disponible.';

      lista.appendChild(mensaje);
      return;
    }

    for (const contacto of filtrados) {
      const id = Number(contacto.id_usuario);
      const sinLeer = Number(contacto.sin_leer || 0);

      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className =
        'list-group-item list-group-item-action';

      if (sinLeer > 0) {
        boton.classList.add('mensajes-admin-pendiente');
      }

      if (id === idContacto) {
        boton.classList.add('mensajes-admin-seleccionado');
      }

      const superior = document.createElement('div');
      superior.className =
        'd-flex justify-content-between align-items-center gap-2';

      const nombre = document.createElement('strong');
      nombre.className = 'd-block';
      nombre.textContent = nombreCompleto(contacto);

      superior.appendChild(nombre);

      if (sinLeer > 0) {
        const contador = document.createElement('span');
        contador.className = 'mensajes-admin-cantidad';

        contador.textContent =
          `${sinLeer} sin leer`;

        superior.appendChild(contador);
      }

      const rol = document.createElement('small');
      rol.className = 'd-block mt-1';
      rol.textContent = nombreRol(contacto.rol);

      boton.append(superior, rol);

      boton.addEventListener('click', () => {
        seleccionarContacto(id);
      });

      lista.appendChild(boton);
    }
  }

  async function cargarContactos() {
    if (!miId || cargandoContactos) return;

    cargandoContactos = true;

    try {
      const respuesta = await pedir('/mensajes/contactos');

      contactos = Array.isArray(respuesta)
        ? respuesta
        : [];

      contactos.sort((a, b) =>
        Number(b.sin_leer || 0) -
        Number(a.sin_leer || 0)
      );

      actualizarContador();

      if (
        idContacto &&
        !contactos.some(
          contacto =>
            Number(contacto.id_usuario) === idContacto
        )
      ) {
        limpiarSeleccion();
      }

      dibujarContactos();
    } finally {
      cargandoContactos = false;
    }
  }


  function dibujarMensajes(mensajes) {
    historial.replaceChildren();

    if (!mensajes.length) {
      historial.textContent =
        'Todavía no hay mensajes con este usuario.';
      return;
    }

    for (const mensaje of mensajes) {
      const propio =
        Number(mensaje.id_remitente) === miId;

      const fila = document.createElement('div');

      fila.className = propio
        ? 'd-flex justify-content-end mb-2'
        : 'd-flex justify-content-start mb-2';

      const burbuja = document.createElement('div');

      burbuja.className = propio
        ? 'bg-success text-white rounded-3 p-2 small'
        : 'bg-body-tertiary rounded-3 p-2 small';

      burbuja.style.maxWidth = '88%';
      burbuja.style.overflowWrap = 'anywhere';

      const texto = document.createElement('div');
      texto.style.whiteSpace = 'pre-wrap';
      texto.textContent = mensaje.mensaje || '';

      const fecha = document.createElement('small');
      fecha.className = 'd-block mt-1 opacity-75';
      fecha.textContent = mensaje.fecha_envio || '';

      burbuja.append(texto, fecha);
      fila.appendChild(burbuja);
      historial.appendChild(fila);
    }

    historial.scrollTop = historial.scrollHeight;
  }

  async function cargarConversacion() {
    if (!idContacto || consultandoConversacion) return;

    consultandoConversacion = true;

    const consultado = idContacto;

    try {
      const datos = await pedir(
        `/mensajes/conversacion/${consultado}`
      );

      if (consultado !== idContacto) return;

      dibujarMensajes(
        Array.isArray(datos.mensajes)
          ? datos.mensajes
          : []
      );

      await pedir(
        `/mensajes/conversacion/${consultado}/leidos`,
        'PUT'
      );

      informar('Conversación actualizada.');

      await cargarContactos();
    } catch (error) {
      if (consultado === idContacto) {
        informar(error.message, true);
      }
    } finally {
      consultandoConversacion = false;

      if (consultado !== idContacto && idContacto) {
        cargarConversacion();
      }
    }
  }

  function seleccionarContacto(id) {
    const contacto = contactos.find(
      item => Number(item.id_usuario) === Number(id)
    );

    if (!contacto) return;

    idContacto = Number(contacto.id_usuario);

    contactoActual.textContent =
      `${nombreCompleto(contacto)} · ${nombreRol(contacto.rol)
      }`;

    entrada.disabled = false;
    enviar.disabled = false;

    historial.textContent = 'Cargando conversación...';

    dibujarContactos();
    cargarConversacion();
  }


  formulario.addEventListener('submit', async event => {
    event.preventDefault();

    if (enviando || !idContacto) return;

    const mensaje = entrada.value.trim();

    if (!mensaje) return;

    enviando = true;
    enviar.disabled = true;

    try {
      await pedir('/mensajes/enviar', 'POST', {
        id_destinatario: idContacto,
        mensaje
      });

      entrada.value = '';

      informar('Mensaje enviado correctamente.');

      await cargarConversacion();
    } catch (error) {
      informar(error.message, true);
    } finally {
      enviando = false;
      enviar.disabled = !idContacto;
    }
  });


  async function iniciarMensajeria() {
    limpiarSeleccion();

    buscar.value = '';

    informar('Cargando mensajes...');

    try {
      await identificarAdministrador();
      await cargarContactos();

      informar('Seleccioná un contacto para conversar.');
    } catch (error) {
      informar(error.message, true);
    }
  }

  buscar.addEventListener('input', dibujarContactos);

  modal.addEventListener('shown.bs.modal', iniciarMensajeria);

  modal.addEventListener('hidden.bs.modal', () => {
    limpiarSeleccion();
  });

  async function iniciarContador() {
    try {
      await identificarAdministrador();
      await cargarContactos();
    } catch (error) {
      console.warn(
        'No se pudo actualizar el contador de mensajes:',
        error.message
      );
    }
  }

  iniciarContador();

  setInterval(async () => {
    if (
      !miId ||
      document.visibilityState !== 'visible'
    ) {
      return;
    }

    try {
      await cargarContactos();

      if (
        modal.classList.contains('show') &&
        idContacto
      ) {
        await cargarConversacion();
      }
    } catch (error) {
      if (modal.classList.contains('show')) {
        informar(error.message, true);
      }
    }
  }, 15000);

})();

