const gestionAutenticada =
  sessionStorage.getItem('sigeruAutenticado') === 'true' &&
  sessionStorage.getItem('sigeruPerfil') === 'administrador';

if (!gestionAutenticada) {
  alert('Debés iniciar sesión como administrador para ingresar a Gestión.');
  window.location.replace('../landing-page/login.html');
}

const root = document.documentElement;
const savedTheme = localStorage.getItem('sigeru-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

root.dataset.theme = savedTheme || preferredTheme;

function updateThemeButton() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isLight = root.dataset.theme === 'light';
    button.innerHTML = `<i class="bi ${isLight ? 'bi-moon' : 'bi-sun'}"></i><span>${isLight ? 'Oscuro' : 'Claro'}</span>`;
  });
}

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('sigeru-theme', root.dataset.theme);
    updateThemeButton();
  });
});

document.querySelectorAll('[data-logout]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    sessionStorage.removeItem('sigeruPerfil');
    sessionStorage.removeItem('sigeruAutenticado');
    sessionStorage.removeItem('sigeruNombre');
    sessionStorage.removeItem('sigeruEmail');
    window.location.replace('../landing-page/login.html');
  });
});

updateThemeButton();
