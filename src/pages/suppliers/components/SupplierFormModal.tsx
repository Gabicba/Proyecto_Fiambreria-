import { useEffect, useState } from "react";
import type { Supplier, SupplierKind } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import { uid } from "@/utils/format";

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSaved: (supplier: Supplier) => void;
}

const emptySupplier = (): Supplier => ({
  id: uid("sup"),
  name: "",
  cuit: "",
  contact: "",
  phone: "",
  address: "",
  notes: "",
  active: true,
  kind: "proveedor",
  pricesIncludeIva: true,
});

const SupplierFormModal = ({
  open,
  onClose,
  supplier,
  onSaved,
}: SupplierFormModalProps) => {
  const [draft, setDraft] = useState<Supplier>(emptySupplier());
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(supplier ?? emptySupplier());
      setError("");
    }
  }, [open, supplier]);

  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    if (!draft.name.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }
    onSaved({ ...draft, name: draft.name.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
      subtitle="Datos comerciales, contacto y observaciones. Los hipermercados tambien se registran aca."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={save}>
            Guardar proveedor
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Nombre o razon social *
          </label>
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Fiambres del Sur"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Tipo
          </label>
          <Select
            value={draft.kind ?? "proveedor"}
            onChange={(v) => set("kind", v as SupplierKind)}
            options={[
              { value: "proveedor", label: "Proveedor" },
              { value: "hipermercado", label: "Hipermercado" },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            CUIT
          </label>
          <input
            value={draft.cuit}
            onChange={(e) => set("cuit", e.target.value)}
            placeholder="30-00000000-0"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Contacto
          </label>
          <input
            value={draft.contact}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="Nombre del vendedor"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Telefono
          </label>
          <input
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="11 0000-0000"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="md:col-span-2 rounded-md border border-background-200 bg-background-100/60 p-3">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Precios de factura
          </label>
          <div className="flex items-center gap-1 bg-background-200/70 rounded-full p-1 w-full md:w-fit">
            <button
              type="button"
              onClick={() => set("pricesIncludeIva", true)}
              className={`flex-1 md:flex-none px-4 h-8 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                draft.pricesIncludeIva !== false
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:text-foreground-900"
              }`}
            >
              Con IVA incluido
            </button>
            <button
              type="button"
              onClick={() => set("pricesIncludeIva", false)}
              className={`flex-1 md:flex-none px-4 h-8 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                draft.pricesIncludeIva === false
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:text-foreground-900"
              }`}
            >
              Sin IVA incluido
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-foreground-400">
            Se precarga al registrar un ingreso de mercaderia. Siempre se puede
            cambiar para una factura puntual.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Direccion
          </label>
          <input
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Calle, numero, localidad"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observaciones
          </label>
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Dias de entrega, pedido minimo, condiciones..."
            className="w-full px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => set("active", e.target.checked)}
          className="w-4 h-4 accent-primary-500"
        />
        Proveedor activo (disponible para nuevos ingresos)
      </label>
    </Modal>
  );
};

export default SupplierFormModal;