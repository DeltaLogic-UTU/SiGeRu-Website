(() => {
  'use strict';

  const API = 'http://127.0.0.1:8001/api';
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  let idSeleccionado = Number(new URLSearchParams(location.search).get('asignacion')) || null;
  let recorrido = null;
  let rutas = [];
  let cargando = false;
  let operando = false;
  let mapa = null;
  let capaContenedores = null;
  let idMapaCentrado = null;

  function tokenSesion() {
    return (typeof getToken === 'function' ? getToken() : null) ||
      localStorage.getItem('access_token');
  }

  async function solicitar(ruta, metodo = 'GET') {
    const token = tokenSesion();
    if (!token) throw new Error('No hay una sesión activa.');

    let respuesta;
    try {
      respuesta = await fetch(`${API}${ruta}`, {
        method: metodo,
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      throw new Error('No se pudo conectar con Gestión (puerto 8001).');
    }

    const json = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || json.success === false) {
      const errores = Object.values(json.errors || {}).flat().join(' ');
      throw new Error(errores || json.message || `Error HTTP ${respuesta.status}`);
    }
    return json.data ?? json;
  }

  function aviso(mensaje, error = false) {
    const elemento = $('recAviso');
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.className = `alert ${error ? 'alert-danger' : 'alert-success'}`;
  }

  function esEnCurso(ruta) {
    return String(ruta?.estado ?? '').trim().toLowerCase() === 'en curso';
  }

  function actualizarURL() {
    const url = new URL(location.href);
    if (idSeleccionado) url.searchParams.set('asignacion', String(idSeleccionado));
    else url.searchParams.delete('asignacion');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function limpiarDetalle() {
    recorrido = null;
    $('recDetalle')?.classList.add('d-none');
    capaContenedores?.clearLayers();
  }

  function iniciarMapa() {
    if (mapa || !window.L || !$('recMapa')) return;
    mapa = L.map('recMapa', { scrollWheelZoom: false })
      .setView([-34.9, -56.16], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapa);
    capaContenedores = L.featureGroup().addTo(mapa);
  }

  function dibujarMapa() {
    iniciarMapa();
    if (!capaContenedores) return;
    capaContenedores.clearLayers();

    (recorrido?.contenedores || []).forEach(contenedor => {
      if (contenedor.latitud == null || contenedor.longitud == null) return;
      const latitud = Number(contenedor.latitud);
      const longitud = Number(contenedor.longitud);
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud) ||
        Math.abs(latitud) > 90 || Math.abs(longitud) > 180 ||
        (latitud === 0 && longitud === 0)) return;

      const recolectado = contenedor.estado_recorrido === 'Recolectado';
      L.circleMarker([latitud, longitud], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: recolectado ? '#159b72' : '#e2a23b',
        fillOpacity: 1
      }).bindPopup(`
        <strong>${escapeHTML(contenedor.codigo || `Contenedor ${contenedor.id_contenedor}`)}</strong>
        <div>${recolectado ? 'Recolectado' : 'Pendiente'}</div>
      `).addTo(capaContenedores);
    });

    mapa.invalidateSize();
    if (idMapaCentrado !== idSeleccionado && capaContenedores.getLayers().length) {
      mapa.fitBounds(capaContenedores.getBounds().pad(0.15), {
        maxZoom: 16,
        padding: [20, 20]
      });
      idMapaCentrado = idSeleccionado;
    }
  }

  function dibujarRutas() {
    $('recRutas').innerHTML = rutas.map(ruta => {
      const id = Number(ruta.id_asignacion);
      const activa = esEnCurso(ruta);
      return `
        <article class="cq-rec-route">
          <strong>${escapeHTML(ruta.nombre || `Ruta ${ruta.id_ruta}`)}</strong>
          <p>
            Cuadrilla ${escapeHTML(ruta.id_cuadrilla)} ·
            Circuito ${escapeHTML(ruta.circuito || 'No indicado')} ·
            ${escapeHTML(ruta.estado)}
          </p>
          <button type="button"
            class="btn ${activa ? 'btn-outline-success' : 'btn-success'} btn-sm"
            data-recorrido="${id}"
            data-accion="${activa ? 'ver' : 'iniciar'}">
            <i class="bi ${activa ? 'bi-arrow-right-circle' : 'bi-play-circle'}"></i>
            ${activa ? 'Continuar' : 'Iniciar'}
          </button>
        </article>
      `;
    }).join('') || '<p class="cq-small">No tenés recorridos asignados o en curso.</p>';
  }

  function dibujarDetalle() {
    if (!recorrido) {
      limpiarDetalle();
      return;
    }

    $('recDetalle').classList.remove('d-none');
    $('recNombre').textContent = recorrido.nombre || `Ruta ${recorrido.id_ruta}`;
    $('recEstado').textContent = recorrido.estado || 'Sin estado';
    $('recDescripcion').textContent =
      `Cuadrilla ${recorrido.id_cuadrilla} · ` +
      `Circuito ${recorrido.circuito || '—'} · ` +
      `Municipio ${recorrido.municipio || '—'}`;

    const contenedores = Array.isArray(recorrido.contenedores)
      ? recorrido.contenedores : [];
    const total = Number(recorrido.total) || contenedores.length;
    const recolectados = Number(recorrido.recolectados) || 0;
    const pendientes = Math.max(0, total - recolectados);
    const porcentaje = total > 0 ? Math.round(recolectados * 100 / total) : 0;

    $('recTotal').textContent = String(total);
    $('recHechos').textContent = String(recolectados);
    $('recPendientes').textContent = String(pendientes);
    $('recBarra').setAttribute('aria-valuenow', String(porcentaje));
    $('recBarraInterior').style.width = `${porcentaje}%`;
    $('recFinalizar').disabled = !esEnCurso(recorrido) || operando;

    $('recContenedores').innerHTML = contenedores.map(contenedor => {
      const recolectado = contenedor.estado_recorrido === 'Recolectado';
      const id = Number(contenedor.id_contenedor);
      const direccion = [contenedor.calle, contenedor.barrio].filter(Boolean).join(', ');
      return `
        <article class="cq-rec-container ${recolectado ? 'done' : ''}">
          <div>
            <strong>${escapeHTML(contenedor.codigo || `Contenedor ${id}`)}</strong>
            <p>${escapeHTML(direccion || `Circuito ${contenedor.circuito || '—'}`)}</p>
            <p>${recolectado ? 'Recolectado' : 'Pendiente'}</p>
          </div>
          <button type="button"
            class="btn ${recolectado ? 'btn-outline-success' : 'btn-success'} btn-sm"
            data-recolectar="${id}"
            ${recolectado || !esEnCurso(recorrido) || operando ? 'disabled' : ''}>
            <i class="bi ${recolectado ? 'bi-check-circle' : 'bi-check2'}"></i>
            ${recolectado ? 'Recolectado' : 'Marcar recolectado'}
          </button>
        </article>
      `;
    }).join('') || '<p class="cq-small">Esta ruta no tiene contenedores registrados.</p>';

    dibujarMapa();
  }

  async function cargar() {
    if (cargando || operando) return false;
    cargando = true;
    $('recActualizar').disabled = true;

    try {
      const respuesta = await solicitar('/cuadrilla/recorridos');
      if (!Array.isArray(respuesta)) {
        throw new Error('La API no devolvió una lista válida de rutas.');
      }
      rutas = respuesta;
      dibujarRutas();

      const existe = rutas.some(r => Number(r.id_asignacion) === idSeleccionado);
      if (!existe) {
        idSeleccionado = Number(rutas.find(esEnCurso)?.id_asignacion) || null;
        actualizarURL();
      }

      if (idSeleccionado) {
        const nuevo = await solicitar(`/cuadrilla/recorridos/${idSeleccionado}`);
        if (!nuevo || typeof nuevo !== 'object') {
          throw new Error('No se pudieron leer los datos del recorrido.');
        }
        recorrido = nuevo;
        dibujarDetalle();
      } else {
        limpiarDetalle();
      }
      return true;
    } catch (error) {
      aviso(error.message || 'No se pudieron actualizar los recorridos.', true);
      return false;
    } finally {
      cargando = false;
      $('recActualizar').disabled = false;
    }
  }

  async function iniciar(id, boton) {
    if (operando || cargando) return;
    operando = true;
    boton.disabled = true;

    try {
      await solicitar(`/cuadrilla/recorridos/${id}/iniciar`, 'POST');
      idSeleccionado = id;
      actualizarURL();
      aviso('Recorrido iniciado.');
    } catch (error) {
      aviso(error.message || 'No se pudo iniciar el recorrido.', true);
      return;
    } finally {
      operando = false;
      boton.disabled = false;
    }
    await cargar();
  }

  async function marcarRecolectado(idContenedor, boton) {
    if (operando || cargando || !recorrido || !esEnCurso(recorrido)) return;
    operando = true;
    boton.disabled = true;
    $('recFinalizar').disabled = true;

    let guardado = false;
    try {
      await solicitar(
        `/cuadrilla/recorridos/${idSeleccionado}/contenedores/${idContenedor}`,
        'POST'
      );
      guardado = true;
      aviso('Contenedor recolectado. Se guardó en Gestión.');
    } catch (error) {
      aviso(error.message || 'No se pudo guardar la recolección.', true);
    } finally {
      operando = false;
    }

    if (guardado) {
      const actualizado = await cargar();
      if (!actualizado) aviso(
        'El contenedor se guardó, pero no se pudo actualizar el listado. Recargá la página.',
        true
      );
    } else {
      dibujarDetalle();
    }
  }

  function mostrarDialogoRecorrido({
    titulo,
    mensaje,
    botonConfirmar = 'Confirmar',
    soloAceptar = false
  }) {
    return new Promise(resolve => {
      const dialogo = document.createElement('dialog');

      dialogo.className = 'cq-rec-dialog';

      dialogo.setAttribute(
        'aria-labelledby',
        'cqRecDialogoTitulo'
      );

      dialogo.setAttribute(
        'aria-describedby',
        'cqRecDialogoMensaje'
      );

      dialogo.innerHTML = `
      <div class="cq-rec-dialog-title">
        <i
          class="bi bi-check2-circle"
          aria-hidden="true">
        </i>

        <h2 id="cqRecDialogoTitulo"></h2>
      </div>

      <p id="cqRecDialogoMensaje"></p>

      <div class="cq-rec-dialog-actions">
        ${soloAceptar ? '' : `
          <button
            type="button"
            class="btn btn-outline-secondary"
            data-rec-dialog-cancelar>
            Cancelar
          </button>
        `}

        <button
          type="button"
          class="btn btn-success"
          data-rec-dialog-aceptar>
        </button>
      </div>
    `;

      dialogo.querySelector(
        '#cqRecDialogoTitulo'
      ).textContent = titulo;

      dialogo.querySelector(
        '#cqRecDialogoMensaje'
      ).textContent = mensaje;

      dialogo.querySelector(
        '[data-rec-dialog-aceptar]'
      ).textContent = botonConfirmar;

      dialogo.querySelector(
        '[data-rec-dialog-cancelar]'
      )?.addEventListener('click', () => {
        dialogo.close('cancelar');
      });

      dialogo.querySelector(
        '[data-rec-dialog-aceptar]'
      ).addEventListener('click', () => {
        dialogo.close('aceptar');
      });

      dialogo.addEventListener('close', () => {
        const aceptado =
          dialogo.returnValue === 'aceptar';

        dialogo.remove();

        resolve(aceptado);
      }, { once: true });

      document.body.appendChild(dialogo);

      dialogo.showModal();

      (
        dialogo.querySelector('[data-rec-dialog-cancelar]') ||
        dialogo.querySelector('[data-rec-dialog-aceptar]')
      ).focus();
    });
  }

  async function finalizar() {
    if (
      operando ||
      cargando ||
      !recorrido ||
      !esEnCurso(recorrido)
    ) {
      return;
    }

    const pendientes = Math.max(
      0,
      Number(recorrido.pendientes) || 0
    );

    const mensaje = pendientes > 0
      ? `Quedan ${pendientes} contenedores pendientes. ` +
      '¿Finalizar el recorrido igualmente?'
      : '¿Confirmás que querés finalizar el recorrido?';

    operando = true;

    const confirmado = await mostrarDialogoRecorrido({
      titulo: 'Finalizar recorrido',
      mensaje,
      botonConfirmar: 'Sí, finalizar'
    });

    if (!confirmado) {
      operando = false;
      return;
    }

    $('recFinalizar').disabled = true;

    try {
      await solicitar(
        `/cuadrilla/recorridos/${idSeleccionado}/finalizar`,
        'POST'
      );

      await mostrarDialogoRecorrido({
        titulo: 'Recorrido finalizado',
        mensaje:
          'El recorrido se guardó correctamente en el historial.',
        botonConfirmar: 'Volver',
        soloAceptar: true
      });

      window.location.href =
        'cuadrilla-usuario.html#cqHistorySection';

    } catch (error) {
      aviso(
        error.message ||
        'No se pudo finalizar el recorrido.',
        true
      );

      operando = false;
      dibujarDetalle();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    iniciarMapa();
    $('recActualizar').addEventListener('click', cargar);

    $('recRutas').addEventListener('click', async event => {
      const boton = event.target.closest('[data-recorrido]');
      if (!boton || boton.disabled || operando || cargando) return;
      const id = Number(boton.dataset.recorrido);
      if (!Number.isInteger(id) || id <= 0) return;

      if (boton.dataset.accion === 'iniciar') {
        await iniciar(id, boton);
      } else {
        idSeleccionado = id;
        actualizarURL();
        await cargar();
      }
    });

    $('recContenedores').addEventListener('click', event => {
      const boton = event.target.closest('[data-recolectar]');
      if (!boton || boton.disabled) return;
      const id = Number(boton.dataset.recolectar);
      if (Number.isInteger(id) && id > 0) marcarRecolectado(id, boton);
    });

    $('recFinalizar').addEventListener('click', finalizar);

    setInterval(() => {
      if (!document.hidden && !operando && !cargando) cargar();
    }, 30000);

    cargar();
  });
})();
