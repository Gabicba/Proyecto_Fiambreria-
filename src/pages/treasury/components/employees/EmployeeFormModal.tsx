import { useEffect, useState } from "react";
import type { Employee, PaymentPeriodicity } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import { uid } from "@/utils/format";

interface EmployeeFormModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

const inputClass =
  "w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

const EmployeeFormModal = ({
  open,
  employee,
  onClose,
}: EmployeeFormModalProps) => {
  const { currentUser, saveEmployee } = useApp();
  const { notify } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [periodicity, setPeriodicity] = useState<PaymentPeriodicity>("semanal");
  const [referenceSalary, setReferenceSalary] = useState(0);
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFirstName(employee?.firstName ?? "");
    setLastName(employee?.lastName ?? "");
    setPhone(employee?.phone ?? "");
    setStartDate(employee?.startDate ?? new Date().toISOString().slice(0, 10));
    setPeriodicity(employee?.periodicity ?? "semanal");
    setReferenceSalary(employee?.referenceSalary ?? 0);
    setNotes(employee?.notes ?? "");
    setActive(employee?.active ?? true);
    setError("");
  }, [open, employee]);

  const submit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Completa nombre y apellido.");
      return;
    }
    if (!startDate) {
      setError("Indica la fecha de ingreso.");
      return;
    }
    if (referenceSalary < 0) {
      setError("La remuneracion de referencia no puede ser negativa.");
      return;
    }
    const record: Employee = {
      id: employee?.id ?? uid("emp"),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      startDate,
      periodicity,
      referenceSalary,
      notes: notes.trim(),
      active,
      createdAt: employee?.createdAt ?? new Date().toISOString(),
    };
    saveEmployee(record, currentUser?.name ?? "Sistema");
    notify(
      employee ? "Empleado actualizado" : "Empleado creado",
      "success",
      `${record.firstName} ${record.lastName}`
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? "Editar empleado" : "Nuevo empleado"}
      subtitle="Datos personales y condiciones de pago. Sin calculos legales automaticos."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={submit}>
            {employee ? "Guardar cambios" : "Crear empleado"}
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
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Nombre *
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={60}
            className={inputClass}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Apellido *
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={60}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Telefono
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            placeholder="299 400 0000"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Fecha de ingreso *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Periodicidad de pago *
          </label>
          <Select
            value={periodicity}
            onChange={(v) => setPeriodicity(v as PaymentPeriodicity)}
            options={[
              { value: "semanal", label: "Semanal" },
              { value: "mensual", label: "Mensual" },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Remuneracion de referencia
          </label>
          <NumberInput
            value={referenceSalary}
            onChange={setReferenceSalary}
            suffix="$"
            min={0}
          />
          <p className="mt-1 text-[11px] text-foreground-400">
            Solo orientativa. No genera aportes ni liquidaciones legales.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={400}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="md:col-span-2">
          <label className="flex items-start gap-2 rounded-md border border-background-200 bg-background-100 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary-500"
            />
            <span className="text-sm text-foreground-700">
              Empleado activo
              <span className="block text-[11px] text-foreground-400">
                Los empleados con historial no se eliminan: se desactivan y sus
                registros quedan disponibles.
              </span>
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeFormModal;