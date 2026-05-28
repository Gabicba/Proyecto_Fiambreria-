export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  taxRate: number;
  profitMargin: number;
  minStock: number;
  currentStock: number;
  expirationDate: string;
  pluCode: string;
  supplier: string;
}

export const defaultProducts: Product[] = [
  { id: '1', code: 'JAM001', barcode: '7790123456001', name: 'Jamón crudo c/hueso', category: 'Fiambres', unit: 'kg', purchasePrice: 13800, retailPrice: 18500, wholesalePrice: 16800, taxRate: 0, profitMargin: 34, minStock: 5, currentStock: 12.5, expirationDate: '2026-06-15', pluCode: 'PLU001', supplier: 'Fiambres del Sur' },
  { id: '2', code: 'JAM002', barcode: '7790123456002', name: 'Jamón cocido', category: 'Fiambres', unit: 'kg', purchasePrice: 6900, retailPrice: 9200, wholesalePrice: 8300, taxRate: 0, profitMargin: 33, minStock: 8, currentStock: 15.2, expirationDate: '2026-06-20', pluCode: 'PLU002', supplier: 'Fiambres del Sur' },
  { id: '3', code: 'SAL001', barcode: '7790123456003', name: 'Salame milán', category: 'Embutidos', unit: 'kg', purchasePrice: 8400, retailPrice: 11200, wholesalePrice: 10100, taxRate: 0, profitMargin: 33, minStock: 4, currentStock: 8.3, expirationDate: '2026-07-01', pluCode: 'PLU003', supplier: 'Embutidos Tandil' },
  { id: '4', code: 'SAL002', barcode: '7790123456004', name: 'Salame tandilero', category: 'Embutidos', unit: 'kg', purchasePrice: 9600, retailPrice: 12800, wholesalePrice: 11500, taxRate: 0, profitMargin: 33, minStock: 3, currentStock: 6.0, expirationDate: '2026-07-10', pluCode: 'PLU004', supplier: 'Embutidos Tandil' },
  { id: '5', code: 'LON001', barcode: '7790123456005', name: 'Lomo ahumado', category: 'Fiambres', unit: 'kg', purchasePrice: 10900, retailPrice: 14500, wholesalePrice: 13100, taxRate: 0, profitMargin: 33, minStock: 3, currentStock: 5.8, expirationDate: '2026-06-18', pluCode: 'PLU005', supplier: 'Fiambres del Sur' },
  { id: '6', code: 'PAL001', barcode: '7790123456006', name: 'Paleta cocida', category: 'Fiambres', unit: 'kg', purchasePrice: 5800, retailPrice: 7800, wholesalePrice: 7100, taxRate: 0, profitMargin: 34, minStock: 6, currentStock: 9.5, expirationDate: '2026-06-22', pluCode: 'PLU006', supplier: 'Fiambres del Sur' },
  { id: '7', code: 'MOR001', barcode: '7790123456007', name: 'Mortadela c/pistacho', category: 'Fiambres', unit: 'kg', purchasePrice: 4900, retailPrice: 6500, wholesalePrice: 5900, taxRate: 0, profitMargin: 33, minStock: 5, currentStock: 7.2, expirationDate: '2026-06-25', pluCode: 'PLU007', supplier: 'Fiambres del Sur' },
  { id: '8', code: 'QUESO01', barcode: '7790123456008', name: 'Queso cremoso', category: 'Quesos', unit: 'kg', purchasePrice: 4350, retailPrice: 5800, wholesalePrice: 5200, taxRate: 0, profitMargin: 33, minStock: 10, currentStock: 18.0, expirationDate: '2026-06-10', pluCode: 'PLU008', supplier: 'Lácteos La Pampa' },
  { id: '9', code: 'QUESO02', barcode: '7790123456009', name: 'Queso rallado x 250g', category: 'Quesos', unit: 'un', purchasePrice: 2400, retailPrice: 3200, wholesalePrice: 2900, taxRate: 0, profitMargin: 33, minStock: 15, currentStock: 42, expirationDate: '2026-08-01', pluCode: 'PLU009', supplier: 'Lácteos La Pampa' },
  { id: '10', code: 'QUESO03', barcode: '7790123456010', name: 'Queso mozzarela', category: 'Quesos', unit: 'kg', purchasePrice: 4650, retailPrice: 6200, wholesalePrice: 5600, taxRate: 0, profitMargin: 33, minStock: 6, currentStock: 11.4, expirationDate: '2026-06-12', pluCode: 'PLU010', supplier: 'Lácteos La Pampa' },
  { id: '11', code: 'QUESO04', barcode: '7790123456011', name: 'Queso tybo', category: 'Quesos', unit: 'kg', purchasePrice: 4100, retailPrice: 5500, wholesalePrice: 5000, taxRate: 0, profitMargin: 34, minStock: 6, currentStock: 9.8, expirationDate: '2026-06-30', pluCode: 'PLU011', supplier: 'Lácteos La Pampa' },
  { id: '12', code: 'QUESO05', barcode: '7790123456012', name: 'Queso pategrás', category: 'Quesos', unit: 'kg', purchasePrice: 6400, retailPrice: 8500, wholesalePrice: 7700, taxRate: 0, profitMargin: 33, minStock: 4, currentStock: 6.5, expirationDate: '2026-07-05', pluCode: 'PLU012', supplier: 'Lácteos La Pampa' },
  { id: '13', code: 'MIL001', barcode: '7790123456013', name: 'Milanesa de nalga x kg', category: 'Carnes', unit: 'kg', purchasePrice: 7200, retailPrice: 9500, wholesalePrice: 8600, taxRate: 0, profitMargin: 32, minStock: 5, currentStock: 10.0, expirationDate: '2026-06-08', pluCode: 'PLU013', supplier: 'Carnes Patagónicas' },
  { id: '14', code: 'MIL002', barcode: '7790123456014', name: 'Milanesa de peceto x kg', category: 'Carnes', unit: 'kg', purchasePrice: 9500, retailPrice: 12500, wholesalePrice: 11300, taxRate: 0, profitMargin: 32, minStock: 3, currentStock: 4.5, expirationDate: '2026-06-08', pluCode: 'PLU014', supplier: 'Carnes Patagónicas' },
  { id: '15', code: 'ASADO01', barcode: '7790123456015', name: 'Asado x kg', category: 'Carnes', unit: 'kg', purchasePrice: 6700, retailPrice: 8800, wholesalePrice: 8000, taxRate: 0, profitMargin: 31, minStock: 6, currentStock: 14.2, expirationDate: '2026-06-07', pluCode: 'PLU015', supplier: 'Carnes Patagónicas' },
  { id: '16', code: 'VAC001', barcode: '7790123456016', name: 'Vacío x kg', category: 'Carnes', unit: 'kg', purchasePrice: 7800, retailPrice: 10200, wholesalePrice: 9300, taxRate: 0, profitMargin: 31, minStock: 4, currentStock: 6.8, expirationDate: '2026-06-09', pluCode: 'PLU016', supplier: 'Carnes Patagónicas' },
  { id: '17', code: 'CHORI01', barcode: '7790123456017', name: 'Chorizo parrillero', category: 'Embutidos', unit: 'kg', purchasePrice: 3700, retailPrice: 4800, wholesalePrice: 4400, taxRate: 0, profitMargin: 30, minStock: 5, currentStock: 9.0, expirationDate: '2026-06-28', pluCode: 'PLU017', supplier: 'Embutidos Tandil' },
  { id: '18', code: 'MORC001', barcode: '7790123456018', name: 'Morcilla vasca', category: 'Embutidos', unit: 'kg', purchasePrice: 3200, retailPrice: 4200, wholesalePrice: 3800, taxRate: 0, profitMargin: 31, minStock: 4, currentStock: 5.5, expirationDate: '2026-06-26', pluCode: 'PLU018', supplier: 'Embutidos Tandil' },
  { id: '19', code: 'PAN001', barcode: '7790123456019', name: 'Pan de mesa x kg', category: 'Panadería', unit: 'kg', purchasePrice: 1350, retailPrice: 1800, wholesalePrice: 1650, taxRate: 0, profitMargin: 33, minStock: 8, currentStock: 25.0, expirationDate: '2026-05-28', pluCode: 'PLU019', supplier: 'Panadería San José' },
  { id: '20', code: 'PAN002', barcode: '7790123456020', name: 'Flautita x un', category: 'Panadería', unit: 'un', purchasePrice: 260, retailPrice: 350, wholesalePrice: 320, taxRate: 0, profitMargin: 35, minStock: 30, currentStock: 120, expirationDate: '2026-05-27', pluCode: 'PLU020', supplier: 'Panadería San José' },
];