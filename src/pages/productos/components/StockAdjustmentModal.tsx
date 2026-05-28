import { useState } from 'react';
import type { Product } from '@/mocks/productsStore';

interface Props {
  product: Product;
  onClose: () => void;
  onSave: (productId: string, adjustment: number) => void;
}

export default function StockAdjustmentModal({ product, onClose, onSave }: Props) {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');

  const qty = parseFloat(adjustment) || 0;
  const newStock = product.currentStock + qty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === 0) return;
    onSave(product.id, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Ajustar stock</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-800">{product.name}</p>
          <p className="text-xs text-gray-500">{product.code} — Stock actual: {product.currentStock}{product.unit}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Cantidad a ajustar ({product.unit})
            </label>
            <input
              type="number"
              step="0.001"
              autoFocus
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
              placeholder="Ej: +5 o -2"
            />
            <p className="text-xs text-gray-400 mt-1">
              Usá valores positivos para ingresar, negativos para descontar.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
              placeholder="Rotura, vencimiento, ajuste..."
            />
          </div>

          <div className="bg-verde-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Nuevo stock:</span>
            <span className={`text-sm font-bold ${newStock < 0 ? 'text-red-600' : 'text-verde-800'}`}>
              {newStock.toFixed(3)}{product.unit}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={qty === 0 || newStock < 0}
              className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
            >
              Guardar ajuste
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}