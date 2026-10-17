const API_USUARIOS = 'http://127.0.0.1:8000';

const form = document.getElementById('profileForm');
const message = document.getElementById('profileMessage');

function showProfileMessage(text, error = false) {
    if (!message) return;

    message.textContent = text;
    message.classList.toggle('error', error);
    message.style.display = 'block';
}

// [CAMBIO JWT - Paso 0]: Se eliminó getCsrfToken() y el header 'X-CSRF-TOKEN'
// ya que las peticiones a la API no utilizan CSRF.

async function apiRequest(path, method = 'GET', body = null) {
    const headers = {
        'Accept': 'application/json'
    };

    if (body !== null) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        credentials: 'include',
        headers
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(
        `${API_USUARIOS}${path}`,
        options
    );

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {
            success: false,
            message: 'La API devolvió una respuesta inválida.'
        };
    }

    return {
        response,
        result
    };
}

async function cargarPerfil() {
    try {
        const { response, result } =
            await apiRequest('/api/perfil');

        if (response.status === 401) {
            window.location.href =
                '../landing-page/login.html';
            return;
        }

        if (!response.ok || !result.success) {
            showProfileMessage(
                result.message ||
                    'No se pudo cargar el perfil.',
                true
            );
            return;
        }

        const perfil = result.data;

        if (form.elements.nombre) {
            form.elements.nombre.value =
                perfil.nombre || '';
        }

        if (form.elements.apellido) {
            form.elements.apellido.value =
                perfil.apellido || '';
        }

        if (form.elements.documento) {
            form.elements.documento.value =
                perfil.documento || '';
        }

        if (form.elements.telefono) {
            form.elements.telefono.value =
                perfil.telefono || '';
        }

        if (form.elements.email) {
            form.elements.email.value =
                perfil.email || '';
        }

        if (form.elements.password) {
            form.elements.password.value = '';
        }

        if (form.elements.password_confirm) {
            form.elements.password_confirm.value = '';
        }
    } catch (error) {
        console.error(error);

        showProfileMessage(
            'No se pudo conectar con la API de usuarios.',
            true
        );
    }
}

if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = Object.fromEntries(
            new FormData(form).entries()
        );

        const password =
            String(data.password || '').trim();

        const confirmation =
            String(data.password_confirm || '').trim();

        if (password !== confirmation) {
            showProfileMessage(
                'Las contraseñas no coinciden.',
                true
            );
            return;
        }

        if (password && password.length < 8) {
            showProfileMessage(
                'La nueva contraseña debe tener 8 o más caracteres.',
                true
            );
            return;
        }

        try {
            const { response, result } =
                await apiRequest(
                    '/api/perfil',
                    'PUT',
                    {
                        nombre:
                            String(data.nombre || '').trim(),

                        apellido:
                            String(data.apellido || '').trim(),

                        documento:
                            String(data.documento || '').trim(),

                        telefono:
                            String(data.telefono || '').trim(),

                        email:
                            String(data.email || '')
                                .trim()
                                .toLowerCase(),

                        password:
                            password || null,

                        password_confirm:
                            confirmation || null
                    }
                );

            if (response.status === 401) {
                window.location.href =
                    '../landing-page/login.html';
                return;
            }

            if (!response.ok || !result.success) {
                let errorMessage =
                    result.message ||
                    'No se pudo actualizar el perfil.';

                if (result.errors) {
                    const firstError =
                        Object.values(result.errors)[0];

                    if (Array.isArray(firstError)) {
                        errorMessage = firstError[0];
                    }
                }

                showProfileMessage(
                    errorMessage,
                    true
                );

                return;
            }

            if (form.elements.password) {
                form.elements.password.value = '';
            }

            if (form.elements.password_confirm) {
                form.elements.password_confirm.value = '';
            }

            showProfileMessage(
                'Tus datos se actualizaron correctamente.'
            );

            await cargarPerfil();

        } catch (error) {
            console.error(error);

            showProfileMessage(
                'No se pudo conectar con la API de usuarios.',
                true
            );
        }
    });

    cargarPerfil();
}