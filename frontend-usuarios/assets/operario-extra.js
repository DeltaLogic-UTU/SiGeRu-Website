(() => {
    'use strict';


    const API_GESTION = 'http://127.0.0.1:8001/api';
    const API_USUARIOS = 'http://127.0.0.1:8000/api';

    const $ = id => document.getElementById(id);

    const btnEstado = $('btnEstadoOperativo');
    const btnSoporte = $('btnContactarSoporte');

    const modalEstado = $('modalEstadoOperario');
    const modalSoporte = $('modalSoporteOperario');

    const estadoMensaje = $('opEstadoMensaje');
    const instalacionContenido = $('opInstalacionContenido');
    const inventarioContenido = $('opInventarioContenido');
    const buscarInsumo = $('opBuscarInsumo');
    const btnActualizar = $('opActualizarEstado');

    const contactoSelect = $('opSoporteContacto');
    const mensajesCaja = $('opSoporteMensajes');
    const estadoChat = $('opSoporteEstado');
    const formularioChat = $('opSoporteForm');
    const mensajeInput = $('opSoporteTexto');
    const btnEnviar = $('opSoporteEnviar');

    let instalacionActual = null;
    let insumosActuales = [];
    let inventarioDisponible = false;
    let cargandoEstado = false;

    let miId = null;
    let contactoId = null;
    let consultandoChat = false;
    let cargandoSoporte = false;
    let enviandoChat = false;


    function obtenerToken() {
        if (typeof getToken === 'function') {
            const token = getToken();

            if (token) return token;
        }

        return localStorage.getItem('access_token');
    }

    async function solicitar(url, metodo = 'GET', datos = null) {
        const token = obtenerToken();

        if (!token) {
            throw new Error(
                'No hay una sesión activa. Iniciá sesión nuevamente.'
            );
        }

        const headers = {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
        };

        if (datos !== null) {
            headers['Content-Type'] = 'application/json';
        }

        const opciones = {
            method: metodo,
            headers,
            cache: 'no-store'
        };

        if (datos !== null) {
            opciones.body = JSON.stringify(datos);
        }

        const respuesta = await fetch(url, opciones);

        const json = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok || json.success !== true) {
            const errores = json.errors
                ? Object.values(json.errors).flat().join(' ')
                : '';

            if (respuesta.status === 401) {
                throw new Error(
                    'Tu sesión venció. Iniciá sesión nuevamente.'
                );
            }

            throw new Error(
                errores ||
                json.message ||
                `Error HTTP ${respuesta.status}`
            );
        }

        return json.data;
    }

    function apiGestion(ruta, metodo = 'GET', datos = null) {
        return solicitar(
            `${API_GESTION}${ruta}`,
            metodo,
            datos
        );
    }

    function obtenerPerfil() {
        return solicitar(`${API_USUARIOS}/perfil`);
    }


    function crearElemento(etiqueta, clase = '', texto = '') {
        const elemento = document.createElement(etiqueta);

        if (clase) {
            elemento.className = clase;
        }

        elemento.textContent = String(texto ?? '');

        return elemento;
    }

    function formatearFecha(fecha) {
        if (!fecha) return 'No registrada';

        const texto = String(fecha);

        const resultado = texto.match(
            /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/
        );

        if (!resultado) return texto;

        const [, anio, mes, dia, hora, minuto] = resultado;

        return `${dia}/${mes}/${anio}` +
            (hora ? ` ${hora}:${minuto}` : '');
    }

    function normalizarTexto(texto) {
        return String(texto ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function campoInformativo(etiqueta, valor) {
        const campo = crearElemento('div', 'op-campo');

        const nombre = crearElemento(
            'span',
            'op-campo-label',
            etiqueta
        );

        const contenido = crearElemento(
            'strong',
            'op-campo-valor',
            valor === null || valor === undefined || valor === ''
                ? 'No registrado'
                : valor
        );

        campo.append(nombre, contenido);

        return campo;
    }


    function informarEstado(mensaje, error = false) {
        if (!estadoMensaje) return;

        estadoMensaje.textContent = mensaje;
        estadoMensaje.classList.toggle('op-error', error);
    }

    function mostrarInstalacion(datos) {
        if (!instalacionContenido) return;

        instalacionContenido.replaceChildren();

        instalacionActual = datos?.instalacion || null;

        insumosActuales = Array.isArray(datos?.insumos)
            ? datos.insumos
            : [];

        inventarioDisponible =
            datos?.inventario_disponible === true;

        if (!instalacionActual) {
            informarEstado(
                'Actualmente no tenés una instalación asignada.'
            );

            instalacionContenido.appendChild(
                crearElemento(
                    'div',
                    'op-vacio',
                    'Cuando Administración te asigne una instalación, podrás consultar sus datos desde aquí.'
                )
            );

            mostrarInventario();
            return;
        }

        const instalacion = instalacionActual;

        informarEstado(
            'Datos de la instalación asignada.'
        );

        const tarjeta = crearElemento(
            'div',
            'op-instalacion-card'
        );

        const encabezado = crearElemento(
            'div',
            'op-instalacion-head'
        );

        const identificacion = crearElemento('div');

        identificacion.appendChild(
            crearElemento(
                'h3',
                'op-instalacion-nombre',
                instalacion.nombre || 'Instalación'
            )
        );

        identificacion.appendChild(
            crearElemento(
                'p',
                'op-instalacion-tipo',
                instalacion.tipo || 'Sin tipo registrado'
            )
        );

        const esOperativo =
            instalacion.estado === 'Operativo';

        const estado = crearElemento(
            'span',
            `op-badge ${esOperativo
                ? 'op-badge-ok'
                : 'op-badge-alerta'
            }`,
            instalacion.estado || 'Sin estado'
        );

        encabezado.append(identificacion, estado);
        tarjeta.appendChild(encabezado);

        const grid = crearElemento(
            'div',
            'op-datos-grid'
        );

        const ubicacion = [
            instalacion.calle,
            instalacion.esquina_1,
            instalacion.esquina_2
        ]
            .filter(Boolean)
            .join(' · ');

        grid.appendChild(
            campoInformativo(
                'Identificador',
                instalacion.id_instalacion
            )
        );

        grid.appendChild(
            campoInformativo(
                'Tipo de instalación',
                instalacion.tipo
            )
        );

        grid.appendChild(
            campoInformativo(
                'Ubicación',
                ubicacion || 'No registrada'
            )
        );

        grid.appendChild(
            campoInformativo(
                'Tipo de residuo',
                instalacion.tipo_residuo
            )
        );

        grid.appendChild(
            campoInformativo(
                'Capacidad actual',
                instalacion.capacidad_actual !== null &&
                    instalacion.capacidad_actual !== undefined
                    ? `${instalacion.capacidad_actual} ${instalacion.unidad_capacidad || ''
                        }`.trim()
                    : 'No registrada'
            )
        );

        grid.appendChild(
            campoInformativo(
                'Estado de capacidad',
                instalacion.capacidad_estado
            )
        );

        grid.appendChild(
            campoInformativo(
                'Fecha de asignación',
                formatearFecha(instalacion.fecha_asignacion)
            )
        );

        tarjeta.appendChild(grid);
        instalacionContenido.appendChild(tarjeta);

        mostrarInventario();
    }


    function mostrarInventario() {
        if (!inventarioContenido) return;

        inventarioContenido.replaceChildren();

        if (buscarInsumo) {
            buscarInsumo.disabled =
                !instalacionActual || !inventarioDisponible;
        }

        if (!instalacionActual) {
            inventarioContenido.appendChild(
                crearElemento(
                    'div',
                    'op-vacio',
                    'No hay una instalación asignada para consultar insumos.'
                )
            );
            return;
        }

        if (!inventarioDisponible) {
            inventarioContenido.appendChild(
                crearElemento(
                    'div',
                    'op-vacio',
                    'El inventario de insumos está disponible para instalaciones de tipo Depósito.'
                )
            );
            return;
        }

        const termino = normalizarTexto(
            buscarInsumo?.value || ''
        );

        const filtrados = insumosActuales.filter(item => {
            const contenido = normalizarTexto([
                item.nombre_item,
                item.tipo,
                item.estado
            ].join(' '));

            return contenido.includes(termino);
        });

        inventarioContenido.appendChild(
            crearElemento(
                'p',
                'op-inventario-count',
                `${filtrados.length} ${filtrados.length === 1
                    ? 'artículo encontrado'
                    : 'artículos encontrados'
                }`
            )
        );

        if (!filtrados.length) {
            inventarioContenido.appendChild(
                crearElemento(
                    'div',
                    'op-vacio',
                    insumosActuales.length === 0
                        ? 'Esta instalación todavía no tiene insumos registrados.'
                        : 'No se encontraron insumos con ese criterio.'
                )
            );
            return;
        }

        const listado = crearElemento(
            'div',
            'op-inventario-lista'
        );

        for (const item of filtrados) {
            const fila = crearElemento(
                'div',
                'op-insumo'
            );

            const informacion = crearElemento(
                'div',
                'op-insumo-info'
            );

            informacion.appendChild(
                crearElemento(
                    'strong',
                    'op-insumo-nombre',
                    item.nombre_item || 'Artículo'
                )
            );

            informacion.appendChild(
                crearElemento(
                    'small',
                    'op-insumo-detalle',
                    `${item.tipo || 'Sin categoría'} · ${item.estado || 'Sin estado'
                    }`
                )
            );

            const cantidad = crearElemento(
                'span',
                'op-cantidad',
                `Cantidad: ${item.cantidad ?? 0}`
            );

            const necesitaAtencion =
                ['carencia', 'fuera de servicio'].includes(
                    normalizarTexto(item.estado)
                ) ||
                Number(item.cantidad) === 0;

            if (necesitaAtencion) {
                fila.classList.add('op-insumo-alerta');
            }

            fila.append(informacion, cantidad);
            listado.appendChild(fila);
        }

        inventarioContenido.appendChild(listado);
    }

    async function cargarEstadoOperativo() {
        if (cargandoEstado) return;

        cargandoEstado = true;

        if (btnActualizar) {
            btnActualizar.disabled = true;
        }

        informarEstado(
            'Consultando la información de tu instalación...'
        );

        try {
            const datos = await apiGestion(
                '/operario/mi-instalacion'
            );

            mostrarInstalacion(datos);
        } catch (error) {
            instalacionActual = null;
            insumosActuales = [];
            inventarioDisponible = false;

            instalacionContenido?.replaceChildren();

            informarEstado(error.message, true);
            mostrarInventario();
        } finally {
            cargandoEstado = false;

            if (btnActualizar) {
                btnActualizar.disabled = false;
            }
        }
    }


    function informarChat(mensaje, error = false) {
        if (!estadoChat) return;

        estadoChat.textContent = mensaje;
        estadoChat.classList.toggle(
            'op-error-text',
            error
        );
    }

    function dibujarMensajes(mensajes) {
        if (!mensajesCaja) return;

        mensajesCaja.replaceChildren();

        if (!mensajes.length) {
            mensajesCaja.appendChild(
                crearElemento(
                    'p',
                    'op-chat-vacio',
                    'Todavía no hay mensajes. Podés iniciar la conversación.'
                )
            );
            return;
        }

        for (const mensaje of mensajes) {
            const esPropio =
                Number(mensaje.id_remitente) === miId;

            const fila = crearElemento(
                'div',
                `op-chat-fila ${esPropio ? 'propio' : ''
                }`
            );

            const burbuja = crearElemento(
                'div',
                `op-chat-burbuja ${esPropio ? 'propia' : ''
                }`
            );

            burbuja.appendChild(
                crearElemento(
                    'p',
                    '',
                    mensaje.mensaje || ''
                )
            );

            burbuja.appendChild(
                crearElemento(
                    'small',
                    '',
                    formatearFecha(mensaje.fecha_envio)
                )
            );

            fila.appendChild(burbuja);
            mensajesCaja.appendChild(fila);
        }

        mensajesCaja.scrollTop =
            mensajesCaja.scrollHeight;
    }

    async function cargarConversacion() {
        if (!contactoId || consultandoChat) return;

        consultandoChat = true;

        const idConsultado = contactoId;

        try {
            const datos = await apiGestion(
                `/mensajes/conversacion/${idConsultado}`
            );

            if (idConsultado !== contactoId) return;

            const mensajes = Array.isArray(datos?.mensajes)
                ? datos.mensajes
                : [];

            dibujarMensajes(mensajes);

            informarChat(
                'Conversación privada con Administración.'
            );

            await apiGestion(
                `/mensajes/conversacion/${idConsultado}/leidos`,
                'PUT'
            );
        } catch (error) {
            if (idConsultado === contactoId) {
                informarChat(error.message, true);
            }
        } finally {
            consultandoChat = false;

            if (
                idConsultado !== contactoId &&
                contactoId
            ) {
                cargarConversacion();
            }
        }
    }


    async function iniciarSoporte() {
        if (cargandoSoporte) return;

        cargandoSoporte = true;

        informarChat('Cargando administradores...');

        if (contactoSelect) {
            contactoSelect.disabled = true;
        }

        if (mensajeInput) {
            mensajeInput.disabled = true;
        }

        if (btnEnviar) {
            btnEnviar.disabled = true;
        }

        try {
            const [perfil, respuestaContactos] =
                await Promise.all([
                    obtenerPerfil(),
                    apiGestion('/mensajes/contactos')
                ]);

            miId = Number(perfil?.id_usuario);

            if (!Number.isInteger(miId) || miId <= 0) {
                throw new Error(
                    'No se pudo identificar al usuario autenticado.'
                );
            }

            const contactos = Array.isArray(
                respuestaContactos
            )
                ? respuestaContactos.filter(contacto =>
                    normalizarTexto(contacto.rol) ===
                    'administrador'
                )
                : [];

            const contactoAnterior = contactoId;

            contactoSelect.replaceChildren();

            if (!contactos.length) {
                contactoId = null;

                contactoSelect.appendChild(
                    new Option(
                        'No hay administradores disponibles',
                        ''
                    )
                );

                mensajesCaja.textContent =
                    'No hay administradores activos disponibles.';

                informarChat(
                    'No hay contactos de soporte disponibles.'
                );

                return;
            }

            for (const contacto of contactos) {
                const nombre = [
                    contacto.nombre,
                    contacto.apellido
                ]
                    .filter(Boolean)
                    .join(' ') ||
                    `Administrador ${contacto.id_usuario}`;

                const opcion = document.createElement(
                    'option'
                );

                opcion.value = String(
                    contacto.id_usuario
                );

                opcion.textContent = nombre;

                contactoSelect.appendChild(opcion);
            }

            const sigueDisponible = contactos.some(
                contacto =>
                    Number(contacto.id_usuario) ===
                    contactoAnterior
            );

            contactoId = sigueDisponible
                ? contactoAnterior
                : Number(contactos[0].id_usuario);

            contactoSelect.value = String(contactoId);

            contactoSelect.disabled = false;
            mensajeInput.disabled = false;
            btnEnviar.disabled = false;

            mensajesCaja.textContent =
                'Cargando conversación...';

            await cargarConversacion();
        } catch (error) {
            informarChat(error.message, true);

            if (mensajesCaja) {
                mensajesCaja.textContent =
                    'No se pudo cargar la conversación.';
            }
        } finally {
            cargandoSoporte = false;
        }
    }


    async function enviarMensaje(evento) {
        evento.preventDefault();

        if (
            enviandoChat ||
            !contactoId ||
            !mensajeInput
        ) {
            return;
        }

        const mensaje = mensajeInput.value.trim();

        if (!mensaje) {
            informarChat(
                'Escribí un mensaje antes de enviarlo.',
                true
            );
            return;
        }

        if (mensaje.length > 2000) {
            informarChat(
                'El mensaje supera los 2000 caracteres.',
                true
            );
            return;
        }

        enviandoChat = true;

        const destinatario = contactoId;

        btnEnviar.disabled = true;
        contactoSelect.disabled = true;

        try {
            await apiGestion(
                '/mensajes/enviar',
                'POST',
                {
                    id_destinatario: destinatario,
                    mensaje
                }
            );

            mensajeInput.value = '';

            informarChat('Mensaje enviado correctamente.');

            await cargarConversacion();
        } catch (error) {
            informarChat(error.message, true);
        } finally {
            enviandoChat = false;

            btnEnviar.disabled = !contactoId;
            contactoSelect.disabled = !contactoId;
        }
    }


    btnEstado?.addEventListener('click', () => {
        if (!modalEstado || !window.bootstrap) return;

        bootstrap.Modal
            .getOrCreateInstance(modalEstado)
            .show();

        cargarEstadoOperativo();
    });

    btnActualizar?.addEventListener(
        'click',
        cargarEstadoOperativo
    );

    buscarInsumo?.addEventListener(
        'input',
        mostrarInventario
    );

    btnSoporte?.addEventListener('click', () => {
        if (!modalSoporte || !window.bootstrap) return;

        bootstrap.Modal
            .getOrCreateInstance(modalSoporte)
            .show();

        iniciarSoporte();
    });

    contactoSelect?.addEventListener('change', () => {
        contactoId =
            Number(contactoSelect.value) || null;

        if (mensajesCaja) {
            mensajesCaja.textContent =
                'Cargando conversación...';
        }

        cargarConversacion();
    });

    formularioChat?.addEventListener(
        'submit',
        enviarMensaje
    );

    setInterval(() => {
        if (
            modalSoporte?.classList.contains('show') &&
            document.visibilityState === 'visible' &&
            contactoId &&
            !cargandoSoporte &&
            !enviandoChat
        ) {
            cargarConversacion();
        }
    }, 15000);

    setInterval(() => {
        if (
            modalEstado?.classList.contains('show') &&
            document.visibilityState === 'visible' &&
            !cargandoEstado
        ) {
            cargarEstadoOperativo();
        }
    }, 15000);

})();
