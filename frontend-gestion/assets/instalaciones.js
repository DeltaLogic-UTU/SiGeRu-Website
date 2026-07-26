const facilities = [
  {id_instalacion:1,nombre:'Estación BUCEO',tipo:'Depósito',estado:'Operativo',calle:'Av. Gral. Rivera',esquina_1:'Managripé',esquina_2:'Vanguardia',capacidad_actual:'Casi lleno'},
  {id_instalacion:2,nombre:'Cantón 2',tipo:'Depósito',estado:'No operativo',calle:'Dr. Carlos María de Pena',esquina_1:'Cnel. Arana',esquina_2:'Filadelfia',capacidad_actual:'Lleno'},
  {id_instalacion:3,nombre:'Usina 3',tipo:'Depósito',estado:'Operativo',calle:'Camino Corrales',esquina_1:'Pavón',esquina_2:'Añagualpo',capacidad_actual:'Disponible'},
  {id_instalacion:4,nombre:'Géminis',tipo:'Centro de acopio',estado:'Operativo',calle:'Géminis',esquina_1:'Pilar',esquina_2:'Senda',capacidad_actual:'Casi lleno'},
  {id_instalacion:5,nombre:'Durán',tipo:'Centro de acopio',estado:'No operativo',calle:'José Durán',esquina_1:'Antonio Taddei',esquina_2:'Durán Pasaje A',capacidad_actual:'Lleno'},
  {id_instalacion:6,nombre:'Tróccoli',tipo:'Centro de acopio',estado:'Operativo',calle:'La Paloma',esquina_1:'Tróccoli',esquina_2:'Joaquín Martorí',capacidad_actual:'Disponible'},
  {id_instalacion:7,nombre:'Felipe Cardoso',tipo:'Vertedero',estado:'Operativo',calle:'Felipe Cardoso',esquina_1:'Cepeda',esquina_2:'Punta Rieles',capacidad_actual:'Disponible'}
];

const inventory = [
  {id_inventario:1,id_instalacion:1,nombre_item:'Escoba',estado:'Excelente',tipo:'Limpieza',cantidad:52},
  {id_inventario:2,id_instalacion:1,nombre_item:'Pala',estado:'Carencia',tipo:'Limpieza',cantidad:27},
  {id_inventario:3,id_instalacion:1,nombre_item:'Llave inglesa',estado:'Óptimo',tipo:'Mantenimiento',cantidad:11},
  {id_inventario:4,id_instalacion:1,nombre_item:'Carro de barrendero',estado:'Disponible',tipo:'Equipamiento',cantidad:18},
  {id_inventario:5,id_instalacion:1,nombre_item:'Escobillón de calle',estado:'Disponible',tipo:'Limpieza',cantidad:35},
  {id_inventario:6,id_instalacion:1,nombre_item:'Cepillo de cordón',estado:'Disponible',tipo:'Limpieza',cantidad:34},
  {id_inventario:7,id_instalacion:1,nombre_item:'Recogedor industrial',estado:'Disponible',tipo:'Limpieza',cantidad:22},
  {id_inventario:8,id_instalacion:1,nombre_item:'Pinza recolectora',estado:'Disponible',tipo:'Limpieza',cantidad:16},
  {id_inventario:9,id_instalacion:1,nombre_item:'Rastrillo metálico',estado:'Disponible',tipo:'Limpieza',cantidad:15},
  {id_inventario:10,id_instalacion:1,nombre_item:'Chaleco reflectivo',estado:'Disponible',tipo:'Seguridad',cantidad:48},
  {id_inventario:11,id_instalacion:1,nombre_item:'Guantes de protección',estado:'Disponible',tipo:'Seguridad',cantidad:96},
  {id_inventario:12,id_instalacion:1,nombre_item:'Conos de señalización',estado:'Disponible',tipo:'Seguridad',cantidad:30},
  {id_inventario:13,id_instalacion:1,nombre_item:'Bolsas reforzadas',estado:'Disponible',tipo:'Insumo',cantidad:240},
  {id_inventario:14,id_instalacion:2,nombre_item:'Escoba',estado:'Carencia',tipo:'Limpieza',cantidad:4},
  {id_inventario:15,id_instalacion:2,nombre_item:'Pala',estado:'Disponible',tipo:'Limpieza',cantidad:9},
  {id_inventario:16,id_instalacion:3,nombre_item:'Carro de barrendero',estado:'Disponible',tipo:'Equipamiento',cantidad:8},
  {id_inventario:17,id_instalacion:3,nombre_item:'Chaleco reflectivo',estado:'Disponible',tipo:'Seguridad',cantidad:21}
];

