import PointOfSale from '@/components/pos/PointOfSale';

export default function CajaMinorista() {
  return (
    <PointOfSale
      mode="retail"
      title="Caja Minorista"
      subtitle="Ventas al público — precios minoristas"
      icon="ri-store-2-line"
    />
  );
}