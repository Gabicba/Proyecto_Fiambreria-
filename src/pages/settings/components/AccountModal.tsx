import { useEffect, useMemo, useState } from "react";
import type { Account, AccountType } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import { uid } from "@/utils/format";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  onSaved: (account: Account) => void;
}

const typeOptions: { value: AccountType; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "banco", label: "Transferencia / Banco" },
  { value: "billetera", label: "Billetera virtual" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

const typeLabelOf = (type: AccountType): string =>
  typeOptions.find((t) => t.value === type)?.label ?? "Otro";

const AccountModal = ({ open, onClose, account, onSaved }: AccountModalProps) => {
  const { state } = useApp();
  const [name, setName] = useState("");
  const [methodId, setMethodId] = useState("");
  const [type, setType] = useState<AccountType>("efectivo");
  const [retail, setRetail] = useState(true);
  const [wholesale, setWholesale] = useState(true);
  const [active, setActive] = useState(true);
  const [initialBalance, setInitialBalance] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const methodOptions = useMemo(
    () =>
      state.paymentMethods.map((m) => ({ value: m.id, label: m.name })),
    [state.paymentMethods]
  );

  useEffect(() => {
    if (!open) return;
    if (account) {
      setName(account.name);
      setMethodId(account.methodId);
      setType(account.type);
      setRetail(account.retail);
      setWholesale(account.wholesale);
      setActive(account.active);
      setInitialBalance(account.initialBalance);
      setNote(account.note);
    } else {
      setName("");
      setMethodId(state.paymentMethods[0]?.id ?? "");
      setType("efectivo");
      setRetail(true);
      setWholesale(true);
      setActive(true);
      setInitialBalance(0);
      setNote("");
    }
    setError("");
  }, [open, account, state.paymentMethods]);

  const submit = () => {
    if (!name.trim()) {
      setError("Ingresá el nombre visible de la cuenta.");
      return;
    }
    if (!methodId) {
      setError("Elegí el medio de pago asociado (Tipo/medio).");
      return;
    }
    const result: Account = {
      id: account?.id ?? uid("acc"),
      name: name.trim(),
      type,
      typeLabel: typeLabelOf(type),
      active,
      initialBalance,
      methodId,
      retail,
      wholesale,
      note: note.trim(),
    };
    onSaved(result);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? "Editar cuenta de cobro" : "Nueva cuenta de cobro"}
      subtitle="La cuenta es el destino/origen concreto del dinero. El medio es el cómo cobra."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={submit}>
            Guardar cuenta
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Nombre visible *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mercado Pago Coti"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Tipo / medio asociado *
            </label>
            <Select
              value={methodId}
              onChange={setMethodId}
              options={methodOptions}
              placeholder="Seleccionar medio"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Categoría de cuenta
            </label>
            <Select
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={typeOptions.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Saldo inicial
            </label>
            <NumberInput
              value={initialBalance}
              onChange={setInitialBalance}
              suffix="$"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-background-300 cursor-pointer w-full">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm text-foreground-700">
                Cuenta activa para nuevas ventas
              </span>
            </label>
          </div>
        </div>

        <div>
          <p className="block text-xs font-medium text-foreground-600 mb-1">
            Disponible en
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-background-300 cursor-pointer">
              <input
                type="checkbox"
                checked={retail}
                onChange={(e) => setRetail(e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm text-foreground-700">Minorista</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-background-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wholesale}
                onChange={(e) => setWholesale(e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm text-foreground-700">Mayorista</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observación (opcional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Ej: solo para cobros de transferencia mayorista."
            className="w-full px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {error ? (
          <p className="text-xs text-danger flex items-center gap-1">
            <i className="ri-error-warning-line" /> {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

export default AccountModal;