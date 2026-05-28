import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  loadAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  addAccountMovement,
  transferBetweenAccounts,
  getAllAccountMovements,
  deleteAccountMovement,
  type Account,
  type AccountMovement,
} from '@/mocks/accounts';

const paymentMethodOptions = [
  'Efectivo',
  'Transferencia',
  'Débito',
  'Crédito',
  'Mercado Pago',
  'Cheque',
  'Otro',
];

const accountTypeOptions: { key: Account['type']; label: string; icon: string }[] = [
  { key: 'cash', label: 'Efectivo', icon: 'ri-money-cny-circle-line' },
  { key: 'bank', label: 'Banco', icon: 'ri-bank-line' },
  { key: 'card', label: 'Tarjeta', icon: 'ri-bank-card-line' },
  { key: 'digital', label: 'Digital', icon: 'ri-smartphone-line' },
];

const accountColors = [
  '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#00A3E0',
  '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

const typeLabel = (type: string) => {
  const found = accountTypeOptions.find((t) => t.key === type);
  return found?.label || type;
};

const typeIcon = (type: string) => {
  const found = accountTypeOptions.find((t) => t.key === type);
  return found?.icon || 'ri-wallet-3-line';
};

export default function Tesoreria() {
  const [accounts, setAccounts] = useState<Account[]>(loadAccounts);
  const [allMovements, setAllMovements] = useState<AccountMovement[]>(getAllAccountMovements);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<string | null>(null);
  const [confirmDeleteMovement, setConfirmDeleteMovement] = useState<string | null>(null);

  // Account form
  const [accForm, setAccForm] = useState({
    name: '',
    type: 'cash' as Account['type'],
    paymentMethod: 'Efectivo',
    color: accountColors[0],
  });

  // Movement form
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movAccount, setMovAccount] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');

  // Transfer form
  const [transFrom, setTransFrom] = useState('');
  const [transTo, setTransTo] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');

  // Movement filter
  const [movFilter, setMovFilter] = useState<'all' | 'in' | 'out' | 'transfer'>('all');

  const refresh = useCallback(() => {
    setAccounts(loadAccounts());
    setAllMovements(getAllAccountMovements());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  const totalBalance = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + a.currentBalance, 0),
    [activeAccounts]
  );

  const filteredMovements = useMemo(() => {
    let list = allMovements;
    if (selectedAccountId) {
      list = list.filter((m) => m.accountId === selectedAccountId);
    }
    if (movFilter !== 'all') {
      list = list.filter((m) => {
        if (movFilter === 'transfer') return m.type === 'transfer_in' || m.type === 'transfer_out';
        return m.type === movFilter;
      });
    }
    return list;
  }, [allMovements, selectedAccountId, movFilter]);

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.name.trim()) return;
    addAccount({
      name: accForm.name.trim(),
      type: accForm.type,
      paymentMethod: accForm.paymentMethod,
      color: accForm.color,
      active: true,
    });
    refresh();
    setShowAccountModal(false);
    setAccForm({ name: '', type: 'cash', paymentMethod: 'Efectivo', color: accountColors[0] });
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movAmount);
    if (!amount || amount <= 0 || !movAccount) return;
    const acc = accounts.find((a) => a.id === movAccount);
    if (!acc) return;

    addAccountMovement({
      accountId: acc.id,
      accountName: acc.name,
      type: movType,
      amount,
      description: movDesc,
      date: new Date().toISOString(),
    });

    refresh();
    setShowMovementModal(false);
    setMovAmount('');
    setMovDesc('');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transAmount);
    if (!amount || amount <= 0 || !transFrom || !transTo || transFrom === transTo) return;

    transferBetweenAccounts(transFrom, transTo, amount, transDesc);
    refresh();
    setShowTransferModal(false);
    setTransAmount('');
    setTransDesc('');
    setTransFrom('');
    setTransTo('');
  };

  const handleDeleteMovement = (id: string) => {
    deleteAccountMovement(id);
    refresh();
    setConfirmDeleteMovement(null);
  };

  const handleToggleAccount = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    updateAccount(id, { active: !acc.active });
    refresh();
  };

  const movementTypeLabel = (m: AccountMovement) => {
    switch (m.type) {
      case 'in': return { label: 'Ingreso', color: 'bg-verde-50 text-verde-700' };
      case 'out': return { label: 'Egreso', color: 'bg-red-50 text-red-600' };
      case 'transfer_in': return { label: 'Transferencia recibida', color: 'bg-naranja-50 text-naranja-700' };
      case 'transfer_out': return { label: 'Transferencia enviada', color: 'bg-gray-100 text-gray-700' };
      default: return { label: m.type, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const totalIn = filteredMovements
    .filter((m) => m.type === 'in' || m.type === 'transfer_in')
    .reduce((s, m) => s + m.amount, 0);
  const totalOut = filteredMovements
    .filter((m) => m.type === 'out' || m.type === 'transfer_out')
    .reduce((s, m) => s + m.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-safe-2-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Tesorería</h1>
          <p className="text-xs text-verde-300">Cajas, cuentas y movimientos por método de pago</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Total balance */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Capital total disponible</p>
            <p className="text-4xl font-bold text-gray-800">${totalBalance.toLocaleString('es-AR')}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-naranja-600 hover:bg-naranja-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-right-line" />
              Transferir
            </button>
            <button
              type="button"
              onClick={() => {
                setMovType('in');
                setMovAccount(selectedAccountId || '');
                setShowMovementModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-verde-700 hover:bg-verde-800 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Movimiento
            </button>
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-bank-line" />
              Nueva cuenta
            </button>
          </div>
        </div>

        {/* Accounts grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Cajas y cuentas</h2>
            {selectedAccountId && (
              <button
                type="button"
                onClick={() => setSelectedAccountId(null)}
                className="text-xs text-verde-600 hover:text-verde-800 font-medium cursor-pointer"
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id === selectedAccountId ? null : acc.id)}
                className={`text-left bg-white border rounded-xl p-4 transition-all cursor-pointer ${
                  selectedAccountId === acc.id
                    ? 'border-verde-500 ring-1 ring-verde-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: acc.color }}
                  >
                    <i className={typeIcon(acc.type)} />
                  </span>
                  <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-md">
                    {typeLabel(acc.type)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">{acc.name}</p>
                <p className="text-xs text-gray-400 mb-2">{acc.paymentMethod}</p>
                <p className="text-2xl font-bold text-gray-800">
                  ${acc.currentBalance.toLocaleString('es-AR')}
                </p>
              </button>
            ))}
          </div>

          {/* Inactive accounts */}
          {accounts.some((a) => !a.active) && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Cuentas inactivas</p>
              <div className="flex flex-wrap gap-2">
                {accounts.filter((a) => !a.active).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleToggleAccount(acc.id)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                    {acc.name} (inactiva)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Movements */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Movimientos
              {selectedAccount && (
                <span className="text-gray-400 font-normal"> — {selectedAccount.name}</span>
              )}
            </h2>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {([
                { key: 'all' as const, label: 'Todos' },
                { key: 'in' as const, label: 'Ingresos' },
                { key: 'out' as const, label: 'Egresos' },
                { key: 'transfer' as const, label: 'Transferencias' },
              ]).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setMovFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    movFilter === f.key ? 'bg-white text-verde-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMovements.length === 0 ? (
            <div className="p-8 text-center">
              <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
                <i className="ri-safe-2-line text-2xl text-gray-400" />
              </span>
              <p className="text-sm text-gray-400">
                {selectedAccount ? `Sin movimientos en ${selectedAccount.name}` : 'Sin movimientos registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Cuenta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Descripción</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Monto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => {
                    const typeInfo = movementTypeLabel(m);
                    return (
                      <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {new Date(m.date).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-700">{m.accountName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {m.relatedAccountName && (
                            <span className="text-xs text-gray-400 ml-2">
                              → {m.relatedAccountName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[280px] truncate">{m.description || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          <span className={m.type === 'in' || m.type === 'transfer_in' ? 'text-verde-700' : 'text-red-600'}>
                            {m.type === 'in' || m.type === 'transfer_in' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteMovement(m.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Movement summary bar */}
          {filteredMovements.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Ingresos:</span>{' '}
                <span className="font-medium text-verde-700">+${totalIn.toLocaleString('es-AR')}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Egresos:</span>{' '}
                <span className="font-medium text-red-600">-${totalOut.toLocaleString('es-AR')}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Balance del período:</span>{' '}
                <span className={`font-medium ${totalIn - totalOut >= 0 ? 'text-verde-700' : 'text-red-600'}`}>
                  {totalIn - totalOut >= 0 ? '+' : '-'}${Math.abs(totalIn - totalOut).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Nueva cuenta / caja</h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  required
                  value={accForm.name}
                  onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  placeholder="Ej: Caja Chica"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                  <select
                    value={accForm.type}
                    onChange={(e) => setAccForm((f) => ({ ...f, type: e.target.value as Account['type'] }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {accountTypeOptions.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Método de pago</label>
                  <select
                    value={accForm.paymentMethod}
                    onChange={(e) => setAccForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {paymentMethodOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {accountColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccForm((f) => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-lg transition-all cursor-pointer ${accForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                {movType === 'in' ? 'Registrar ingreso' : 'Registrar egreso'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <form onSubmit={handleAddMovement} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMovType('in')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      movType === 'in' ? 'border-verde-500 bg-verde-50 text-verde-800' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <i className="ri-arrow-down-line mr-1" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovType('out')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      movType === 'out' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <i className="ri-arrow-up-line mr-1" />
                    Egreso
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cuenta *</label>
                <select
                  required
                  value={movAccount}
                  onChange={(e) => setMovAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — ${a.currentBalance.toLocaleString('es-AR')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input
                  type="text"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  placeholder="Ej: Venta del día, pago alquiler..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Transferir entre cuentas</h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Desde *</label>
                <select
                  required
                  value={transFrom}
                  onChange={(e) => setTransFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Seleccionar cuenta origen...</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — ${a.currentBalance.toLocaleString('es-AR')}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-400">
                  <i className="ri-arrow-down-line" />
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Hacia *</label>
                <select
                  required
                  value={transTo}
                  onChange={(e) => setTransTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Seleccionar cuenta destino...</option>
                  {activeAccounts
                    .filter((a) => a.id !== transFrom)
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.name} — ${a.currentBalance.toLocaleString('es-AR')}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input
                  type="text"
                  value={transDesc}
                  onChange={(e) => setTransDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  placeholder="Ej: Pasar efectivo al banco"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-naranja-600 hover:bg-naranja-700 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Transferir
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete movement confirmation */}
      {confirmDeleteMovement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg">
                <i className="ri-alert-line text-lg" />
              </span>
              <h3 className="text-base font-semibold text-gray-800">¿Eliminar movimiento?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              El saldo de la cuenta se recalculará. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDeleteMovement(confirmDeleteMovement)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteMovement(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}