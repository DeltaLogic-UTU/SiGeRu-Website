const API_GESTION_AUTH = 'http://127.0.0.1:8000';

const root = document.documentElement;
const savedTheme = localStorage.getItem('sigeru-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';

root.dataset.theme = savedTheme || preferredTheme;

function updateThemeButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        const isLight = root.dataset.theme === 'light';

        button.innerHTML =
            `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i>` +
            `<span>${isLight ? 'Oscuro' : 'Claro'}</span>`;

        button.setAttribute(
            'aria-label',
            isLight ? 'Activar modo oscuro' : 'Activar modo claro'
        );
    });
}

updateThemeButtons();

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('sigeru-theme', root.dataset.theme);
        updateThemeButtons();
    });
});

async function obtenerCsrfGestion() {
    const response = await fetch(`${API_GESTION_AUTH}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('No se pudo obtener el token CSRF.');
    }

    const result = await response.json();
    return result.token;
}

async function obtenerSesionGestion() {
    const response = await fetch(`${API_GESTION_AUTH}/api/session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    });

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = { success: false };
    }

    return { response, result };
}

async function cerrarSesionGestion() {
    const token = await obtenerCsrfGestion();

    return fetch(`${API_GESTION_AUTH}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': token
        }
    });
}

function rolGestionPermitido(rol) {
    const valor = String(rol || '').trim().toLowerCase();
    return valor === 'administrador' || valor === 'supervisor';
}

async function protegerGestion() {
    try {
        const { response, result } = await obtenerSesionGestion();

        if (!response.ok || !result.success || !result.usuario) {
            window.location.replace('../landing-page/login.html');
            return null;
        }

        const rol = String(result.usuario.rol || '').trim().toLowerCase();

        if (!rolGestionPermitido(rol)) {
            window.location.replace('../landing-page/login.html');
            return null;
        }

        const perfilActivo = document.getElementById('perfilActivo');

        if (perfilActivo) {
            perfilActivo.textContent = rol;
        }

        return result.usuario;

    } catch (error) {
        console.error(error);
        window.location.replace('../landing-page/login.html');
        return null;
    }
}

document.querySelectorAll('[data-logout]').forEach((link) => {
    link.addEventListener('click', async (event) => {
        event.preventDefault();

        try {
            await cerrarSesionGestion();
        } catch (error) {
            console.error(error);
        }

        window.location.replace('../landing-page/login.html');
    });
});

protegerGestion();