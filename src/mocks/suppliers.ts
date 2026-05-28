export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  cuit: string;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = 'fiambreria_suppliers_v1';

function generateId(): string {
  return `SUP-${Date.now().toString(36).toUpperCase()}`;
}

function loadSuppliers(): Supplier[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  // Default suppliers from products
  return [
    { id: 'SUP-1', name: 'Fiambres del Sur', contactName: 'Juan Pérez', phone: '11-4567-8901', email: 'ventas@fiambresdelsur.com', address: 'Av. Corrientes 1234, CABA', cuit: '20-12345678-9', notes: 'Entrega martes y viernes', createdAt: new Date().toISOString() },
    { id: 'SUP-2', name: 'Lácteos La Pampa', contactName: 'María González', phone: '11-5678-9012', email: 'pedidos@lacteospampa.com', address: 'Ruta 5 Km 234, La Pampa', cuit: '30-23456789-0', notes: 'Pedido mínimo $50.000', createdAt: new Date().toISOString() },
    { id: 'SUP-3', name: 'Embutidos Tandil', contactName: 'Carlos Ruiz', phone: '11-6789-0123', email: 'distribucion@embutidostandil.com.ar', address: 'Av. Belgrano 567, Tandil', cuit: '27-34567890-1', notes: '', createdAt: new Date().toISOString() },
    { id: 'SUP-4', name: 'Carnes Patagónicas', contactName: 'Ana López', phone: '11-7890-1234', email: 'carnespatagonicas@gmail.com', address: 'Calle 45 N° 789, Neuquén', cuit: '23-45678901-2', notes: 'Carnes premium, precio variable según stock', createdAt: new Date().toISOString() },
    { id: 'SUP-5', name: 'Panadería San José', contactName: 'Roberto Martínez', phone: '11-8901-2345', email: 'panaderiasanjose@hotmail.com', address: 'San José 321, CABA', cuit: '20-56789012-3', notes: 'Entrega diaria 6am', createdAt: new Date().toISOString() },
  ];
}

function saveSuppliers(suppliers: Supplier[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export function getSuppliers(): Supplier[] {
  return loadSuppliers();
}

export function addSupplier(data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
  const suppliers = loadSuppliers();
  const newSupplier: Supplier = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  suppliers.push(newSupplier);
  saveSuppliers(suppliers);
  return newSupplier;
}

export function updateSupplier(id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Supplier | null {
  const suppliers = loadSuppliers();
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  suppliers[idx] = { ...suppliers[idx], ...data };
  saveSuppliers(suppliers);
  return suppliers[idx];
}

export function deleteSupplier(id: string): boolean {
  const suppliers = loadSuppliers();
  const filtered = suppliers.filter((s) => s.id !== id);
  if (filtered.length === suppliers.length) return false;
  saveSuppliers(filtered);
  return true;
}