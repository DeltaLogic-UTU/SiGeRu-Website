const API_USUARIOS_PERSONAL = 'http://127.0.0.1:8000';
const API_GESTION_PERSONAL = 'http://127.0.0.1:8001';

const personnelState = {
  current: 'cuadrillas',
  editIndex: null,
  mode: null,
  data: {
    cuadrillas: [],
    choferes: [],
    operarios: [],
    barrenderos: []
  }
};

const personnelHead = document.getElementById('personnelTableHead');
const personnelBody = document.getElementById('personnelTableBody');
const personnelTitle = document.getElementById('personnelTableTitle');
const detailGrid = document.getElementById('personnelDetailGrid');
const membersBox = document.getElementById('personnelMembers');
const personnelEditForm = document.getElementById('personnelEditForm');
const personnelEditFields = document.getElementById('personnelEditFields');
const personnelEditMessage = document.getElementById('personnelEditMessage');
const personnelCreateButton = document.getElementById('personnelCreateButton');
const personnelEditModalKicker = document.getElementById('personnelEditModalKicker');
const personnelEditSubmit = document.getElementById('personnelEditSubmit');

const personnelModalElement = document.getElementById('personnelModal');
const personnelEditModalElement = document.getElementById('personnelEditModal');

const personnelModal = personnelModalElement
  ? bootstrap.Modal.getOrCreateInstance(personnelModalElement)
  : null;

const personnelEditModal = personnelEditModalElement
  ? bootstrap.Modal.getOrCreateInstance(personnelEditModalElement)
  : null;

function escapePersonnel(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]
  );
}

function inputField(
  name,
  label,
  value = '',
  type = 'text',
  required = true
) {
  return `
    <label class="form-label">
      ${escapePersonnel(label)}
      <input
        class="form-control"
        name="${escapePersonnel(name)}"
        type="${escapePersonnel(type)}"
        value="${escapePersonnel(value)}"
        ${required ? 'required' : ''}
      >
    </label>
  `;
}

function selectField(
  name,
  label,
  value,
  options
) {
  return `
    <label class="form-label">
      ${escapePersonnel(label)}
      <select
        class="form-select"
        name="${escapePersonnel(name)}"
        required
      >
        ${options.map(option => `
          <option
            value="${escapePersonnel(option)}"
            ${String(option) === String(value) ? 'selected' : ''}
          >
            ${escapePersonnel(
              option.charAt(0).toUpperCase() + option.slice(1)
            )}
          </option>
        `).join('')}
      </select>
    </label>
  `;
}

function detailField(label, value) {
  return `
    <div class="truck-field">
      <span>${escapePersonnel(label)}</span>
      <strong>${escapePersonnel(value || '—')}</strong>
    </div>
  `;
}

// [CAMBIO JWT - Paso 0]: Se eliminó obtenerCsrfPersonal() y el header 'X-CSRF-TOKEN'
// porque la API de Usuarios ya no utiliza protección CSRF.

async function requestUsuarios(
  path,
  method = 'GET',
  body = null
) {
  const headers = {
    Accept: 'application/json'
  };

  if (body !== null) {
    headers['Content-Type'] =
      'application/json';
  }

  const options = {
    method,
    credentials: 'include',
    headers
  };

  if (body !== null) {
    options.body =
      JSON.stringify(body);
  }

  const response = await fetch(
    `${API_USUARIOS_PERSONAL}${path}`,
    options
  );

  let result = {};

  try {
    result =
      await response.json();
  } catch {
    result = {
      success: false,
      message:
        'La API devolvió una respuesta inválida.'
    };
  }

  return {
    response,
    result
  };
}

async function cargarUsuarios() {
  const { response, result } =
    await requestUsuarios(
      '/api/usuarios'
    );

  if (response.status === 401) {
    window.location.replace(
      '../landing-page/login.html'
    );

    return null;
  }

  if (response.status === 403) {
    throw new Error(
      'No tenés permisos para ver el personal.'
    );
  }

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
      'No se pudo cargar el personal.'
    );
  }

  return result.data || [];
}

async function cargarCuadrillas() {
  const response = await fetch(
    `${API_GESTION_PERSONAL}/api/cuadrillas`,
    {
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      'No se pudieron cargar los responsables.'
    );
  }

  const result =
    await response.json();

  return Array.isArray(result)
    ? result
    : result.data || [];
}

function convertirUsuario(usuario) {
  return {
    id_usuario:
      usuario.id_usuario,

    nombre:
      usuario.nombre || '',

    apellido:
      usuario.apellido || '',

    documento:
      usuario.documento || '',

    telefono:
      usuario.telefono || '',

    email:
      usuario.email || '',

    rol:
      String(
        usuario.rol || ''
      ).toLowerCase(),

    estado:
      usuario.estado || 'activo',

    licencia:
      usuario.licencia || '',

    responsableDe: []
  };
}

