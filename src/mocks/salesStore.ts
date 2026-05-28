import { useState, useCallback, useEffect } from 'react';
import type { Product } from './products';
import { getAccountByMethodKey, addAccountMovement } from './accounts';

export interface CartItem {
  product: Product;
  quantity: number;
  weightKg?: number;
}

export interface MixedPaymentBreakdown {
  cash: number;
  debit: number;
  transfer: number;
  mercadoPago: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  customerName: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  installments: number;
  interestRate: number;
  fixedFeePercent: number;
  subtotal: number;
  interestAmount: number;
  fixedFeeAmount: number;
  finalAmount: number;
  origin: 'retail' | 'wholesale';
  sellerName: string;
  status: 'pending' | 'confirmed' | 'finalized';
  changeAmount?: number;
  amountPaid?: number;
  cashAmount?: number;
  mixedPayment?: MixedPaymentBreakdown;
  createdAt: string;
  finalizedAt?: string;
}

const STORAGE_KEY = 'fiambreria_sales_v2';

function generateId(): string {
  return `V${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function loadSales(): Sale[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSales(sales: Sale[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

// Record incoming money from a sale into treasury accounts
function recordSaleInTreasury(sale: Sale): void {
  if (sale.status !== 'confirmed' && sale.status !== 'finalized') return;

  const date = sale.finalizedAt || new Date().toISOString();
  const baseDesc = `Venta ${sale.id} — ${sale.customerName || 'Sin cliente'} — ${sale.paymentMethodLabel}`;

  if (sale.paymentMethod === 'mixed' && sale.mixedPayment) {
    const mp = sale.mixedPayment;
    const parts: { key: string; amount: number }[] = [
      { key: 'cash', amount: mp.cash },
      { key: 'debit', amount: mp.debit },
      { key: 'transfer', amount: mp.transfer },
      { key: 'mercado-pago', amount: mp.mercadoPago },
    ];
    parts.forEach((part) => {
      if (part.amount > 0) {
        const account = getAccountByMethodKey(part.key);
        if (account) {
          addAccountMovement({
            accountId: account.id,
            accountName: account.name,
            type: 'in',
            amount: part.amount,
            description: `${baseDesc} — ${account.name}`,
            date,
          });
        }
      }
    });
  } else {
    const account = getAccountByMethodKey(sale.paymentMethod);
    if (account) {
      addAccountMovement({
        accountId: account.id,
        accountName: account.name,
        type: 'in',
        amount: sale.finalAmount,
        description: baseDesc,
        date,
      });
    }
  }
}

// Revert a sale's treasury records (when cancelling)
function revertSaleFromTreasury(sale: Sale): void {
  const date = new Date().toISOString();
  const baseDesc = `Anulación venta ${sale.id} — ${sale.customerName || 'Sin cliente'}`;

  if (sale.paymentMethod === 'mixed' && sale.mixedPayment) {
    const mp = sale.mixedPayment;
    const parts: { key: string; amount: number }[] = [
      { key: 'cash', amount: mp.cash },
      { key: 'debit', amount: mp.debit },
      { key: 'transfer', amount: mp.transfer },
      { key: 'mercado-pago', amount: mp.mercadoPago },
    ];
    parts.forEach((part) => {
      if (part.amount > 0) {
        const account = getAccountByMethodKey(part.key);
        if (account) {
          addAccountMovement({
            accountId: account.id,
            accountName: account.name,
            type: 'out',
            amount: part.amount,
            description: `${baseDesc} — ${account.name}`,
            date,
          });
        }
      }
    });
  } else {
    const account = getAccountByMethodKey(sale.paymentMethod);
    if (account) {
      addAccountMovement({
        accountId: account.id,
        accountName: account.name,
        type: 'out',
        amount: sale.finalAmount,
        description: baseDesc,
        date,
      });
    }
  }
}

export function useSalesStore() {
  const [sales, setSales] = useState<Sale[]>(loadSales);

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  const addSale = useCallback((saleData: Omit<Sale, 'id' | 'status' | 'createdAt'>): Sale => {
    const newSale: Sale = {
      ...saleData,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSales((prev) => [newSale, ...prev]);
    return newSale;
  }, []);

  const confirmSale = useCallback((saleId: string, amountPaid: number, changeAmount: number) => {
    let confirmedSale: Sale | null = null;
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          confirmedSale = { ...s, status: 'confirmed' as const, amountPaid, changeAmount };
          return confirmedSale;
        }
        return s;
      })
    );
    if (confirmedSale) {
      recordSaleInTreasury(confirmedSale);
    }
  }, []);

  const finalizeSale = useCallback((saleId: string) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, status: 'finalized' as const, finalizedAt: new Date().toISOString() }
          : s
      )
    );
  }, []);

  const cancelSale = useCallback((saleId: string) => {
    let cancelledSale: Sale | null = null;
    setSales((prev) => {
      const sale = prev.find((s) => s.id === saleId);
      if (sale) cancelledSale = sale;
      return prev.filter((s) => s.id !== saleId);
    });
    if (cancelledSale && (cancelledSale.status === 'confirmed' || cancelledSale.status === 'finalized')) {
      revertSaleFromTreasury(cancelledSale);
    }
  }, []);

  const getPendingSales = useCallback(() => {
    return sales.filter((s) => s.status === 'pending');
  }, [sales]);

  const getConfirmedSales = useCallback(() => {
    return sales.filter((s) => s.status === 'confirmed');
  }, [sales]);

  const getFinalizedSales = useCallback(() => {
    return sales.filter((s) => s.status === 'finalized');
  }, [sales]);

  const getSaleById = useCallback((id: string) => {
    return sales.find((s) => s.id === id);
  }, [sales]);

  return {
    sales,
    addSale,
    confirmSale,
    finalizeSale,
    cancelSale,
    getPendingSales,
    getConfirmedSales,
    getFinalizedSales,
    getSaleById,
  };
}