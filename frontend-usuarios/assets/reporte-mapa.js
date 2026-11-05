(() => {
    'use strict';

    const formulario = document.getElementById('reporteForm');
    const permitido = document.getElementById('reportePermitido');
    const elementoMapa = document.getElementById('reporteMapa');
    const campoId = document.getElementById('reporteIdContenedor');
    const seleccion = document.getElementById('reporteContenedorSeleccionado');
    const aviso = document.getElementById('reporteMapaAviso');

    if (!formulario || !permitido || !elementoMapa || !campoId) return;

    let mapa = null;
    let marcadores = null;
    let marcadorSeleccionado = null;
    let iniciado = false;

    function mensaje(valor, error = false) {
        if (!aviso) return;
        aviso.textContent = valor;
        aviso.classList.toggle('error', error);
    }

    function coordenadas(contenedor) {
        const lat = Number(contenedor.latitud);
        const lng = Number(contenedor.longitud);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180 ||
            (lat === 0 && lng === 0)
        ) {
            return null;
        }

        return [lat, lng];
    }

    function seleccionar(contenedor, marcador) {
        if (marcadorSeleccionado) {
            marcadorSeleccionado.setStyle({
                radius: 7,
                color: '#ffffff',
                fillColor: '#159b72',
                weight: 2
            });
        }

        marcadorSeleccionado = marcador;

        marcador.setStyle({
            radius: 11,
            color: '#ffffff',
            fillColor: '#f59e0b',
            weight: 3
        });

        campoId.value = String(contenedor.id_contenedor);

        const codigo =
            contenedor.codigo || `#${contenedor.id_contenedor}`;

        const ubicacion = [
            contenedor.calle,
            contenedor.altura,
            contenedor.barrio
        ].filter(Boolean).join(', ');

        if (seleccion) {
            seleccion.textContent =
                `Seleccionado: ${codigo}` +
                (ubicacion ? ` · ${ubicacion}` : '');
        }

        const zona = formulario.elements.namedItem('zona');
        const referencia = formulario.elements.namedItem('referencia');

        if (zona) {
            zona.value = contenedor.barrio || contenedor.zona || '';
        }

        if (referencia) {
            referencia.value = [
                contenedor.calle,
                contenedor.altura
            ].filter(Boolean).join(' ') ||
                contenedor.referencia || '';
        }

        mensaje('Contenedor vinculado al reporte.');

        marcador.openPopup();
    }

    async function iniciarMapa() {
        if (iniciado) return;
        iniciado = true;

        if (!window.L) {
            mensaje(
                'No se pudo cargar el mapa. Revisá tu conexión.',
                true
            );
            return;
        }

        mapa = L.map(elementoMapa, {
            scrollWheelZoom: false,
            dragging: !window.matchMedia(
                '(max-width: 700px)'
            ).matches
        }).setView([-34.9, -56.16], 12);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }
        ).addTo(mapa);

        marcadores = L.featureGroup().addTo(mapa);

        try {
            mensaje('Cargando contenedores…');

            const respuesta = await fetch(
                'http://127.0.0.1:8001/api/mapa/contenedores',
                {
                    headers: {
                        Accept: 'application/json'
                    },
                    cache: 'no-store'
                }
            );

            if (!respuesta.ok) {
                throw new Error(`Error HTTP ${respuesta.status}`);
            }

            const json = await respuesta.json();

            const contenedores = Array.isArray(json)
                ? json
                : Array.isArray(json.data)
                    ? json.data
                    : Array.isArray(json.data?.contenedores)
                        ? json.data.contenedores
                        : [];

            let disponibles = 0;

            for (const contenedor of contenedores) {
                const lugar = coordenadas(contenedor);

                if (
                    !lugar ||
                    !Number.isInteger(Number(contenedor.id_contenedor)) ||
                    Number(contenedor.id_contenedor) <= 0
                ) {
                    continue;
                }

                const marcador = L.circleMarker(lugar, {
                    radius: 7,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#159b72',
                    fillOpacity: 1
                }).addTo(marcadores);

                const contenido = document.createElement('div');

                const titulo = document.createElement('strong');
                titulo.textContent =
                    `Contenedor ${contenedor.codigo || contenedor.id_contenedor}`;

                contenido.appendChild(titulo);

                const texto = document.createElement('div');

                texto.textContent = [
                    contenedor.calle,
                    contenedor.barrio
                ].filter(Boolean).join(', ') || 'Ubicación registrada';

                contenido.appendChild(texto);

                marcador.bindPopup(contenido);

                marcador.on('click', () => {
                    seleccionar(contenedor, marcador);
                });

                disponibles++;
            }

            if (
                disponibles &&
                marcadores.getBounds().isValid()
            ) {
                mapa.fitBounds(
                    marcadores.getBounds().pad(0.1),
                    { maxZoom: 14 }
                );
            }

            mensaje(
                disponibles
                    ? `Elegí un contenedor en el mapa (${disponibles} disponibles).`
                    : 'No se encontraron contenedores con ubicación válida.',
                !disponibles
            );

        } catch (error) {
            mensaje(
                'No se pudieron cargar los contenedores. Recargá la página.',
                true
            );

            console.error('Mapa de reporte:', error);

        } finally {
            mapa.invalidateSize();
        }
    }

    formulario.addEventListener('reset', () => {
        setTimeout(() => {
            campoId.value = '';

            if (seleccion) {
                seleccion.textContent =
                    'Todavía no elegiste un contenedor.';
            }

            if (marcadorSeleccionado) {
                marcadorSeleccionado.setStyle({
                    radius: 7,
                    color: '#ffffff',
                    fillColor: '#159b72',
                    weight: 2
                });
            }

            marcadorSeleccionado = null;

            mensaje(
                'Elegí un contenedor en el mapa para el próximo reporte.'
            );
        }, 0);
    });

    if (permitido.getClientRects().length) {
        iniciarMapa();
    } else {
        const observador = new MutationObserver(() => {
            if (permitido.getClientRects().length) {
                observador.disconnect();
                iniciarMapa();
            }
        });

        observador.observe(permitido, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
})();
