/* ==========================================================================
   DELIMITACIÓN Y DATOS DE LOS 8 MUNICIPIOS DE MONTEVIDEO
   Colores suaves para diferenciar los límites administrativos en el mapa.
   ========================================================================== */

const MUNICIPIOS_MONTEVIDEO = [
  {
    id: 'A',
    nombre: 'Municipio A',
    descripcion: 'Paso de la Arena, Nuevo París, Belvedere, Cerro, La Teja',
    color: '#3b82f6',
    coordenadas: [
      [-34.8780, -56.2080],
      [-34.8680, -56.2160],
      [-34.8550, -56.2280],
      [-34.8350, -56.2650],
      [-34.8100, -56.3200],
      [-34.8400, -56.3500],
      [-34.8950, -56.3400],
      [-34.9120, -56.2800],
      [-34.9020, -56.2550],
      [-34.8880, -56.2300]
    ]
  },
  {
    id: 'B',
    nombre: 'Municipio B',
    descripcion: 'Ciudad Vieja, Centro, Barrio Sur, Cordón, Palermo, Parque Rodó',
    color: '#10b981',
    coordenadas: [
      [-34.9080, -56.2140],
      [-34.9030, -56.2160],
      [-34.8980, -56.2080],
      [-34.8920, -56.1960],
      [-34.8910, -56.1820],
      [-34.8930, -56.1680],
      [-34.9050, -56.1640],
      [-34.9180, -56.1650],
      [-34.9160, -56.1850],
      [-34.9100, -56.2050]
    ]
  },
  {
    id: 'C',
    nombre: 'Municipio C',
    descripcion: 'Aguada norte, Reducto, Goes, Prado, Atahualpa, Brazo Oriental',
    color: '#8b5cf6',
    coordenadas: [
      [-34.8920, -56.1960],
      [-34.8780, -56.2080],
      [-34.8620, -56.2050],
      [-34.8550, -56.1960],
      [-34.8580, -56.1750],
      [-34.8690, -56.1650],
      [-34.8800, -56.1600],
      [-34.8930, -56.1680],
      [-34.8910, -56.1820]
    ]
  },
  {
    id: 'CH',
    nombre: 'Municipio CH',
    descripcion: 'Tres Cruces, La Blanqueada, Parque Batlle, Pocitos, Punta Carretas, Buceo',
    color: '#06b6d4',
    coordenadas: [
      [-34.9180, -56.1650],
      [-34.9050, -56.1640],
      [-34.8920, -56.1660],
      [-34.8870, -56.1520],
      [-34.8850, -56.1360],
      [-34.8970, -56.1280],
      [-34.9060, -56.1370],
      [-34.9160, -56.1480],
      [-34.9290, -56.1600],
      [-34.9220, -56.1680]
    ]
  },
  {
    id: 'D',
    nombre: 'Municipio D',
    descripcion: 'Cerrito, Las Acacias, Casavalle, Manga, Piedras Blancas',
    color: '#f59e0b',
    coordenadas: [
      [-34.8690, -56.1650],
      [-34.8480, -56.1800],
      [-34.8250, -56.1850],
      [-34.7800, -56.1700],
      [-34.7400, -56.1400],
      [-34.7700, -56.1150],
      [-34.8200, -56.1250],
      [-34.8450, -56.1450],
      [-34.8650, -56.1550]
    ]
  },
  {
    id: 'E',
    nombre: 'Municipio E',
    descripcion: 'Malvín, Punta Gorda, Carrasco, Carrasco Norte, Unión este',
    color: '#ec4899',
    coordenadas: [
      [-34.8970, -56.1280],
      [-34.8850, -56.1360],
      [-34.8760, -56.1320],
      [-34.8680, -56.0980],
      [-34.8620, -56.0600],
      [-34.8780, -56.0400],
      [-34.8920, -56.0340],
      [-34.8950, -56.0620],
      [-34.8960, -56.0900],
      [-34.8980, -56.1150]
    ]
  },
  {
    id: 'F',
    nombre: 'Municipio F',
    descripcion: 'Maroñas, Flor de Maroñas, Villa García, Bañados de Carrasco',
    color: '#14b8a6',
    coordenadas: [
      [-34.8760, -56.1320],
      [-34.8450, -56.1450],
      [-34.8200, -56.1250],
      [-34.7700, -56.1150],
      [-34.7500, -56.0700],
      [-34.8100, -56.0300],
      [-34.8620, -56.0600],
      [-34.8680, -56.0980],
      [-34.8750, -56.1200]
    ]
  },
  {
    id: 'G',
    nombre: 'Municipio G',
    descripcion: 'Sayago, Peñarol, Colón, Melilla, Lezica, Abayubá',
    color: '#6366f1',
    coordenadas: [
      [-34.8550, -56.1960],
      [-34.8550, -56.2280],
      [-34.8350, -56.2650],
      [-34.8100, -56.3200],
      [-34.7500, -56.2800],
      [-34.7300, -56.2250],
      [-34.7800, -56.1950],
      [-34.8250, -56.1850],
      [-34.8480, -56.1800]
    ]
  }
];

// Función simple para saber si un punto (latitud, longitud) está dentro de un polígono
function puntoEnPoligono(lat, lng, poligono) {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const xi = poligono[i][0];
    const yi = poligono[i][1];
    const xj = poligono[j][0];
    const yj = poligono[j][1];
    const intersecta = ((yi > lng) !== (yj > lng))
      && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersecta) {
      adentro = !adentro;
    }
  }
  return adentro;
}

// Detecta a qué municipio pertenece un punto geográfico
function identificarMunicipioPorPunto(lat, lng) {
  for (const m of MUNICIPIOS_MONTEVIDEO) {
    if (puntoEnPoligono(lat, lng, m.coordenadas)) {
      return m;
    }
  }
  // Si está muy cerca de los bordes o fuera del polígono, usamos la aproximación general
  if (lng < -56.20) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'A');
  if (lat > -34.84 && lng < -56.17) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'G');
  if (lat > -34.86 && lng >= -56.14) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'F');
  if (lat > -34.875 && lng >= -56.175) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'D');
  if (lat > -34.89 && lng < -56.175) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'C');
  if (lng >= -56.125) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'E');
  if (lng >= -56.168) return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'CH');
  return MUNICIPIOS_MONTEVIDEO.find(m => m.id === 'B');
}

// Aseguramos disponibilidad global en el navegador
window.MUNICIPIOS_MONTEVIDEO = MUNICIPIOS_MONTEVIDEO;
window.identificarMunicipioPorPunto = identificarMunicipioPorPunto;
window.puntoEnPoligono = puntoEnPoligono;


