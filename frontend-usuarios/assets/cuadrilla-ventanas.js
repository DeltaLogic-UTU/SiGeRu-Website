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
    windowBox.setAttribute('aria-labelledby', 'cqWindowTitle');

    windowBox.innerHTML = `
      <div class="cq-window-header">
        <h2 id="cqWindowTitle"></h2>
        <button
          type="button"
          class="cq-window-close"
          aria-label="Cerrar ventana">
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

    document.addEventListener('show.bs.modal', event => {
      if (event.target.matches('.cq-modal') && activeSection) {
        document.body.classList.add('cq-bootstrap-modal-active');
      }
    });

    document.addEventListener('hidden.bs.modal', event => {
      if (event.target.matches('.cq-modal') &&
        !document.querySelector('.cq-modal.show')) {
        document.body.classList.remove('cq-bootstrap-modal-active');
      }
    });

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

    function closeWindow() {
      if (!activeSection) return;

      originalPositions.forEach(({ element, placeholder }) => {
        placeholder.after(element);
        element.hidden = true;
      });

      content.replaceChildren();

      windowBox.hidden = true;
      backdrop.hidden = true;
      document.body.classList.remove('cq-window-open');

      document.body.classList.remove('cq-bootstrap-modal-active');
      activeSection = null;

      document.querySelectorAll(
        '.cq-header-navigation .cq-nav-link'
      ).forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }

      previousFocus = null;
    }

    function openWindow(sectionId, trigger) {
      if (!sections[sectionId]) return;

      if (activeSection) {
        closeWindow();
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

      closeButton.focus();
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

        closeWindow();

        document.getElementById(
          'cqMapSection'
        )?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 150);

        return;
      }

      if (!sections[targetId]) return;

      event.preventDefault();
      event.stopPropagation();

      openWindow(targetId, link);
    }, true);

    closeButton.addEventListener(
      'click',
      closeWindow
    );

    backdrop.addEventListener(
      'click',
      closeWindow
    );

    document.addEventListener('keydown', event => {
      if (!activeSection) return;

      if (event.key === 'Escape') {
        if (document.querySelector('.modal.show')) {
          return;
        }

        closeWindow();
      }

      if (event.key === 'Tab' &&
        !document.querySelector('.modal.show')) {
        const focusable = [
          ...windowBox.querySelectorAll(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
          )
        ].filter(el => el.getClientRects().length);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey &&
          document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey &&
          document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  });
})();
