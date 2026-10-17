import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";

export interface ReportField {
  label: string;
  value: string;
}

interface ReportDetailModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: ReportField[];
  onClose: () => void;
}

const ReportDetailModal = ({
  open,
  title,
  subtitle,
  fields,
  onClose,
}: ReportDetailModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    footer={
      <Button variant="ghost" onClick={onClose}>
        Cerrar
      </Button>
    }
  >
    <dl className="divide-y divide-background-100 text-sm">
      {fields.map((field) => (
        <div key={field.label} className="flex justify-between gap-4 py-2">
          <dt className="text-foreground-500 shrink-0">{field.label}</dt>
          <dd className="text-foreground-900 text-right break-words">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  </Modal>
);

export default ReportDetailModal;