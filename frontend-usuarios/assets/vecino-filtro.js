(() => {
    'use strict';

    let filtroActual = 'todos';

    const $ = id => document.getElementById(id);

    function coordenadasValidas(c) {
        const lat = Number(c.latitud);
        const lng = Number(c.longitud);

        return Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180 &&
            !(lat === 0 && lng === 0);
    }

    function obtenerVisibles() {
        const todos = vecinoState.contenedores.filter(
            coordenadasValidas
        );

        if (
            filtroActual !== 'cercanos' ||
            !vecinoState.ubicacionUsuario
        ) {
            return todos;
        }

        const { lat, lng } = vecinoState.ubicacionUsuario;

        return todos
            .map(c => ({
                contenedor: c,
                distancia: calcularDistanciaMetros(
                    lat,
                    lng,
                    Number(c.latitud),
                    Number(c.longitud)
                )
            }))
            .sort((a, b) => a.distancia - b.distancia)
            .slice(0, 5)
            .map(item => item.contenedor);
    }

    function pintarMapa(centrar = false) {
        if (!vecinoState.map) return;

        const visibles = obtenerVisibles();

        renderContenedoresEnMapa(visibles);

        if (!centrar || !visibles.length) return;

        const bounds = L.latLngBounds(
            visibles.map(c => [
                Number(c.latitud),
                Number(c.longitud)
            ])
        );

        if (
            filtroActual === 'cercanos' &&
            vecinoState.ubicacionUsuario
        ) {
            const { lat, lng } = vecinoState.ubicacionUsuario;

            bounds.extend([lat, lng]);
        }

        vecinoState.map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: filtroActual === 'cercanos' ? 16 : 14
        });
    }

    function cambiarFiltro(tipo) {
        filtroActual = tipo;

        const texto = $('textoFiltroContenedores');

        if (texto) {
            texto.textContent =
                tipo === 'cercanos' ? 'Más cercanos' : 'Todos';
        }

        document.querySelectorAll(
            '[data-filtro-contenedores]'
        ).forEach(boton => {
            const activo =
                boton.dataset.filtroContenedores === tipo;

            boton.classList.toggle('active', activo);

            boton.setAttribute(
                'aria-current',
                activo ? 'true' : 'false'
            );
        });

        cerrarBottomSheet();

        vecinoState.contenedorSeleccionado = null;

        pintarMapa(true);
    }

    function elegirCercanos(boton) {
        if (vecinoState.ubicacionUsuario) {
            cambiarFiltro('cercanos');
            return;
        }

        if (!navigator.geolocation) {
            alert('Tu navegador no permite obtener la ubicación.');
            return;
        }

        boton.disabled = true;

        navigator.geolocation.getCurrentPosition(
            posicion => {
                boton.disabled = false;

                vecinoState.ubicacionUsuario = {
                    lat: posicion.coords.latitude,
                    lng: posicion.coords.longitude
                };

                cambiarFiltro('cercanos');
            },
            () => {
                boton.disabled = false;

                alert(
                    'No pudimos obtener tu ubicación. ' +
                    'Revisá los permisos del navegador.'
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    function iniciar() {
        if (!$('btnFiltroContenedores')) return;

        window.actualizarFiltroContenedoresVecino = () => {
            pintarMapa(false);
        };

        document.querySelectorAll(
            '[data-filtro-contenedores]'
        ).forEach(boton => {
            boton.addEventListener('click', () => {
                if (
                    boton.dataset.filtroContenedores === 'cercanos'
                ) {
                    elegirCercanos(boton);
                } else {
                    cambiarFiltro('todos');
                }
            });
        });

        const seleccionado = document.querySelector(
            '[data-filtro-contenedores="todos"]'
        );

        seleccionado?.classList.add('active');
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