function organizarPersonal(
  usuarios,
  cuadrillas
) {
  const responsables =
    new Map();

  cuadrillas.forEach(
    cuadrilla => {
      const idUsuario =
        Number(
          cuadrilla.id_responsable
        );

      if (!idUsuario) {
        return;
      }

      if (
        !responsables.has(
          idUsuario
        )
      ) {
        responsables.set(
          idUsuario,
          []
        );
      }

      responsables
        .get(idUsuario)
        .push(
          cuadrilla.id_cuadrilla
        );
    }
  );

  const personal =
    usuarios.map(
      usuario => {
        const item =
          convertirUsuario(
            usuario
          );

        item.responsableDe =
          responsables.get(
            Number(
              item.id_usuario
            )
          ) || [];

        return item;
      }
    );

  const esResponsable =
    usuario =>
      usuario.responsableDe.length > 0;

  personnelState.data = {
    cuadrillas:
      personal.filter(
        usuario =>
          usuario.rol === 'cuadrilla' ||
          esResponsable(usuario)
      ),

    choferes:
      personal.filter(
        usuario =>
          usuario.rol === 'chofer' &&
          !esResponsable(usuario)
      ),

    operarios:
      personal.filter(
        usuario =>
          usuario.rol === 'operario' &&
          !esResponsable(usuario)
      ),

    barrenderos:
      personal.filter(
        usuario =>
          usuario.rol === 'barrendero' &&
          !esResponsable(usuario)
      )
  };
}

