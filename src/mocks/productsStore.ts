import type { Product } from './productsData';
import { defaultProducts } from './productsData';

const STORAGE_KEY = 'fiambreria_products_v1';

export function loadProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return [...defaultProducts];
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function addProduct(data: Omit<Product, 'id'>): Product {
  const products = loadProducts();
  const newProduct: Product = {
    ...data,
    id: `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>): Product | null {
  const products = loadProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...data };
  saveProducts(products);
  return products[idx];
}

export function deleteProduct(id: string): boolean {
  const products = loadProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
  saveProducts(filtered);
  return true;
}

export function getProductByBarcode(barcode: string): Product | undefined {
  return loadProducts().find((p) => p.barcode === barcode);
}

export function getProductByCode(code: string): Product | undefined {
  return loadProducts().find((p) => p.code.toLowerCase() === code.toLowerCase());
}

export function searchProducts(query: string): Product[] {
  const term = query.toLowerCase().trim();
  if (!term) return loadProducts();
  return loadProducts().filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.barcode.includes(term) ||
      p.code.toLowerCase().includes(term)
  );
}

export { type Product };