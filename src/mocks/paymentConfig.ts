export interface InstallmentConfig {
  installments: number;
  interestRate: number;
}

export interface PaymentMethodConfig {
  method: string;
  label: string;
  icon: string;
  hasInstallments: boolean;
  installments: InstallmentConfig[];
  fixedFeePercent: number;
}

export const paymentMethods: PaymentMethodConfig[] = [
  {
    method: 'cash',
    label: 'Efectivo',
    icon: 'ri-money-dollar-circle-line',
    hasInstallments: false,
    installments: [],
    fixedFeePercent: 0,
  },
  {
    method: 'debit',
    label: 'Débito',
    icon: 'ri-bank-card-line',
    hasInstallments: false,
    installments: [],
    fixedFeePercent: 1.5,
  },
  {
    method: 'credit',
    label: 'Crédito',
    icon: 'ri-bank-card-2-line',
    hasInstallments: true,
    installments: [
      { installments: 1, interestRate: 0 },
      { installments: 3, interestRate: 8 },
      { installments: 6, interestRate: 18 },
      { installments: 12, interestRate: 35 },
    ],
    fixedFeePercent: 2.5,
  },
  {
    method: 'transfer',
    label: 'Transferencia',
    icon: 'ri-arrow-left-right-line',
    hasInstallments: false,
    installments: [],
    fixedFeePercent: 0,
  },
  {
    method: 'mercado-pago',
    label: 'Mercado Pago',
    icon: 'ri-wallet-3-line',
    hasInstallments: true,
    installments: [
      { installments: 1, interestRate: 5 },
      { installments: 3, interestRate: 12 },
      { installments: 6, interestRate: 22 },
      { installments: 12, interestRate: 40 },
    ],
    fixedFeePercent: 3.5,
  },
  {
    method: 'mixed',
    label: 'Pago Mixto',
    icon: 'ri-stack-line',
    hasInstallments: false,
    installments: [],
    fixedFeePercent: 0,
  },
];

export const defaultPaymentConfig: PaymentMethodConfig[] = paymentMethods;