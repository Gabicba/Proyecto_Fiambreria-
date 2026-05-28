export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'card';
  paymentMethod: string;
  methodKey: string;
  currentBalance: number;
  color: string;
  active: boolean;
  createdAt: string;
}

export interface AccountMovement {
  id: string;
  accountId: string;
  accountName: string;
  type: 'in' | 'out' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  relatedAccountId?: string;
  relatedAccountName?: string;
  date: string;
  createdAt: string;
}

const ACCOUNTS_KEY = 'fiambreria_accounts_v2';
const ACCOUNT_MOVEMENTS_KEY = 'fiambreria_account_movements_v1';

const defaultAccounts: Account[] = [
  { id: 'ACC-CASH', name: 'Caja Efectivo', type: 'cash', paymentMethod: 'Efectivo', methodKey: 'cash', currentBalance: 0, color: '#10B981', active: true, createdAt: new Date().toISOString() },
  { id: 'ACC-BANK', name: 'Cuenta Bancaria', type: 'bank', paymentMethod: 'Transferencia', methodKey: 'transfer', currentBalance: 0, color: '#3B82F6', active: true, createdAt: new Date().toISOString() },
  { id: 'ACC-DEBIT', name: 'Tarjeta de Débito', type: 'card', paymentMethod: 'Débito', methodKey: 'debit', currentBalance: 0, color: '#6366F1', active: true, createdAt: new Date().toISOString() },
  { id: 'ACC-CREDIT', name: 'Tarjeta de Crédito', type: 'card', paymentMethod: 'Crédito', methodKey: 'credit', currentBalance: 0, color: '#8B5CF6', active: true, createdAt: new Date().toISOString() },
  { id: 'ACC-MP', name: 'Mercado Pago', type: 'digital', paymentMethod: 'Mercado Pago', methodKey: 'mercado-pago', currentBalance: 0, color: '#00A3E0', active: true, createdAt: new Date().toISOString() },
  { id: 'ACC-CHEQUE', name: 'Cheques', type: 'bank', paymentMethod: 'Cheque', methodKey: 'cheque', currentBalance: 0, color: '#F59E0B', active: true, createdAt: new Date().toISOString() },
];

function generateId(): string {
  return `ACC-${Date.now().toString(36).toUpperCase()}`;
}

function generateMovementId(): string {
  return `AM-${Date.now().toString(36).toUpperCase()}`;
}

function loadAccountsData(): Account[] {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return [...defaultAccounts];
}

function saveAccountsData(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function loadAccountMovements(): AccountMovement[] {
  try {
    const data = localStorage.getItem(ACCOUNT_MOVEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAccountMovements(movements: AccountMovement[]) {
  localStorage.setItem(ACCOUNT_MOVEMENTS_KEY, JSON.stringify(movements));
}

// Recalculate balances from movements
export function recalculateBalances(): Account[] {
  const accounts = loadAccountsData();
  const movements = loadAccountMovements();

  const updated = accounts.map((acc) => {
    const accMovements = movements.filter((m) => m.accountId === acc.id);
    const balance = accMovements.reduce((sum, m) => {
      if (m.type === 'in' || m.type === 'transfer_in') return sum + m.amount;
      if (m.type === 'out' || m.type === 'transfer_out') return sum - m.amount;
      return sum;
    }, 0);
    return { ...acc, currentBalance: balance };
  });

  saveAccountsData(updated);
  return updated;
}

// Public API
export function loadAccounts(): Account[] {
  return recalculateBalances();
}

export function getActiveAccounts(): Account[] {
  return loadAccounts().filter((a) => a.active);
}

export function addAccount(data: Omit<Account, 'id' | 'createdAt' | 'currentBalance'>): Account {
  const accounts = loadAccountsData();
  const newAccount: Account = {
    ...data,
    id: generateId(),
    currentBalance: 0,
    createdAt: new Date().toISOString(),
  };
  accounts.push(newAccount);
  saveAccountsData(accounts);
  return newAccount;
}

export function updateAccount(id: string, data: Partial<Omit<Account, 'id' | 'createdAt'>>): Account | null {
  const accounts = loadAccountsData();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], ...data };
  saveAccountsData(accounts);
  return accounts[idx];
}

export function deleteAccount(id: string): boolean {
  const accounts = loadAccountsData();
  const filtered = accounts.filter((a) => a.id !== id);
  if (filtered.length === accounts.length) return false;
  saveAccountsData(filtered);
  return true;
}

// Add movement to an account
export function addAccountMovement(data: Omit<AccountMovement, 'id' | 'createdAt'>): AccountMovement {
  const movements = loadAccountMovements();
  const newMovement: AccountMovement = {
    ...data,
    id: generateMovementId(),
    createdAt: new Date().toISOString(),
  };
  movements.unshift(newMovement);
  saveAccountMovements(movements);

  // Recalculate and save
  recalculateBalances();

  return newMovement;
}

// Transfer between accounts
export function transferBetweenAccounts(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string
): { from: AccountMovement; to: AccountMovement } | null {
  if (amount <= 0) return null;
  const accounts = loadAccountsData();
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  if (!fromAccount || !toAccount) return null;

  const now = new Date().toISOString();
  const baseDesc = description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`;

  const outMovement: AccountMovement = {
    id: generateMovementId(),
    accountId: fromAccountId,
    accountName: fromAccount.name,
    type: 'transfer_out',
    amount,
    description: baseDesc,
    relatedAccountId: toAccountId,
    relatedAccountName: toAccount.name,
    date: now,
    createdAt: now,
  };

  const inMovement: AccountMovement = {
    id: generateMovementId(),
    accountId: toAccountId,
    accountName: toAccount.name,
    type: 'transfer_in',
    amount,
    description: baseDesc,
    relatedAccountId: fromAccountId,
    relatedAccountName: fromAccount.name,
    date: now,
    createdAt: now,
  };

  const movements = loadAccountMovements();
  movements.unshift(outMovement, inMovement);
  saveAccountMovements(movements);
  recalculateBalances();

  return { from: outMovement, to: inMovement };
}

export function getAccountMovements(accountId: string): AccountMovement[] {
  return loadAccountMovements()
    .filter((m) => m.accountId === accountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllAccountMovements(): AccountMovement[] {
  return loadAccountMovements().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function deleteAccountMovement(id: string): boolean {
  const movements = loadAccountMovements();
  const filtered = movements.filter((m) => m.id !== id);
  if (filtered.length === movements.length) return false;
  saveAccountMovements(filtered);
  recalculateBalances();
  return true;
}

export function getAccountByMethodKey(methodKey: string): Account | undefined {
  return getActiveAccounts().find((a) => a.methodKey === methodKey);
}