export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: string;
  source: string;
  date: string;
  notes: string;
  category: string;
  accountMovementId?: string;
  createdAt: string;
}

const STORAGE_KEY = 'fiambreria_supplier_payments_v1';
const CATEGORIES_KEY = 'fiambreria_payment_categories_v1';

export const defaultCategories = [
  'Fiambres',
  'Lácteos',
  'Embutidos',
  'Carnes',
  'Panadería',
  'Bebidas',
  'Almacén',
  'Otros',
];

export function loadCategories(): string[] {
  try {
    const data = localStorage.getItem(CATEGORIES_KEY);
    if (data) {
      const parsed = JSON.parse(data) as string[];
      // Merge with defaults, remove duplicates
      return Array.from(new Set([...defaultCategories, ...parsed]));
    }
  } catch {
    // ignore
  }
  return [...defaultCategories];
}

export function saveCategories(categories: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addCategory(name: string): string[] {
  const categories = loadCategories();
  const trimmed = name.trim();
  if (!trimmed || categories.includes(trimmed)) return categories;
  categories.push(trimmed);
  saveCategories(categories);
  return categories;
}

export function generatePaymentId(): string {
  return `PAG-${Date.now().toString(36).toUpperCase()}`;
}

export function loadPayments(): SupplierPayment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePayments(payments: SupplierPayment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

export function addPayment(data: Omit<SupplierPayment, 'id' | 'createdAt'>): SupplierPayment {
  const payments = loadPayments();
  const newPayment: SupplierPayment = {
    ...data,
    id: generatePaymentId(),
    createdAt: new Date().toISOString(),
  };
  payments.unshift(newPayment);
  savePayments(payments);
  return newPayment;
}

export function updatePayment(id: string, data: Partial<Omit<SupplierPayment, 'id' | 'createdAt'>>): SupplierPayment | null {
  const payments = loadPayments();
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  payments[idx] = { ...payments[idx], ...data };
  savePayments(payments);
  return payments[idx];
}

export function deletePayment(id: string): boolean {
  const payments = loadPayments();
  const filtered = payments.filter((p) => p.id !== id);
  if (filtered.length === payments.length) return false;
  savePayments(filtered);
  return true;
}

export function getPaymentsBySupplier(supplierId: string): SupplierPayment[] {
  return loadPayments()
    .filter((p) => p.supplierId === supplierId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getTotalPaidToSupplier(supplierId: string): number {
  return getPaymentsBySupplier(supplierId).reduce((sum, p) => sum + p.amount, 0);
}