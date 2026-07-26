(() => {
  const STORAGE_KEY = 'sigeru-circuitos-estado-v1';

  const CIRCUITS = {
    B: ['B_05', 'B_06', 'B_7'],
    E: ['E_102', 'E_103', 'E_106'],
    CH: ['CH_102', 'CH_109', 'CH_114', 'CH_115'],
    C: ['C_102']
  };

  const DEFAULT_COUNTS = {
    B_05:  { verde: 7, amarillo: 2, rojo: 1 },
    B_06:  { verde: 4, amarillo: 4, rojo: 2 },
    B_7:   { verde: 2, amarillo: 3, rojo: 5 },
    E_102: { verde: 8, amarillo: 2, rojo: 0 },
    E_103: { verde: 5, amarillo: 3, rojo: 2 },
    E_106: { verde: 3, amarillo: 3, rojo: 4 },
    CH_102:{ verde: 6, amarillo: 3, rojo: 1 },
    CH_109:{ verde: 3, amarillo: 5, rojo: 2 },
    CH_114:{ verde: 2, amarillo: 4, rojo: 4 },
    CH_115:{ verde: 7, amarillo: 2, rojo: 1 },
    C_102: { verde: 4, amarillo: 3, rojo: 3 }
  };

  function normalize(counts) {
    const value = {
      verde: Number(counts?.verde || 0),
      amarillo: Number(counts?.amarillo || 0),
      rojo: Number(counts?.rojo || 0)
    };
    const total = value.verde + value.amarillo + value.rojo;
    if (total === 10) return value;
    return null;
  }

  function read() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (_) {}
    const state = {};
    Object.entries(DEFAULT_COUNTS).forEach(([circuit, counts]) => {
      state[circuit] = normalize(saved[circuit]) || { ...counts };
    });
    return state;
  }

  function write(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function levelFromDays(days) {
    const value = Math.max(0, Number(days) || 0);
    if (value <= 2) return 'verde';
    if (value <= 4) return 'amarillo';
    return 'rojo';
  }

  function labelFromDays(days) {
    const value = Math.max(0, Number(days) || 0);
    return `${value} ${value === 1 ? 'día' : 'días'}`;
  }

  function circuitLevel(counts) {
    if (counts.rojo >= 4) return 'rojo';
    if (counts.rojo >= 2 || counts.amarillo >= 4) return 'amarillo';
    return 'verde';
  }

  function summary(circuit) {
    const counts = read()[circuit] || { verde: 0, amarillo: 0, rojo: 0 };
    return {
      circuit,
      total: counts.verde + counts.amarillo + counts.rojo,
      counts,
      level: circuitLevel(counts)
    };
  }

  function updateContainer(circuit, previousDays, nextDays) {
    if (!circuit || !(circuit in DEFAULT_COUNTS)) return;
    const state = read();
    const counts = state[circuit];
    const previous = levelFromDays(previousDays);
    const next = levelFromDays(nextDays);

    if (previous !== next && counts[previous] > 0) {
      counts[previous] -= 1;
      counts[next] += 1;
      write(state);
    }
  }

  function circuits(municipality) {
    return CIRCUITS[municipality] ? [...CIRCUITS[municipality]] : [];
  }

  window.SiGeRUCircuitos = {
    municipalities: () => Object.keys(CIRCUITS),
    circuits,
    summary,
    read,
    levelFromDays,
    labelFromDays,
    updateContainer
  };
})();