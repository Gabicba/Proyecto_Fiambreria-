import type { Sale, CartItem } from './salesStore';
import { loadProducts } from './productsStore';

const STORAGE_KEY = 'fiambreria_historical_sales';

function generateId(): string {
  return `V${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function generateHistoricalSales(): Sale[] {
  const products = loadProducts();
  if (products.length === 0) return [];

  const sales: Sale[] = [];
  const now = new Date();

  // Generate sales for past 12 months with varying patterns
  for (let dayOffset = 365; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);

    // Weekend boost
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseSales = isWeekend ? 12 : 6;
    const dailySales = baseSales + Math.floor(Math.random() * 4);

    for (let s = 0; s < dailySales; s++) {
      const numItems = 1 + Math.floor(Math.random() * 3);
      const items: CartItem[] = [];
      let subtotal = 0;

      for (let i = 0; i < numItems; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = product.soldByWeight
          ? Math.round((0.1 + Math.random() * 0.9) * 100) / 100
          : Math.floor(1 + Math.random() * 5);
        const lineTotal = product.retailPrice * qty;
        subtotal += lineTotal;
        items.push({
          product,
          quantity: qty,
          weightKg: product.soldByWeight ? qty : undefined,
        });
      }

      const methods = ['cash', 'debit', 'credit', 'transfer', 'mercado-pago', 'mixed'];
      const weights = [0.35, 0.25, 0.15, 0.1, 0.1, 0.05];
      const paymentMethod = weightedRandom(methods, weights);
      const methodLabels: Record<string, string> = {
        cash: 'Efectivo',
        debit: 'Débito',
        credit: 'Crédito',
        transfer: 'Transferencia',
        'mercado-pago': 'Mercado Pago',
        mixed: 'Mixto',
      };

      const interestRate = paymentMethod === 'credit' ? [0, 5, 10, 15][Math.floor(Math.random() * 4)] : 0;
      const fixedFeePercent = paymentMethod === 'credit' ? 3 : 0;
      const interestAmount = (subtotal * interestRate) / 100;
      const fixedFeeAmount = (subtotal * fixedFeePercent) / 100;
      const finalAmount = subtotal + interestAmount + fixedFeeAmount;

      let mixedPayment;
      if (paymentMethod === 'mixed') {
        const cashPart = Math.round(subtotal * (0.3 + Math.random() * 0.4) * 100) / 100;
        const debitPart = Math.round((subtotal - cashPart) * (0.5 + Math.random() * 0.3) * 100) / 100;
        const transferPart = Math.round((subtotal - cashPart - debitPart) * 100) / 100;
        mixedPayment = {
          cash: cashPart,
          debit: debitPart,
          transfer: transferPart,
          mercadoPago: 0,
        };
      }

      const hour = 9 + Math.floor(Math.random() * 11); // 9am to 8pm
      const minute = Math.floor(Math.random() * 60);
      date.setHours(hour, minute);

      sales.push({
        id: generateId(),
        items,
        customerName: `Cliente ${Math.floor(Math.random() * 500) + 1}`,
        paymentMethod,
        paymentMethodLabel: methodLabels[paymentMethod],
        installments: paymentMethod === 'credit' ? [1, 3, 6, 12][Math.floor(Math.random() * 4)] : 1,
        interestRate,
        fixedFeePercent,
        interestAmount,
        fixedFeeAmount,
        finalAmount,
        origin: Math.random() > 0.15 ? 'retail' : 'wholesale',
        sellerName: ['Juan', 'María', 'Pedro', 'Ana', 'Carlos'][Math.floor(Math.random() * 5)],
        status: 'finalized',
        cashAmount: paymentMethod === 'cash' ? Math.ceil(finalAmount / 100) * 100 : undefined,
        mixedPayment,
        createdAt: date.toISOString(),
        finalizedAt: date.toISOString(),
      });
    }
  }

  // Sort by date descending
  sales.sort((a, b) => new Date(b.finalizedAt || b.createdAt).getTime() - new Date(a.finalizedAt || a.createdAt).getTime());

  return sales;
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function loadHistoricalSales(): Sale[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  // Generate and store
  const sales = generateHistoricalSales();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  return sales;
}

export function clearHistoricalSales(): void {
  localStorage.removeItem(STORAGE_KEY);
}