async function loadPersonnel() {
  try {
    const usuarios =
      await cargarUsuarios();

    if (!usuarios) {
      return;
    }

    const cuadrillas =
      await cargarCuadrillas();

    organizarPersonal(
      usuarios,
      cuadrillas
    );

    renderPersonnel();
  } catch (error) {
    personnelBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="text-center py-4"
        >
          ${escapePersonnel(
            error.message
          )}
        </td>
      </tr>
    `;
  }
}

function botonesUsuario(
  item,
  index,
  mostrarBaja = true
) {
  const baja =
    mostrarBaja &&
    item.estado !== 'inactivo'
      ? `
        <button
          class="btn btn-outline btn-sm"
          data-personnel-delete="${index}"
          type="button"
          aria-label="Dar de baja"
        >
          <i class="bi bi-trash"></i>
        </button>
      `
      : '';

  return `
    <div class="d-flex gap-2">
      <button
        class="btn btn-outline btn-sm"
        data-personnel-index="${index}"
        type="button"
        aria-label="Ver"
      >
        <i class="bi bi-search"></i>
      </button>

      <button
        class="btn btn-outline btn-sm"
        data-personnel-edit="${index}"
        type="button"
        aria-label="Editar"
      >
        <i class="bi bi-pencil"></i>
      </button>

      ${baja}
    </div>
  `;
}

function renderPersonnel() {
  const type =
    personnelState.current;

  const rows =
    personnelState.data[type] ||
    [];

  const nombres = {
    cuadrillas: 'Cuadrillas',
    choferes: 'Choferes',
    operarios: 'Operarios',
    barrenderos: 'Barrenderos'
  };

  personnelTitle.textContent =
    nombres[type] ||
    'Personal';

  if (type === 'cuadrillas') {
    personnelHead.innerHTML = `
      <tr>
        <th>Nombre</th>
        <th>Documento</th>
        <th>Estado</th>
        <th>Responsable de</th>
        <th>Correo</th>
        <th>Acciones</th>
      </tr>
    `;

    personnelBody.innerHTML =
      rows.length
        ? rows.map(
            (item, index) => `
              <tr>
                <td>
                  <strong>
                    ${escapePersonnel(
                      item.nombre
                    )}
                    ${escapePersonnel(
                      item.apellido
                    )}
                  </strong>
                </td>

                <td>
                  ${escapePersonnel(
                    item.documento ||
                    '—'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.estado ||
                    '—'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.responsableDe.length
                      ? item.responsableDe.join(
                          ' / '
                        )
                      : '—'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.email ||
                    '—'
                  )}
                </td>

                <td>
                  ${botonesUsuario(
                    item,
                    index,
                    false
                  )}
                </td>
              </tr>
            `
          ).join('')
        : `
          <tr>
            <td
              colspan="6"
              class="text-center py-4"
            >
              No hay personal de cuadrilla.
            </td>
          </tr>
        `;

    return;
  }

  if (type === 'choferes') {
    personnelHead.innerHTML = `
      <tr>
        <th>Nombre</th>
        <th>Documento</th>
        <th>Estado</th>
        <th>Licencia</th>
        <th>Correo</th>
        <th>Acciones</th>
      </tr>
    `;

    personnelBody.innerHTML =
      rows.length
        ? rows.map(
            (item, index) => `
              <tr>
                <td>
                  <strong>
                    ${escapePersonnel(
                      item.nombre
                    )}
                    ${escapePersonnel(
                      item.apellido
                    )}
                  </strong>
                </td>

                <td>
                  ${escapePersonnel(
                    item.documento ||
                    '—'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.estado ||
                    '—'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.licencia ||
                    'Sin registrar'
                  )}
                </td>

                <td>
                  ${escapePersonnel(
                    item.email ||
                    '—'
                  )}
                </td>

                <td>
                  ${botonesUsuario(
                    item,
                    index
                  )}
                </td>
              </tr>
            `
          ).join('')
        : `
          <tr>
            <td
              colspan="6"
              class="text-center py-4"
            >
              No hay choferes registrados.
            </td>
          </tr>
        `;

    return;
  }

  personnelHead.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Documento</th>
      <th>Estado</th>
      <th>Correo</th>
      <th>Acciones</th>
    </tr>
  `;

  personnelBody.innerHTML =
    rows.length
      ? rows.map(
          (item, index) => `
            <tr>
              <td>
                <strong>
                  ${escapePersonnel(
                    item.nombre
                  )}
                  ${escapePersonnel(
                    item.apellido
                  )}
                </strong>
              </td>

              <td>
                ${escapePersonnel(
                  item.documento ||
                  '—'
                )}
              </td>

              <td>
                ${escapePersonnel(
                  item.estado ||
                  '—'
                )}
              </td>

              <td>
                ${escapePersonnel(
                  item.email ||
                  '—'
                )}
              </td>

              <td>
                ${botonesUsuario(
                  item,
                  index
                )}
              </td>
            </tr>
          `
        ).join('')
      : `
        <tr>
          <td
            colspan="5"
            class="text-center py-4"
          >
            No hay registros.
          </td>
        </tr>
      `;
}

function openPersonnel(index) {
  const item =
    personnelState.data[
      personnelState.current
    ]?.[
      Number(index)
    ];

  if (!item) {
    return;
  }

  const esResponsable =
    item.responsableDe.length > 0;

  document.getElementById(
    'personnelModalKicker'
  ).textContent =
    esResponsable
      ? 'Responsable de cuadrilla'
      : item.rol;

  document.getElementById(
    'personnelModalTitle'
  ).textContent =
    `${item.nombre} ${item.apellido}`;

  const fields = [
    detailField(
      'Documento',
      item.documento
    ),

    detailField(
      'Teléfono',
      item.telefono
    ),

    detailField(
      'Correo',
      item.email
    ),

    detailField(
      'Rol',
      item.rol
    ),

    detailField(
      'Estado',
      item.estado
    )
  ];

  if (
    item.rol === 'chofer'
  ) {
    fields.push(
      detailField(
        'Licencia',
        item.licencia
      )
    );
  }

  if (esResponsable) {
    fields.push(
      detailField(
        'Responsable de',
        item.responsableDe.join(
          ' / '
        )
      )
    );
  }

  detailGrid.innerHTML =
    fields.join('');

  if (membersBox) {
    membersBox.classList.add(
      'd-none'
    );

    membersBox.innerHTML = '';
  }

  personnelModal?.show();
}

function openPersonnelEdit(index) {
  const item =
    personnelState.data[
      personnelState.current
    ]?.[
      Number(index)
    ];

  if (!item) {
    return;
  }

  personnelState.mode =
    'edit';

  personnelState.editIndex =
    Number(index);

  personnelEditModalKicker.textContent =
    'Edición de personal';

  document.getElementById(
    'personnelEditModalTitle'
  ).textContent =
    `Editar ${item.nombre} ${item.apellido}`;

  personnelEditSubmit.textContent =
    'Guardar cambios';

  const fields = [
    inputField(
      'nombre',
      'Nombre',
      item.nombre
    ),

    inputField(
      'apellido',
      'Apellido',
      item.apellido
    ),

    inputField(
      'documento',
      'Documento',
      item.documento
    ),

    inputField(
      'telefono',
      'Teléfono',
      item.telefono
    ),

    inputField(
      'email',
      'Correo',
      item.email,
      'email'
    ),

    selectField(
      'estado',
      'Estado',
      item.estado ||
      'activo',
      [
        'activo',
        'inactivo'
      ]
    )
  ];

  if (
    item.rol === 'chofer'
  ) {
    fields.push(
      inputField(
        'licencia',
        'Licencia',
        item.licencia
      )
    );
  }

  personnelEditFields.innerHTML =
    fields.join('');

  personnelEditMessage.textContent =
    '';

  personnelEditModal?.show();
}

function openPersonnelCreate() {
  personnelState.mode =
    'create';

  personnelState.editIndex =
    null;

  const rolInicial = {
    cuadrillas: 'cuadrilla',
    choferes: 'chofer',
    operarios: 'operario',
    barrenderos: 'barrendero'
  }[
    personnelState.current
  ];

  personnelEditModalKicker.textContent =
    'Nuevo personal';

  document.getElementById(
    'personnelEditModalTitle'
  ).textContent =
    'Crear usuario';

  personnelEditSubmit.textContent =
    'Crear usuario';

  personnelEditFields.innerHTML = `
    ${inputField(
      'nombre',
      'Nombre'
    )}

    ${inputField(
      'apellido',
      'Apellido'
    )}

    ${inputField(
      'documento',
      'Documento'
    )}

    ${inputField(
      'telefono',
      'Teléfono'
    )}

    ${inputField(
      'email',
      'Correo',
      '',
      'email'
    )}

    ${selectField(
      'rol',
      'Rol',
      rolInicial,
      [
        'cuadrilla',
        'chofer',
        'operario',
        'barrendero'
      ]
    )}

    <div
      data-personnel-license
      class="d-none"
    >
      ${inputField(
        'licencia',
        'Licencia',
        '',
        'text',
        false
      )}
    </div>

    ${inputField(
      'password',
      'Contraseña',
      '',
      'password'
    )}

    ${inputField(
      'password_confirm',
      'Confirmar contraseña',
      '',
      'password'
    )}
  `;

  const rol =
    personnelEditForm.querySelector(
      '[name="rol"]'
    );

  const licenseBox =
    personnelEditForm.querySelector(
      '[data-personnel-license]'
    );

  const licencia =
    personnelEditForm.querySelector(
      '[name="licencia"]'
    );

  function actualizarLicencia() {
    const esChofer =
      rol.value ===
      'chofer';

    licenseBox.classList.toggle(
      'd-none',
      !esChofer
    );

    licencia.required =
      esChofer;

    if (!esChofer) {
      licencia.value =
        '';
    }
  }

  rol.addEventListener(
    'change',
    actualizarLicencia
  );

  actualizarLicencia();

  personnelEditMessage.textContent =
    '';

  personnelEditModal?.show();
}

function obtenerPrimerError(
  result,
  fallback
) {
  if (
    result.errors
  ) {
    const error =
      Object.values(
        result.errors
      )[0];

    if (
      Array.isArray(
        error
      )
    ) {
      return error[0];
    }
  }

  return (
    result.message ||
    fallback
  );
}

async function crearUsuario() {
  const data =
    Object.fromEntries(
      new FormData(
        personnelEditForm
      ).entries()
    );

  if (
    data.password !==
    data.password_confirm
  ) {
    personnelEditMessage.textContent =
      'Las contraseñas no coinciden.';

    return;
  }

  personnelEditMessage.textContent =
    'Creando usuario...';

  try {
    const {
      response,
      result
    } =
      await requestUsuarios(
        '/api/usuarios',
        'POST',
        {
          nombre:
            String(
              data.nombre ||
              ''
            ).trim(),

          apellido:
            String(
              data.apellido ||
              ''
            ).trim(),

          documento:
            String(
              data.documento ||
              ''
            ).trim(),

          telefono:
            String(
              data.telefono ||
              ''
            ).trim(),

          email:
            String(
              data.email ||
              ''
            )
              .trim()
              .toLowerCase(),

          rol:
            String(
              data.rol ||
              ''
            ).toLowerCase(),

          licencia:
            data.rol ===
            'chofer'
              ? String(
                  data.licencia ||
                  ''
                ).trim()
              : null,

          password:
            data.password,

          password_confirm:
            data.password_confirm
        }
      );

    if (
      response.status ===
      401
    ) {
      window.location.replace(
        '../landing-page/login.html'
      );

      return;
    }

    if (
      !response.ok ||
      !result.success
    ) {
      personnelEditMessage.textContent =
        obtenerPrimerError(
          result,
          'No se pudo crear el usuario.'
        );

      return;
    }

    personnelState.current = {
      cuadrilla:
        'cuadrillas',

      chofer:
        'choferes',

      operario:
        'operarios',

      barrendero:
        'barrenderos'
    }[
      data.rol
    ];

    actualizarTabs();

    await loadPersonnel();

    personnelEditModal?.hide();
  } catch {
    personnelEditMessage.textContent =
      'No se pudo conectar con la API.';
  }
}

async function actualizarUsuario() {
  const item =
    personnelState.data[
      personnelState.current
    ]?.[
      personnelState.editIndex
    ];

  if (!item) {
    return;
  }

  const data =
    Object.fromEntries(
      new FormData(
        personnelEditForm
      ).entries()
    );

  personnelEditMessage.textContent =
    'Guardando cambios...';

  try {
    const {
      response,
      result
    } =
      await requestUsuarios(
        `/api/usuarios/${item.id_usuario}`,
        'PUT',
        {
          nombre:
            String(
              data.nombre ||
              ''
            ).trim(),

          apellido:
            String(
              data.apellido ||
              ''
            ).trim(),

          documento:
            String(
              data.documento ||
              ''
            ).trim(),

          telefono:
            String(
              data.telefono ||
              ''
            ).trim(),

          email:
            String(
              data.email ||
              ''
            )
              .trim()
              .toLowerCase(),

          estado:
            data.estado,

          licencia:
            item.rol ===
            'chofer'
              ? String(
                  data.licencia ||
                  ''
                ).trim()
              : null
        }
      );

    if (
      response.status ===
      401
    ) {
      window.location.replace(
        '../landing-page/login.html'
      );

      return;
    }

    if (
      !response.ok ||
      !result.success
    ) {
      personnelEditMessage.textContent =
        obtenerPrimerError(
          result,
          'No se pudo actualizar el usuario.'
        );

      return;
    }

    await loadPersonnel();

    personnelEditModal?.hide();
  } catch {
    personnelEditMessage.textContent =
      'No se pudo conectar con la API.';
  }
}

async function darDeBajaUsuario(
  index
) {
  if (
    personnelState.current ===
    'cuadrillas'
  ) {
    return;
  }

  const item =
    personnelState.data[
      personnelState.current
    ]?.[
      Number(index)
    ];

  if (
    !item ||
    !item.id_usuario
  ) {
    return;
  }

  const confirmar =
    window.confirm(
      `¿Dar de baja a ${item.nombre} ${item.apellido}?`
    );

  if (!confirmar) {
    return;
  }

  try {
    const {
      response,
      result
    } =
      await requestUsuarios(
        `/api/usuarios/${item.id_usuario}`,
        'DELETE'
      );

    if (
      response.status ===
      401
    ) {
      window.location.replace(
        '../landing-page/login.html'
      );

      return;
    }

    if (
      !response.ok ||
      !result.success
    ) {
      window.alert(
        result.message ||
        'No se pudo dar de baja al usuario.'
      );

      return;
    }

    await loadPersonnel();
  } catch {
    window.alert(
      'No se pudo conectar con la API.'
    );
  }
}

function actualizarTabs() {
  document
    .querySelectorAll(
      '[data-personnel-tab]'
    )
    .forEach(
      button => {
        const activo =
          button.dataset
            .personnelTab ===
          personnelState.current;

        button.classList.toggle(
          'btn-primary',
          activo
        );

        button.classList.toggle(
          'btn-outline',
          !activo
        );

        button.classList.toggle(
          'active',
          activo
        );
      }
    );
}

document
  .querySelectorAll(
    '[data-personnel-tab]'
  )
  .forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          personnelState.current =
            button.dataset
              .personnelTab;

          actualizarTabs();

          renderPersonnel();
        }
      );
    }
  );

personnelBody?.addEventListener(
  'click',
  event => {
    const viewButton =
      event.target.closest(
        '[data-personnel-index]'
      );

    if (viewButton) {
      openPersonnel(
        viewButton.dataset
          .personnelIndex
      );

      return;
    }

    const editButton =
      event.target.closest(
        '[data-personnel-edit]'
      );

    if (editButton) {
      openPersonnelEdit(
        editButton.dataset
          .personnelEdit
      );

      return;
    }

    const deleteButton =
      event.target.closest(
        '[data-personnel-delete]'
      );

    if (deleteButton) {
      darDeBajaUsuario(
        deleteButton.dataset
          .personnelDelete
      );
    }
  }
);

personnelCreateButton?.addEventListener(
  'click',
  openPersonnelCreate
);

personnelEditForm?.addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (
      personnelState.mode ===
      'create'
    ) {
      await crearUsuario();

      return;
    }

    if (
      personnelState.mode ===
      'edit'
    ) {
      await actualizarUsuario();
    }
  }
);

actualizarTabs();
loadPersonnel();