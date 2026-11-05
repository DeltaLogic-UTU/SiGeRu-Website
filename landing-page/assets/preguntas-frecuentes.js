document.addEventListener('DOMContentLoaded', () => {

    const root = document.documentElement;

    const themeButton = document.querySelector('[data-theme-toggle]');
    const searchInput = document.getElementById('faqSearch');
    const resultsText = document.getElementById('faqResults');
    const emptyMessage = document.getElementById('faqEmpty');

    const faqMore = document.getElementById('faqMore');
    const faqMoreText = document.getElementById('faqMoreText');

    const groups = [...document.querySelectorAll('.faq-group')];
    const questions = [...document.querySelectorAll('.faq-item')];

    const categoryLinks = document.querySelectorAll(
        '.faq-category-nav a[href^="#"]'
    );



    function updateTheme() {

        if (!themeButton) return;

        const isLight = root.dataset.theme === 'light';

        themeButton.innerHTML = isLight
            ? '<i class="bi bi-moon" aria-hidden="true"></i>'
            : '<i class="bi bi-sun" aria-hidden="true"></i>';

        const label = isLight
            ? 'Activar modo oscuro'
            : 'Activar modo claro';

        themeButton.setAttribute('aria-label', label);
        themeButton.setAttribute('title', label);
    }


    function initializeTheme() {

        const preferredTheme = window.matchMedia(
            '(prefers-color-scheme: light)'
        ).matches ? 'light' : 'dark';

        let savedTheme = null;

        try {
            savedTheme = localStorage.getItem('sigeru-theme');
        } catch (error) {
        }

        root.dataset.theme =
            savedTheme === 'light' || savedTheme === 'dark'
                ? savedTheme
                : preferredTheme;

        updateTheme();
    }


    themeButton?.addEventListener('click', () => {

        root.dataset.theme = root.dataset.theme === 'light'
            ? 'dark'
            : 'light';

        try {
            localStorage.setItem('sigeru-theme', root.dataset.theme);
        } catch (error) {
        }

        updateTheme();
    });



    function normalizeText(text) {

        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }



    function updateMoreLabel() {

        if (!faqMore || !faqMoreText) return;

        faqMoreText.textContent = faqMore.open
            ? 'Mostrar menos preguntas frecuentes'
            : 'Ver más preguntas frecuentes';
    }


    function openMore() {

        if (!faqMore) return;

        faqMore.hidden = false;
        faqMore.open = true;

        updateMoreLabel();
    }


    faqMore?.addEventListener('toggle', updateMoreLabel);



    function filterQuestions() {

        const term = normalizeText(searchInput?.value || '');

        let visibleCount = 0;

        questions.forEach(question => {

            const content = normalizeText(question.textContent);

            const matches = !term || content.includes(term);

            question.hidden = !matches;

            if (matches) {
                visibleCount++;
            }

        });


        groups.forEach(group => {

            const hasMatches = [
                ...group.querySelectorAll('.faq-item')
            ].some(question => !question.hidden);

            group.hidden = !hasMatches;
        });


        if (faqMore) {

            const matchingExtraGroups = [
                ...faqMore.querySelectorAll('.faq-group')
            ].some(group => !group.hidden);

            if (!term) {
                faqMore.hidden = false;
            } else {
                faqMore.hidden = !matchingExtraGroups;
            }

            if (term && matchingExtraGroups) {
                openMore();
            }
        }


        if (resultsText) {

            const total = questions.length;

            resultsText.textContent = term
                ? `Se encontraron ${visibleCount} de ${total} preguntas.`
                : `${total} preguntas disponibles en ${groups.length} categorías.`;
        }


        if (emptyMessage) {
            emptyMessage.hidden = visibleCount !== 0;
        }
    }



    function goToCategory(id, updateUrl = true) {

        const target = document.getElementById(id);

        if (!target || !target.classList.contains('faq-group')) {
            return;
        }

        if (searchInput && searchInput.value) {

            searchInput.value = '';

            filterQuestions();
        }

        if (faqMore && faqMore.contains(target)) {
            openMore();
        }

        if (updateUrl) {

            history.replaceState(
                null,
                '',
                `#${encodeURIComponent(id)}`
            );
        }

        requestAnimationFrame(() => {

            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

        });
    }


    categoryLinks.forEach(link => {

        link.addEventListener('click', event => {

            const id = link.getAttribute('href').slice(1);

            if (!document.getElementById(id)) return;

            event.preventDefault();

            goToCategory(id);
        });

    });



    function openFromHash() {

        const id = decodeURIComponent(
            window.location.hash.slice(1)
        );

        if (!id) return;

        goToCategory(id, false);
    }


    window.addEventListener('hashchange', openFromHash);



    function initializeFAQ() {

        initializeTheme();

        if (searchInput) {
            searchInput.value = '';
        }

        questions.forEach(question => {
            question.hidden = false;
        });

        groups.forEach(group => {
            group.hidden = false;
        });

        if (faqMore) {
            faqMore.hidden = false;
            faqMore.open = false;
        }

        if (emptyMessage) {
            emptyMessage.hidden = true;
        }

        updateMoreLabel();
        filterQuestions();
        openFromHash();
    }


    searchInput?.addEventListener('input', filterQuestions);

    initializeFAQ();


    window.addEventListener('pageshow', event => {

        if (!event.persisted) return;

        if (searchInput) {
            searchInput.value = '';
        }

        filterQuestions();
    });

});
