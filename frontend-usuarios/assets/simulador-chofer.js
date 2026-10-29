/**
 * Módulo de navegación GPS y simulación interactiva estilo Waze para el Chofer.
 * - Guía paso a paso por las calles con indicaciones de giro (doblar a la izquierda, derecha, recto).
 * - Asistente de voz en tiempo real con Web Speech API (español).
 * - Velocímetro dinámico, orientación 3D del camión y detección de paradas en contenedores.
 */
(function () {
  const COORD_BASE = [-34.899286, -56.129414];
  const COORD_VERTEDERO = [-34.851019, -56.099007];

  let vozHabilitada = true;
  let ultimoTextoHablado = '';
  let ultimoMomentoHablado = 0;
  let intervaloPasoMs = 130; // Modo ágil y dinámico (fluido sin trabas)

  let estadoSimulacion = {
    timer: null,
    enPausaPorParada: false,
    puntosRuta: [],
    paradasIndices: [],
    pasosNavegacion: [],
    indicePuntoActual: 0,
    indiceParadaActual: 0,
    distanciaTotalKm: 0,
    velocidadActualKmH: 35,
    rumboActual: 0,
    mapa: null,
    marcadorCamion: null,
    contenedores: [],
    onAvanceKm: null,
    onLlegarAContenedor: null,
    onFinalizarRecorrido: null,
    onNavUpdate: null
  };

  function distanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calcularRumbo(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad);
    const x =
      Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
      Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  let vozHablando = false;
  let idUltimaEsquinaHablada = -1;
  let idUltimaParadaHablada = -1;
  let ultimoMomentoVoz = 0;

  function decirVoz(texto) {
    if (!vozHabilitada || typeof window.speechSynthesis === 'undefined') {
      return;
    }
    const ahora = Date.now();
    // No repetir la misma instrucción si ya se dijo recientemente
    if (texto === ultimoTextoHablado && ahora - ultimoMomentoHablado < 20000) {
      return;
    }
    // Si la voz está hablando actualmente, NO cancelar: dejar que termine de hablar completo
    if (window.speechSynthesis.speaking || vozHablando) {
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-UY';
      u.rate = 0.92; // Ritmo pausado y claro
      u.pitch = 1.0;
      const voces = window.speechSynthesis.getVoices();
      const vozEs = voces.find(v => v.lang.startsWith('es'));
      if (vozEs) u.voice = vozEs;

      ultimoTextoHablado = texto;
      ultimoMomentoHablado = ahora;
      vozHablando = true;

      u.onend = () => { vozHablando = false; };
      u.onerror = () => { vozHablando = false; };

      window.speechSynthesis.speak(u);
    } catch (err) {
      vozHablando = false;
      console.warn('Aviso en voz de navegación:', err);
    }
  }

  function densificarPuntos(geometria) {
    if (!Array.isArray(geometria) || geometria.length < 2) {
      return [];
    }

    const resultado = [];
    for (let i = 0; i < geometria.length - 1; i++) {
      const [lat1, lng1] = [Number(geometria[i][0]), Number(geometria[i][1])];
      const [lat2, lng2] = [Number(geometria[i + 1][0]), Number(geometria[i + 1][1])];
      resultado.push([lat1, lng1]);

      const distM = distanciaMetros(lat1, lng1, lat2, lng2);
      // Puntos fluidos cada 10 metros para desplazamiento ágil
      const pasos = Math.min(18, Math.floor(distM / 10));
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

  function calcularIndicesDeParadas(puntosRuta, contenedores) {
    const indices = [];
    let buscarDesde = 0;

    contenedores.forEach((cont) => {
      const latC = Number(cont.latitud);
      const lngC = Number(cont.longitud);
      let mejorIndice = buscarDesde;
      let mejorDist = Infinity;

      const limiteBusqueda = Math.max(buscarDesde + 1, Math.floor(puntosRuta.length * 0.9));
      for (let i = buscarDesde; i < puntosRuta.length; i++) {
        const d = distanciaMetros(latC, lngC, puntosRuta[i][0], puntosRuta[i][1]);
        if (d < mejorDist) {
          mejorDist = d;
          mejorIndice = i;
        }
        if (d < 15 && i > buscarDesde) {
          break;
        }
        if (i > limiteBusqueda && mejorDist < 45) {
          break;
        }
      }

      indices.push(mejorIndice);
      buscarDesde = mejorIndice;
    });

    return indices;
  }

  // Detecta el próximo giro buscando hacia adelante en los puntos de la calle
  function detectarProximaManiobra(idxActual) {
    const { puntosRuta, paradasIndices, indiceParadaActual, contenedores } = estadoSimulacion;
    const totalPuntos = puntosRuta.length;
    if (idxActual >= totalPuntos - 1) {
      return {
        tipoMani: 'arrive',
        icono: 'bi-check2-circle',
        instruccion: 'Llegada a Base Cantón del Buceo',
        calle: 'Fin de la jornada de recolección',
        distanciaM: 0,
        distanciaMText: '0 m',
        siguientePaso: 'Recorrido finalizado con éxito'
      };
    }

    const posActual = puntosRuta[idxActual];

    // 1. Verificamos si la próxima parada de contenedor está cerca
    if (indiceParadaActual < paradasIndices.length) {
      const idxParada = paradasIndices[indiceParadaActual];
      let distParadaM = 0;
      for (let p = idxActual; p < idxParada; p++) {
        distParadaM += distanciaMetros(puntosRuta[p][0], puntosRuta[p][1], puntosRuta[p + 1][0], puntosRuta[p + 1][1]);
      }

      const contenedorObjetivo = contenedores[indiceParadaActual];
      const codCont = contenedorObjetivo?.codigo || (`Contenedor #${indiceParadaActual + 1}`);

      if (distParadaM <= 140) {
        // Solo avisa una vez con anticipación prudente al acercarse al contenedor
        if (distParadaM <= 70 && distParadaM >= 25) {
          if (idUltimaParadaHablada !== indiceParadaActual && (Date.now() - ultimoMomentoVoz > 12000)) {
            decirVoz(`Próxima parada en contenedor ${codCont}`);
            idUltimaParadaHablada = indiceParadaActual;
            ultimoMomentoVoz = Date.now();
          }
        }

        return {
          tipoMani: 'arrive',
          icono: distParadaM <= 22 ? 'bi-trash3-fill' : 'bi-geo-alt-fill',
          instruccion: distParadaM <= 22 ? `Llegando a: ${codCont}` : `En ${Math.round(distParadaM)} m: ${codCont}`,
          calle: `Circuito ${contenedorObjetivo?.circuito || 'de recolección'}`,
          distanciaM: Math.round(distParadaM),
          distanciaMText: `${Math.round(distParadaM)} m`,
          siguientePaso: distParadaM <= 22 ? 'Preparate para levantar el contenedor' : 'Aproximándose al contenedor'
        };
      }
    }

    // 2. Buscamos el próximo giro significativo por ángulo entre tramos (lookahead de hasta 220 metros)
    let distAcumuladaM = 0;

    for (let k = idxActual + 1; k < totalPuntos - 1; k++) {
      if (distAcumuladaM > 220) break;
      distAcumuladaM += distanciaMetros(puntosRuta[k - 1][0], puntosRuta[k - 1][1], puntosRuta[k][0], puntosRuta[k][1]);

      const rumbo1 = calcularRumbo(puntosRuta[k - 1][0], puntosRuta[k - 1][1], puntosRuta[k][0], puntosRuta[k][1]);
      const rumbo2 = calcularRumbo(puntosRuta[k][0], puntosRuta[k][1], puntosRuta[k + 1][0], puntosRuta[k + 1][1]);
      let delta = (rumbo2 - rumbo1 + 540) % 360 - 180;

      if (Math.abs(delta) >= 26) {
        const esDerecha = delta > 0;
        const textoGiro = esDerecha ? 'doble a la derecha' : 'doble a la izquierda';
        const iconoGiro = esDerecha ? 'bi-arrow-90deg-right' : 'bi-arrow-90deg-left';
        const tipoMani = esDerecha ? 'turn-right' : 'turn-left';

        // Avisos de voz estilo Waze: solo cuando se acerca a doblar (entre 40 y 85 metros),
        // y se habla UNA SOLA VEZ por esquina para no aturdir ni repetir en bucle
        if (distAcumuladaM <= 85 && distAcumuladaM >= 30) {
          if (idUltimaEsquinaHablada !== k && (Date.now() - ultimoMomentoVoz > 10000)) {
            decirVoz(`En ${Math.round(distAcumuladaM)} metros, ${textoGiro}`);
            idUltimaEsquinaHablada = k;
            ultimoMomentoVoz = Date.now();
          }
        }

        return {
          tipoMani,
          icono: iconoGiro,
          instruccion: distAcumuladaM <= 25 ? (esDerecha ? 'Doble a la derecha' : 'Doble a la izquierda') : `En ${Math.round(distAcumuladaM)} m, ${textoGiro}`,
          calle: distAcumuladaM <= 25 ? 'Próxima intersección' : 'Siguiendo la ruta programada',
          distanciaM: Math.round(distAcumuladaM),
          distanciaMText: `${Math.round(distAcumuladaM)} m`,
          siguientePaso: distAcumuladaM <= 25 ? 'Maniobra en curso' : `Preparando giro a la ${esDerecha ? 'derecha' : 'izquierda'}`
        };
      }
    }

    // 3. Si no hay curvas cerradas próximas, continuar recto
    return {
      tipoMani: 'straight',
      icono: 'bi-arrow-up',
      instruccion: 'Continúe recto por la calle',
      calle: 'Avanzando en el circuito',
      distanciaM: Math.round(distAcumuladaM || 150),
      distanciaMText: `${Math.round(distAcumuladaM || 150)} m`,
      siguientePaso: 'Sin giros inmediatos'
    };
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
      onFinalizarRecorrido,
      onNavUpdate
    } = estadoSimulacion;

    if (estadoSimulacion.indicePuntoActual >= puntosRuta.length - 1) {
      detenerTimer();
      decirVoz('Ha llegado a la Base Cantón del Buceo. Recorrido de recolección completado.');
      if (typeof onNavUpdate === 'function') {
        onNavUpdate({
          tipoMani: 'arrive',
          icono: 'bi-check-circle-fill',
          instruccion: 'Recorrido finalizado',
          calle: 'Base Cantón del Buceo',
          distanciaM: 0,
          distanciaMText: '0 m',
          siguientePaso: 'Descarga en vertedero y regreso completados',
          velocidadKmH: 0,
          rumbo: estadoSimulacion.rumboActual
        });
      }
      if (typeof onFinalizarRecorrido === 'function') {
        onFinalizarRecorrido();
      }
      return;
    }

    // Avanzamos un punto en la ruta
    estadoSimulacion.indicePuntoActual += 1;
    const idxActual = estadoSimulacion.indicePuntoActual;
    const coordActual = puntosRuta[idxActual];
    const coordSig = puntosRuta[Math.min(idxActual + 1, puntosRuta.length - 1)];

    // Calculamos rumbo actual para orientar el camión hacia donde dobla
    if (coordActual && coordSig) {
      const nuevoRumbo = Math.round(calcularRumbo(coordActual[0], coordActual[1], coordSig[0], coordSig[1]));
      estadoSimulacion.rumboActual = nuevoRumbo;
    }

    // Posicionamos el camión y rotamos la flecha de orientación GPS
    if (marcadorCamion && coordActual) {
      marcadorCamion.setLatLng(coordActual);
      const arrowElem = document.getElementById('wazeTruckArrowRing');
      if (arrowElem) {
        arrowElem.style.transform = `rotate(${estadoSimulacion.rumboActual}deg)`;
      }
    }

    // Centramos la cámara suavemente sobre el camión (estilo Waze)
    if (mapa && coordActual) {
      mapa.panTo(coordActual, { animate: true, duration: 0.13 });
    }

    // Calculamos avance en Km
    const progreso = idxActual / Math.max(1, puntosRuta.length - 1);
    const kmActuales = Number((distanciaTotalKm * progreso).toFixed(2));
    if (typeof onAvanceKm === 'function') {
      onAvanceKm(kmActuales, coordActual[0], coordActual[1]);
    }

    // Detectamos la próxima maniobra (giro a la izquierda / derecha / llegada)
    const navInfo = detectarProximaManiobra(idxActual);

    // Variamos la velocidad simulada (desacelera antes de doblar o frenar)
    if (navInfo.tipoMani === 'arrive' && navInfo.distanciaM < 30) {
      estadoSimulacion.velocidadActualKmH = Math.max(8, Math.round(navInfo.distanciaM * 0.7));
    } else if (navInfo.distanciaM < 30 && (navInfo.tipoMani === 'turn-left' || navInfo.tipoMani === 'turn-right')) {
      estadoSimulacion.velocidadActualKmH = 20;
    } else {
      estadoSimulacion.velocidadActualKmH = Math.min(42, Math.max(30, 35 + (idxActual % 5)));
    }

    navInfo.velocidadKmH = estadoSimulacion.velocidadActualKmH;
    navInfo.rumbo = estadoSimulacion.rumboActual;

    if (typeof onNavUpdate === 'function') {
      onNavUpdate(navInfo);
    }

    // Verificamos llegada al contenedor
    if (indiceParadaActual < paradasIndices.length) {
      const idxObjetivoContenedor = paradasIndices[indiceParadaActual];
      if (idxActual >= idxObjetivoContenedor) {
        estadoSimulacion.enPausaPorParada = true;
        detenerTimer();
        estadoSimulacion.velocidadActualKmH = 0;

        const contenedorParada = contenedores[indiceParadaActual];
        if (marcadorCamion && contenedorParada?.latitud && contenedorParada?.longitud) {
          const posCont = [Number(contenedorParada.latitud), Number(contenedorParada.longitud)];
          marcadorCamion.setLatLng(posCont);
          if (mapa) {
            mapa.setView(posCont, Math.max(mapa.getZoom(), 17), { animate: true });
          }
        }

        if (typeof onNavUpdate === 'function') {
          onNavUpdate({
            tipoMani: 'arrive',
            icono: 'bi-trash3-fill',
            instruccion: `En parada: ${contenedorParada?.codigo || 'Contenedor'}`,
            calle: `Circuito ${contenedorParada?.circuito || '—'}`,
            distanciaM: 0,
            distanciaMText: '0 m',
            siguientePaso: 'Elegí "Contenedor levantado" o agregá incidencia',
            velocidadKmH: 0,
            rumbo: estadoSimulacion.rumboActual
          });
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
    estadoSimulacion.timer = setInterval(ejecutarPaso, intervaloPasoMs);
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
        pasosNavegacion: Array.isArray(config.pasosNavegacion) ? config.pasosNavegacion : [],
        indicePuntoActual: 0,
        indiceParadaActual: 0,
        distanciaTotalKm: Number(config.distanciaTotalKm || 12),
        velocidadActualKmH: 32,
        rumboActual: 0,
        mapa: config.mapa || null,
        marcadorCamion: config.marcadorCamion || null,
        contenedores,
        onAvanceKm: config.onAvanceKm || null,
        onLlegarAContenedor: config.onLlegarAContenedor || null,
        onFinalizarRecorrido: config.onFinalizarRecorrido || null,
        onNavUpdate: config.onNavUpdate || null
      };

      if (estadoSimulacion.marcadorCamion && puntosRuta[0]) {
        estadoSimulacion.marcadorCamion.setLatLng(puntosRuta[0]);
      }
      if (estadoSimulacion.mapa && puntosRuta[0]) {
        estadoSimulacion.mapa.setView(puntosRuta[0], 17, { animate: true });
      }

      decirVoz('Iniciando recorrido de recolección. Siga la ruta indicada.');
      reanudarLoop();
    },

    continuarAlSiguiente() {
      if (!estadoSimulacion.puntosRuta.length) {
        return;
      }
      estadoSimulacion.indiceParadaActual += 1;
      decirVoz('Continuando hacia el siguiente punto de la ruta.');
      reanudarLoop();
    },

    detener() {
      detenerTimer();
      if (typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    },

    setVozHabilitada(habilitada) {
      vozHabilitada = Boolean(habilitada);
      if (!vozHabilitada && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      return vozHabilitada;
    },

    isVozHabilitada() {
      return vozHabilitada;
    },

    setIntervaloMs(ms) {
      intervaloPasoMs = Math.max(200, Math.min(10000, Number(ms) || 2400));
      if (estadoSimulacion.timer && !estadoSimulacion.enPausaPorParada) {
        reanudarLoop();
      }
      return intervaloPasoMs;
    },

    getIntervaloMs() {
      return intervaloPasoMs;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const btnVoz = document.getElementById('btnVozNav');
    const iconoVoz = document.getElementById('iconoVozNav');
    if (btnVoz) {
      btnVoz.addEventListener('click', () => {
        const activa = !vozHabilitada;
        window.SimuladorChofer.setVozHabilitada(activa);
        btnVoz.classList.toggle('active', activa);
        btnVoz.classList.toggle('muted', !activa);
        if (iconoVoz) {
          iconoVoz.className = activa ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
        }
      });
    }

    const btnVel = document.getElementById('btnVelocidadSim');
    const txtVel = document.getElementById('txtVelocidadSim');
    if (btnVel) {
      const velocidades = [
        { label: 'Ágil', ms: 130, title: 'Velocidad normal ágil' },
        { label: 'Rápido', ms: 80, title: 'Velocidad rápida' },
        { label: 'Pausado', ms: 280, title: 'Velocidad pausada' }
      ];
      let velIdx = 0;
      btnVel.addEventListener('click', () => {
        velIdx = (velIdx + 1) % velocidades.length;
        const vel = velocidades[velIdx];
        window.SimuladorChofer.setIntervaloMs(vel.ms);
        if (txtVel) txtVel.textContent = vel.label;
        btnVel.title = vel.title;
      });
    }
  });
})();
