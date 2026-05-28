export interface TreasuryMovement {
  id: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  description: string;
  date: string;
}

const STORAGE_KEY = 'fiambreria_treasury_v2';

export function loadMovements(): TreasuryMovement[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMovements(movements: TreasuryMovement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
}

export function addMovement(movement: Omit<TreasuryMovement, 'id' | 'date'>): TreasuryMovement {
  const movements = loadMovements();
  const newMovement: TreasuryMovement = {
    ...movement,
    id: `T${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    date: new Date().toISOString(),
  };
  movements.unshift(newMovement);
  saveMovements(movements);
  return newMovement;
}

export function deleteMovement(id: string): boolean {
  const movements = loadMovements();
  const filtered = movements.filter((m) => m.id !== id);
  if (filtered.length === movements.length) return false;
  saveMovements(filtered);
  return true;
}