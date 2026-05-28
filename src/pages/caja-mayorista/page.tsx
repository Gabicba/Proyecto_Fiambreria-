import PointOfSale from '@/components/pos/PointOfSale';

export default function CajaMayorista() {
  return (
    <PointOfSale
      mode="wholesale"
      title="Caja Mayorista"
      subtitle="Ventas por mayor — precios especiales"
      icon="ri-building-2-line"
    />
  );
}