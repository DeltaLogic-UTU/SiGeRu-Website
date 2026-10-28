/**
 * Módulo independiente para simular el movimiento del camión del chofer.
 * Avanza por el trazado de calles (geometriaCalles) hasta cada contenedor,
 * se detiene habilitando los botones "Contenedor levantado" o "No levantado / Incidencia",
 * y al completarse cualquiera de los dos eventos continúa al siguiente contenedor,
 * luego al Vertedero Felipe Cardoso y finalmente regresa a la Base Cantón del Buceo.
 */
(function () {
  const COORD_BASE = [-34.899286, -56.129414];
  const COORD_VERTEDERO = [-34.851019, -56.099007];

  let estadoSimulacion = {
    timer: null,
    enPausaPorParada: false,
    puntosRuta: [],
    paradasIndices: [],
    indicePuntoActual: 0,
    indiceParadaActual: 0,
    distanciaTotalKm: 0,
    mapa: null,
    marcadorCamion: null,
    contenedores: [],
    onAvanceKm: null,
    onLlegarAContenedor: null,
    onFinalizarRecorrido: null
  };

  function distanciaCuadrada(lat1, lng1, lat2, lng2) {
    const dLat = lat1 - lat2;
    const dLng = lng1 - lng2;
    return dLat * dLat + dLng * dLng;
  }

  // Interpola puntos intermedios cuando un tramo recto es muy largo para que el movimiento se vea fluido
  function densificarPuntos(geometria) {
    if (!Array.isArray(geometria) || geometria.length < 2) {
      return [];
    }

    const resultado = [];
    for (let i = 0; i < geometria.length - 1; i++) {
      const [lat1, lng1] = [Number(geometria[i][0]), Number(geometria[i][1])];
      const [lat2, lng2] = [Number(geometria[i + 1][0]), Number(geometria[i + 1][1])];
      resultado.push([lat1, lng1]);

      const dist = Math.hypot(lat2 - lat1, lng2 - lng1);
      const pasos = Math.min(12, Math.floor(dist / 0.00035));
      for (let p = 1; p <= pasos; p++) {
        const t = p / (pasos + 1);
        resultado.push([
          lat1 + (lat2 - lat1) * t,
          lng1 + (lng2 - lng1) * t
        ]);
      }
    }

    const ultimo = geometria[geometria.length - 1];
    resultado.push([Number(ultimo[0]), Number(ultimo[1])]);
    return resultado;
  }

  // Encuentra en qué punto de la polilínea de calles se ubica cada contenedor en orden de recorrido
  function calcularIndicesDeParadas(puntosRuta, contenedores) {
    const indices = [];
    let buscarDesde = 0;

    contenedores.forEach((cont) => {
      const latC = Number(cont.latitud);
      const lngC = Number(cont.longitud);
      let mejorIndice = buscarDesde;
      let mejorDist = Infinity;

      // Buscamos hacia adelante en la ruta para respetar el sentido de circulación
      const limiteBusqueda = Math.max(buscarDesde + 1, Math.floor(puntosRuta.length * 0.85));
      for (let i = buscarDesde; i < puntosRuta.length; i++) {
        const d = distanciaCuadrada(latC, lngC, puntosRuta[i][0], puntosRuta[i][1]);
        if (d < mejorDist) {
          mejorDist = d;
          mejorIndice = i;
        }
        // Si ya encontramos un punto muy cercano (< ~25m), no nos pasamos a la vuelta
        if (d < 0.00000006 && i > buscarDesde) {
          break;
        }
        if (i > limiteBusqueda && mejorDist < 0.000002) {
          break;
        }
      }

      indices.push(mejorIndice);
      buscarDesde = mejorIndice;
    });

    return indices;
  }

  function detenerTimer() {
    if (estadoSimulacion.timer) {
      clearInterval(estadoSimulacion.timer);
      estadoSimulacion.timer = null;
    }
  }

  function ejecutarPaso() {
    if (estadoSimulacion.enPausaPorParada) {
      return;
    }

    const {
      puntosRuta,
      paradasIndices,
      indiceParadaActual,
      contenedores,
      distanciaTotalKm,
      mapa,
      marcadorCamion,
      onAvanceKm,
      onLlegarAContenedor,
      onFinalizarRecorrido
    } = estadoSimulacion;

    if (estadoSimulacion.indicePuntoActual >= puntosRuta.length - 1) {
      detenerTimer();
      const puntoFinal = puntosRuta[puntosRuta.length - 1];
      if (marcadorCamion && puntoFinal) {
        marcadorCamion.setLatLng(puntoFinal);
      }
      if (typeof onFinalizarRecorrido === 'function') {
        onFinalizarRecorrido();
      }
      return;
    }

    // Avanzamos un punto por el camino de calles
    estadoSimulacion.indicePuntoActual += 1;
    const idxActual = estadoSimulacion.indicePuntoActual;
    const coordActual = puntosRuta[idxActual];

    if (marcadorCamion && coordActual) {
      marcadorCamion.setLatLng(coordActual);
    }

    if (mapa && coordActual) {
      mapa.panTo(coordActual, { animate: true, duration: 0.12 });
    }

    // Calculamos los kilómetros recorridos proporcionales al avance en la ruta
    const progreso = idxActual / Math.max(1, puntosRuta.length - 1);
    const kmActuales = Number((distanciaTotalKm * progreso).toFixed(2));
    if (typeof onAvanceKm === 'function') {
      onAvanceKm(kmActuales, coordActual[0], coordActual[1]);
    }

    // Verificamos si llegamos al contenedor correspondiente a la parada actual
    if (indiceParadaActual < paradasIndices.length) {
      const idxObjetivoContenedor = paradasIndices[indiceParadaActual];
      if (idxActual >= idxObjetivoContenedor) {
        estadoSimulacion.enPausaPorParada = true;
        detenerTimer();

        const contenedorParada = contenedores[indiceParadaActual];
        if (marcadorCamion && contenedorParada?.latitud && contenedorParada?.longitud) {
          const posCont = [Number(contenedorParada.latitud), Number(contenedorParada.longitud)];
          marcadorCamion.setLatLng(posCont);
          if (mapa) {
            mapa.setView(posCont, Math.max(mapa.getZoom(), 17), { animate: true });
          }
        }

        if (typeof onLlegarAContenedor === 'function') {
          onLlegarAContenedor(contenedorParada, indiceParadaActual, contenedores.length);
        }
      }
    }
  }

  function reanudarLoop() {
    detenerTimer();
    estadoSimulacion.enPausaPorParada = false;
    estadoSimulacion.timer = setInterval(ejecutarPaso, 110);
  }

  window.SimuladorChofer = {
    iniciar(config) {
      detenerTimer();

      const contenedores = Array.isArray(config.contenedores) ? config.contenedores : [];
      let baseGeometria = Array.isArray(config.geometriaCalles) && config.geometriaCalles.length > 1
        ? config.geometriaCalles
        : [
            COORD_BASE,
            ...contenedores.map(c => [Number(c.latitud), Number(c.longitud)]),
            COORD_VERTEDERO,
            COORD_BASE
          ];

      const puntosRuta = densificarPuntos(baseGeometria);
      const paradasIndices = calcularIndicesDeParadas(puntosRuta, contenedores);

      estadoSimulacion = {
        timer: null,
        enPausaPorParada: false,
        puntosRuta,
        paradasIndices,
        indicePuntoActual: 0,
        indiceParadaActual: 0,
        distanciaTotalKm: Number(config.distanciaTotalKm || 12),
        mapa: config.mapa || null,
        marcadorCamion: config.marcadorCamion || null,
        contenedores,
        onAvanceKm: config.onAvanceKm || null,
        onLlegarAContenedor: config.onLlegarAContenedor || null,
        onFinalizarRecorrido: config.onFinalizarRecorrido || null
      };

      if (estadoSimulacion.marcadorCamion && puntosRuta[0]) {
        estadoSimulacion.marcadorCamion.setLatLng(puntosRuta[0]);
      }
      if (estadoSimulacion.mapa && puntosRuta[0]) {
        estadoSimulacion.mapa.setView(puntosRuta[0], 17, { animate: true });
      }

      reanudarLoop();
    },

    continuarAlSiguiente() {
      if (!estadoSimulacion.puntosRuta.length) {
        return;
      }
      estadoSimulacion.indiceParadaActual += 1;
      reanudarLoop();
    },

    detener() {
      detenerTimer();
    }
  };
})();

