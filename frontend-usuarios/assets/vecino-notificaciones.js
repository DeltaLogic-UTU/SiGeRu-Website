(() => {
    'use strict';

    const API_GESTION = 'http://127.0.0.1:8001';
    const REFRESCO_MS = 20000;

    const $ = id => document.getElementById(id);

    const ESTADOS = {
        sin_asignar: 'Pendiente',
        asignado: 'Asignado a cuadrilla',
        completado: 'Resuelto'
    };

    let primeraCarga = true;
    let ultimoId = 0;
    let consultando = false;
    let cantidadSinLeer = 0;
    let audioContexto = null;

    const estado = valor =>
        ESTADOS[String(valor ?? '').toLowerCase()] ||
        String(valor ?? 'Sin estado');

    const escapar = valor =>
        String(valor ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[c]);


    function fechaLocal(valor) {
        if (!valor) return 'Fecha no disponible';

        const fecha = new Date(
            String(valor).replace(' ', 'T')
        );

        return Number.isNaN(fecha.getTime())
            ? String(valor)
            : fecha.toLocaleString('es-UY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    }



    async function peticion(ruta, method = 'GET') {
        const token = localStorage.getItem('access_token');

        if (!token) {
            throw new Error(
                'Iniciá sesión para consultar las notificaciones.'
            );
        }

        const respuesta = await fetch(
            `${API_GESTION}/api${ruta}`,
            {
                method,
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const json = await respuesta.json().catch(
            () => ({})
        );

        if (!respuesta.ok || json.success === false) {
            throw new Error(
                json.message ||
                `No se pudieron consultar las notificaciones (HTTP ${respuesta.status}).`
            );
        }

        return json.data ?? json;
    }



    async function habilitarSonido() {
        const AudioCtx =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioCtx) return false;

        try {
            if (!audioContexto) {
                audioContexto = new AudioCtx();
            }

            if (audioContexto.state !== 'running') {
                await audioContexto.resume();
            }

            return audioContexto.state === 'running';

        } catch (error) {
            console.warn(
                'No se pudo habilitar el sonido:',
                error
            );

            return false;
        }
    }


    function sonidoNuevaNotificacion() {
        if (
            !audioContexto ||
            audioContexto.state !== 'running'
        ) {
            return;
        }

        try {
            const inicio = audioContexto.currentTime + 0.02;

            const notas = [
                {
                    frecuencia: 523.25,
                    demora: 0,
                    duracion: 0.30
                },
                {
                    frecuencia: 659.25,
                    demora: 0.15,
                    duracion: 0.33
                },
                {
                    frecuencia: 783.99,
                    demora: 0.30,
                    duracion: 0.36
                },
                {
                    frecuencia: 1046.50,
                    demora: 0.47,
                    duracion: 0.58
                }
            ];

            notas.forEach((nota, indice) => {
                const desde = inicio + nota.demora;
                const hasta = desde + nota.duracion;

                const principal =
                    audioContexto.createOscillator();

                const brillo =
                    audioContexto.createOscillator();

                const volumen =
                    audioContexto.createGain();

                const volumenBrillo =
                    audioContexto.createGain();

                principal.type = 'sine';
                principal.frequency.value = nota.frecuencia;

                brillo.type = 'sine';
                brillo.frequency.value = nota.frecuencia * 2;

                volumen.gain.setValueAtTime(
                    0.0001,
                    desde
                );

                volumen.gain.exponentialRampToValueAtTime(
                    indice === notas.length - 1 ? 0.18 : 0.14,
                    desde + 0.025
                );

                volumen.gain.exponentialRampToValueAtTime(
                    0.0001,
                    hasta
                );

                volumenBrillo.gain.setValueAtTime(
                    0.0001,
                    desde
                );

                volumenBrillo.gain.exponentialRampToValueAtTime(
                    0.035,
                    desde + 0.018
                );

                volumenBrillo.gain.exponentialRampToValueAtTime(
                    0.0001,
                    desde + nota.duracion * 0.7
                );

                principal.connect(volumen);
                brillo.connect(volumenBrillo);

                volumen.connect(
                    audioContexto.destination
                );

                volumenBrillo.connect(
                    audioContexto.destination
                );

                principal.start(desde);
                brillo.start(desde);

                principal.stop(hasta + 0.01);
                brillo.stop(hasta + 0.01);
            });

        } catch (error) {
            console.warn(
                'No se pudo reproducir la melodía:',
                error
            );
        }
    }



    function abrirPanel(abierto) {
        const panel = $('panelNotificacionesVecino');
        const boton = $('btnNotificacionesVecino');

        if (!panel || !boton) return;

        panel.hidden = !abierto;

        panel.style.setProperty(
            'display',
            abierto ? 'flex' : 'none',
            'important'
        );

        panel.style.setProperty(
            'visibility',
            abierto ? 'visible' : 'hidden',
            'important'
        );

        boton.setAttribute(
            'aria-expanded',
            String(abierto)
        );

        panel.setAttribute(
            'aria-hidden',
            String(!abierto)
        );

        if (abierto) {
            actualizarNotificaciones();
        }
    }



    function dibujarNotificaciones(items, sinLeer) {
        const contador =
            $('contadorNotificacionesVecino');

        const lista =
            $('listaNotificacionesVecino');

        const resumen =
            $('resumenNotificacionesVecino');

        const btnLeer =
            $('leerNotificacionesVecino');

        const boton =
            $('btnNotificacionesVecino');

        if (
            !contador ||
            !lista ||
            !resumen ||
            !btnLeer ||
            !boton
        ) {
            return;
        }

        const cantidad = Math.max(
            0,
            Number(sinLeer) || 0
        );

        cantidadSinLeer = cantidad;

        contador.textContent =
            cantidad > 99 ? '99+' : String(cantidad);

        contador.hidden = cantidad === 0;

        boton.setAttribute(
            'aria-label',
            cantidad
                ? `Notificaciones: ${cantidad} sin leer`
                : 'Notificaciones: ninguna sin leer'
        );

        resumen.textContent = `${cantidad} sin leer`;

        btnLeer.disabled = cantidad === 0;

        if (!items.length) {
            lista.innerHTML = `
                <p class="vecino-notificaciones-empty">
                    Todavía no recibiste actualizaciones.
                </p>
            `;

            return;
        }

        lista.innerHTML = items.map(n => {
            const detalle = n.tipo === 'resultado'
                ? 'Gestión comunicó el resultado de tu reclamo.'
                : `Estado: ${estado(n.estado_anterior)} → ${estado(n.estado_nuevo)}`;

            return `
                <article class="vecino-notificaciones-item ${n.leida_at ? '' : 'nueva'}">

                    <div class="vecino-notificaciones-item-head">
                        <strong>
                        Reclamo ${escapar(n.id_reclamo)}
                        </strong>

                        <div class="vecino-notificaciones-item-acciones">
                            <time>
                            ${escapar(fechaLocal(n.fecha))}
                            </time>

                            <button
                            type="button"
                            class="vecino-notificacion-eliminar"
                            data-eliminar-notificacion="${Number(n.id_notificacion)}"
                            title="Eliminar notificación"
                            aria-label="Eliminar notificación">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    <p>${escapar(detalle)}</p>

                </article>
            `;
        }).join('');
    }



    async function actualizarNotificaciones() {
        if (consultando) return;

        consultando = true;

        try {
            const data = await peticion(
                '/vecino/notificaciones'
            );

            const items =
                Array.isArray(data.notificaciones)
                    ? data.notificaciones
                    : [];

            const mayorId = items.reduce(
                (mayor, item) => Math.max(
                    mayor,
                    Number(item.id_notificacion) || 0
                ),
                ultimoId
            );

            const hayNuevas =
                !primeraCarga &&
                items.some(n =>
                    Number(n.id_notificacion) > ultimoId &&
                    !n.leida_at
                );

            if (hayNuevas) {
                sonidoNuevaNotificacion();
            }

            ultimoId = mayorId;
            primeraCarga = false;

            dibujarNotificaciones(
                items,
                data.sin_leer
            );

        } catch (error) {
            const panel =
                $('panelNotificacionesVecino');

            const lista =
                $('listaNotificacionesVecino');

            if (panel && !panel.hidden && lista) {
                lista.innerHTML = `
                    <p class="vecino-notificaciones-empty">
                        ${escapar(error.message)}
                    </p>
                `;
            }

            console.warn(
                'Notificaciones de Vecino:',
                error
            );

        } finally {
            consultando = false;
        }
    }



    async function marcarLeidas() {
        const boton =
            $('leerNotificacionesVecino');

        const lista =
            $('listaNotificacionesVecino');

        if (!boton || boton.disabled) return;

        boton.disabled = true;

        try {
            await peticion(
                '/vecino/notificaciones/leer',
                'POST'
            );

            await actualizarNotificaciones();

        } catch (error) {
            if (lista) {
                lista.insertAdjacentHTML(
                    'afterbegin',
                    `
                    <p class="vecino-notificaciones-empty">
                        ${escapar(error.message)}
                    </p>
                    `
                );
            }

        } finally {
            boton.disabled = cantidadSinLeer === 0;
        }
    }



    function iniciar() {
        const host =
            $('notificacionesHostVecino');

        const boton =
            $('btnNotificacionesVecino');

        const panel =
            $('panelNotificacionesVecino');

        const cerrar =
            $('cerrarNotificacionesVecino');

        const leer =
            $('leerNotificacionesVecino');

        if (
            !host ||
            !boton ||
            !panel ||
            !cerrar ||
            !leer
        ) {
            console.warn(
                'Faltan elementos HTML de las notificaciones.'
            );

            return;
        }

        if (
            boton.dataset.notificacionesIniciadas === '1'
        ) {
            return;
        }

        boton.dataset.notificacionesIniciadas = '1';

        abrirPanel(false);

        window.addEventListener(
            'pointerdown',
            () => {
                habilitarSonido();
            },
            {
                once: true,
                capture: true
            }
        );

        window.addEventListener(
            'keydown',
            () => {
                habilitarSonido();
            },
            {
                once: true,
                capture: true
            }
        );



        boton.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();

            const abrir = panel.hidden;

            abrirPanel(abrir);

            if (event.shiftKey) {
                const disponible = await habilitarSonido();

                if (disponible) {
                    sonidoNuevaNotificacion();
                }
            }
        });



        cerrar.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();

            abrirPanel(false);
        });



        leer.addEventListener('click', marcarLeidas);
        $('listaNotificacionesVecino')?.addEventListener('click', async event => {
            const boton = event.target.closest(
                '[data-eliminar-notificacion]'
            );

            if (!boton) return;

            event.preventDefault();
            event.stopPropagation();

            const id = Number(boton.dataset.eliminarNotificacion);

            if (!Number.isSafeInteger(id) || id <= 0) return;

            boton.disabled = true;

            try {
                await peticion(
                    `/vecino/notificaciones/${id}`,
                    'DELETE'
                );

                await actualizarNotificaciones();

            } catch (error) {
                boton.disabled = false;
                console.error('Error al eliminar notificación:', error);
            }
        });


        document.addEventListener('keydown', event => {
            if (
                event.key === 'Escape' &&
                !panel.hidden
            ) {
                abrirPanel(false);
                boton.focus();
            }
        });



        actualizarNotificaciones();



        setInterval(
            actualizarNotificaciones,
            REFRESCO_MS
        );



        document.addEventListener(
            'visibilitychange',
            () => {
                if (!document.hidden) {
                    actualizarNotificaciones();
                }
            }
        );
    }


    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            iniciar
        );
    } else {
        iniciar();
    }

})();