const state = {
  tab:'depositos',
  selectedId:1
};

const facilityBody = document.getElementById('facilityBody');
const inventoryBody = document.getElementById('inventoryBody');
const inventoryPanel = document.getElementById('inventoryPanel');
const facilityStatus = document.getElementById('facilityStatus');
const facilityModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('facilityModal'));
const itemModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal'));

const facilityForm = document.getElementById('facilityForm');
const itemForm = document.getElementById('itemForm');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[character]);
}

function currentFacilities() {
  return facilities.filter((item) =>
    state.tab === 'depositos'
      ? item.tipo === 'Depósito'
      : item.tipo !== 'Depósito'
  );
}

function renderFacilities() {
  const rows = currentFacilities();
  document.getElementById('facilityTitle').textContent =
    state.tab === 'depositos' ? 'Depósitos' : 'Instalaciones';

  facilityBody.innerHTML = rows.map((item) => `
    <tr class="${state.selectedId === item.id_instalacion ? 'table-active' : ''}" data-facility-select="${item.id_instalacion}">
      <td><strong>${escapeHtml(item.nombre)}</strong></td>
      <td>${escapeHtml(item.tipo)}</td>
      <td>${escapeHtml(item.estado)}</td>
      <td>${escapeHtml(item.calle)}</td>
      <td>${escapeHtml(item.esquina_1)}</td>
      <td>${escapeHtml(item.esquina_2)}</td>
      <td>${escapeHtml(item.capacidad_actual)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" data-facility-edit="${item.id_instalacion}" type="button" aria-label="Editar instalación">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline btn-sm" data-facility-delete="${item.id_instalacion}" type="button" aria-label="Eliminar instalación">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function renderInventory() {
  const facility = facilities.find((item) => item.id_instalacion === state.selectedId);
  if (!facility || facility.tipo !== 'Depósito') {
    inventoryPanel.classList.add('d-none');
    return;
  }

  inventoryPanel.classList.remove('d-none');
  document.getElementById('inventoryTitle').textContent = `Inventario ${facility.nombre}`;

  const rows = inventory.filter((item) => item.id_instalacion === facility.id_instalacion);
  inventoryBody.innerHTML = rows.length
    ? rows.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.nombre_item)}</strong></td>
        <td>${escapeHtml(item.estado)}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${item.cantidad}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-outline btn-sm" data-item-edit="${item.id_inventario}" type="button" aria-label="Editar artículo">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline btn-sm" data-item-delete="${item.id_inventario}" type="button" aria-label="Eliminar artículo">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="text-center py-4">No hay artículos registrados.</td></tr>';
}

function fillFacility(item = {}) {
  facilityForm.reset();
  document.getElementById('facilityId').value = item.id_instalacion || '';
  document.getElementById('facilityName').value = item.nombre || '';
  document.getElementById('facilityType').value =
    item.tipo === 'Depósito' ? 'depósito' :
    item.tipo === 'Vertedero' ? 'vertedero' : 'centro de acopio';
  document.getElementById('facilityState').value =
    item.estado === 'No operativo' ? 'no operativo' : 'operativo';
  document.getElementById('facilityStreet').value = item.calle || '';
  document.getElementById('facilityCorner1').value = item.esquina_1 || '';
  document.getElementById('facilityCorner2').value = item.esquina_2 || '';
  document.getElementById('facilityCapacityStatus').value = item.capacidad_actual || 'Disponible';
  document.getElementById('facilityModalTitle').textContent =
    item.id_instalacion ? 'Editar instalación' : 'Nueva instalación';
}

function saveFacility(event) {
  event.preventDefault();

  const id = Number(document.getElementById('facilityId').value || 0);
  const typeValue = document.getElementById('facilityType').value;
  const stateValue = document.getElementById('facilityState').value;

  const item = {
    id_instalacion: id || Math.max(0, ...facilities.map((row) => row.id_instalacion)) + 1,
    nombre: document.getElementById('facilityName').value.trim(),
    tipo: typeValue === 'depósito' ? 'Depósito' : typeValue === 'vertedero' ? 'Vertedero' : 'Centro de acopio',
    estado: stateValue === 'no operativo' ? 'No operativo' : 'Operativo',
    calle: document.getElementById('facilityStreet').value.trim(),
    esquina_1: document.getElementById('facilityCorner1').value.trim(),
    esquina_2: document.getElementById('facilityCorner2').value.trim(),
    capacidad_actual: document.getElementById('facilityCapacityStatus').value
  };

  if (id) {
    const index = facilities.findIndex((row) => row.id_instalacion === id);
    if (index >= 0) facilities[index] = item;
  } else {
    facilities.push(item);
  }

  state.selectedId = item.id_instalacion;
  facilityModal.hide();
  renderFacilities();
  renderInventory();
}

function fillItem(item = {}) {
  itemForm.reset();
  document.getElementById('itemId').value = item.id_inventario || '';
  document.getElementById('itemName').value = item.nombre_item || '';
  document.getElementById('itemType').value = item.tipo || 'Limpieza';
  document.getElementById('itemState').value = item.estado || 'Disponible';
  document.getElementById('itemQuantity').value = item.cantidad ?? '';
  document.getElementById('itemModalTitle').textContent =
    item.id_inventario ? 'Editar artículo' : 'Agregar artículo';
}

function saveItem(event) {
  event.preventDefault();
  if (!state.selectedId) return;

  const id = Number(document.getElementById('itemId').value || 0);
  const item = {
    id_inventario: id || Math.max(0, ...inventory.map((row) => row.id_inventario)) + 1,
    id_instalacion: state.selectedId,
    nombre_item: document.getElementById('itemName').value.trim(),
    tipo: document.getElementById('itemType').value,
    estado: document.getElementById('itemState').value,
    cantidad: Number(document.getElementById('itemQuantity').value)
  };

  if (id) {
    const index = inventory.findIndex((row) => row.id_inventario === id);
    if (index >= 0) inventory[index] = item;
  } else {
    inventory.push(item);
  }

  itemModal.hide();
  renderInventory();
}

function deleteFacility(id) {
  const index = facilities.findIndex((item) => item.id_instalacion === id);
  if (index < 0 || !confirm('¿Eliminar la instalación?')) return;

  facilities.splice(index, 1);
  for (let i = inventory.length - 1; i >= 0; i -= 1) {
    if (inventory[i].id_instalacion === id) inventory.splice(i, 1);
  }

  const visible = currentFacilities();
  state.selectedId = visible[0]?.id_instalacion || null;
  renderFacilities();
  renderInventory();
}

function deleteItem(id) {
  const index = inventory.findIndex((item) => item.id_inventario === id);
  if (index < 0 || !confirm('¿Eliminar el artículo?')) return;
  inventory.splice(index, 1);
  renderInventory();
}

document.querySelectorAll('[data-facility-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    state.tab = button.dataset.facilityTab;
    document.querySelectorAll('[data-facility-tab]').forEach((item) => {
      item.classList.toggle('btn-primary', item === button);
      item.classList.toggle('btn-outline', item !== button);
      item.classList.toggle('active', item === button);
    });

    const visible = currentFacilities();
    state.selectedId = state.tab === 'depositos' ? visible[0]?.id_instalacion || null : null;
    renderFacilities();
    renderInventory();
  });
});

document.addEventListener('click', (event) => {
  const selectedRow = event.target.closest('[data-facility-select]');
  const actionButton = event.target.closest('button,a,input,select,textarea,label,[role="button"]');

  if (selectedRow && !actionButton && state.tab === 'depositos') {
    state.selectedId = Number(selectedRow.dataset.facilitySelect);
    renderFacilities();
    renderInventory();
  }

  const editButton = event.target.closest('[data-facility-edit]');
  if (editButton) {
    const item = facilities.find((row) => row.id_instalacion === Number(editButton.dataset.facilityEdit));
    fillFacility(item);
    facilityModal.show();
  }

  const deleteButton = event.target.closest('[data-facility-delete]');
  if (deleteButton) deleteFacility(Number(deleteButton.dataset.facilityDelete));

  const editItemButton = event.target.closest('[data-item-edit]');
  if (editItemButton) {
    const item = inventory.find((row) => row.id_inventario === Number(editItemButton.dataset.itemEdit));
    fillItem(item);
    itemModal.show();
  }

  const deleteItemButton = event.target.closest('[data-item-delete]');
  if (deleteItemButton) deleteItem(Number(deleteItemButton.dataset.itemDelete));
});

document.querySelector('[data-facility-new]')?.addEventListener('click', () => {
  fillFacility();
  facilityModal.show();
});

document.querySelector('[data-item-new]')?.addEventListener('click', () => {
  fillItem();
  itemModal.show();
});

facilityForm.addEventListener('submit', saveFacility);
itemForm.addEventListener('submit', saveItem);

renderFacilities();
renderInventory();
