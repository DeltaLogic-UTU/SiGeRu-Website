(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const sections = {
      cqTasksSection: [
        'cqTasksSection',
        'cqTaskDetailSection'
      ],
      cqEquipoSection: [
        'cqEquipoSection',
        'cqRoutesSection'
      ],
      cqHistorySection: [
        'cqHistorySection'
      ],
      cqMessagesSection: [
        'cqMessagesSection'
      ]
    };

    const titles = {
      cqTasksSection: 'Tareas asignadas',
      cqEquipoSection: 'Equipo y rutas',
      cqHistorySection: 'Historial de trabajos',
      cqMessagesSection: 'Mensajes'
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'cq-window-backdrop';
    backdrop.hidden = true;

    const windowBox = document.createElement('div');
    windowBox.className = 'cq-window';
    windowBox.hidden = true;

    windowBox.setAttribute('role', 'dialog');
    windowBox.setAttribute('aria-modal', 'true');
    windowBox.setAttribute(
      'aria-labelledby',
      'cqWindowTitle'
    );

    windowBox.innerHTML = `
      <div class="cq-window-header">
        <h2 id="cqWindowTitle"></h2>

        <button
          type="button"
          class="cq-window-close"
          aria-label="Cerrar ventana"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="cq-window-content"></div>
    `;

    document.body.append(backdrop, windowBox);

    const content = windowBox.querySelector(
      '.cq-window-content'
    );

    const closeButton = windowBox.querySelector(
      '.cq-window-close'
    );

    const originalPositions = new Map();

    let activeSection = null;
    let previousFocus = null;

    Object.values(sections).flat().forEach(id => {
      const element = document.getElementById(id);

      if (!element) return;

      const placeholder = document.createComment(
        `Posición original: ${id}`
      );

      element.parentNode.insertBefore(
        placeholder,
        element
      );

      originalPositions.set(id, {
        element,
        placeholder
      });

      element.classList.add('cq-window-section');
      element.hidden = true;
    });

    function actualizarNavegacion(sectionId = null) {
      document.querySelectorAll(
        '.cq-header-navigation .cq-nav-link'
      ).forEach(link => {
        const selected =
          link.getAttribute('href') === `#${sectionId}`;

        link.classList.toggle('active', selected);

        if (selected) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    function closeWindow(restoreFocus = true) {
      if (!activeSection) return;

      originalPositions.forEach(({
        element,
        placeholder
      }) => {
        placeholder.after(element);
        element.hidden = true;
      });

      content.replaceChildren();

      windowBox.hidden = true;
      backdrop.hidden = true;

      document.body.classList.remove(
        'cq-window-open',
        'cq-bootstrap-modal-active'
      );

      activeSection = null;

      actualizarNavegacion();

      if (
        restoreFocus &&
        previousFocus?.isConnected
      ) {
        previousFocus.focus();
      }

      previousFocus = null;
    }

    function openWindow(sectionId, trigger = null) {
      if (!sections[sectionId]) return;

      if (activeSection === sectionId) return;

      if (activeSection) {
        closeWindow(false);
      }

      previousFocus = trigger || document.activeElement;
      activeSection = sectionId;

      document.getElementById(
        'cqWindowTitle'
      ).textContent = titles[sectionId];

      sections[sectionId].forEach(id => {
        const item = originalPositions.get(id);

        if (!item) return;

        item.element.hidden = false;
        content.appendChild(item.element);
      });

      backdrop.hidden = false;
      windowBox.hidden = false;

      document.body.classList.add('cq-window-open');

      actualizarNavegacion(sectionId);

      closeButton.focus();
    }

    function abrirMapa() {
      closeWindow(false);

      const mapSection = document.getElementById(
        'cqMapSection'
      );

      if (mapSection) {
        mapSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    }

    function abrirDesdeURL() {
      const hash = decodeURIComponent(
        window.location.hash.slice(1)
      );

      const sectionId = hash === 'cqRoutesSection'
        ? 'cqEquipoSection'
        : hash;

      if (sectionId === 'cqMapSection') {
        abrirMapa();
        return;
      }

      if (!sections[sectionId]) return;

      const enlace = document.querySelector(
        `.cq-header-navigation a[href="#${sectionId}"]`
      );

      openWindow(sectionId, enlace);
    }

    document.addEventListener('click', event => {
      const link = event.target.closest(
        '.cq-header-navigation a[href^="#"]'
      );

      if (!link) return;

      const targetId = link.getAttribute('href').slice(1);

      if (targetId === 'cqMapSection') {
        event.preventDefault();
        event.stopPropagation();

        abrirMapa();
        return;
      }

      if (!sections[targetId]) return;

      event.preventDefault();
      event.stopPropagation();

      openWindow(targetId, link);
    }, true);

    closeButton.addEventListener(
      'click',
      () => closeWindow()
    );

    backdrop.addEventListener(
      'click',
      () => {
        if (document.querySelector('.modal.show')) return;
        closeWindow();
      }
    );

    document.addEventListener('show.bs.modal', event => {
      if (
        event.target.matches('.cq-modal') &&
        activeSection
      ) {
        document.body.classList.add(
          'cq-bootstrap-modal-active'
        );
      }
    });

    document.addEventListener('hidden.bs.modal', event => {
      if (
        event.target.matches('.cq-modal') &&
        !document.querySelector('.cq-modal.show')
      ) {
        document.body.classList.remove(
          'cq-bootstrap-modal-active'
        );
      }
    });

    document.addEventListener('keydown', event => {
      if (!activeSection) return;

      if (document.querySelector('.modal.show')) {
        return;
      }

      if (event.key === 'Escape') {
        closeWindow();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = [
        ...windowBox.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      ].filter(el => el.getClientRects().length);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener(
      'hashchange',
      abrirDesdeURL
    );

    abrirDesdeURL();
  });
})();
