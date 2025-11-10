export interface Variant {
  size: string;
  stock: number;
}

export interface B2BItem {
  sku: string;
  brandName: string;
  divisionName: string;
  categoryName: string;
  variants: Variant[];
}

export const sampleB2BItems: B2BItem[] = [
  // Piero Footwear - Lifestyle
  {
    sku: 'PIE210000001',
    brandName: 'Piero',
    divisionName: 'Footwear',
    categoryName: 'Lifestyle',
    variants: [
      { size: '39', stock: 15 },
      { size: '40', stock: 20 },
      { size: '41', stock: 18 },
      { size: '42', stock: 22 },
      { size: '43', stock: 12 },
      { size: '44', stock: 8 },
    ]
  },
  {
    sku: 'PIE210000002',
    brandName: 'Piero',
    divisionName: 'Footwear',
    categoryName: 'Lifestyle',
    variants: [
      { size: '39', stock: 10 },
      { size: '40', stock: 15 },
      { size: '41', stock: 12 },
      { size: '42', stock: 18 },
      { size: '43', stock: 8 },
      { size: '44', stock: 5 },
    ]
  },
  // Piero Footwear - Football
  {
    sku: 'PIE210100001',
    brandName: 'Piero',
    divisionName: 'Footwear',
    categoryName: 'Football',
    variants: [
      { size: '39', stock: 20 },
      { size: '40', stock: 25 },
      { size: '41', stock: 30 },
      { size: '42', stock: 35 },
      { size: '43', stock: 25 },
      { size: '44', stock: 15 },
    ]
  },
  // Piero Apparel - Football
  {
    sku: 'PIE220100001',
    brandName: 'Piero',
    divisionName: 'Apparel',
    categoryName: 'Football',
    variants: [
      { size: 'S', stock: 30 },
      { size: 'M', stock: 40 },
      { size: 'L', stock: 35 },
      { size: 'XL', stock: 20 },
      { size: 'XXL', stock: 10 },
    ]
  },
  // Specs Footwear - Football
  {
    sku: 'SPE110100001',
    brandName: 'Specs',
    divisionName: 'Footwear',
    categoryName: 'Football',
    variants: [
      { size: '39', stock: 18 },
      { size: '40', stock: 22 },
      { size: '41', stock: 25 },
      { size: '42', stock: 28 },
      { size: '43', stock: 20 },
      { size: '44', stock: 12 },
    ]
  },
  // Specs Accessories - Football
  {
    sku: 'SPE130100001',
    brandName: 'Specs',
    divisionName: 'Accessories',
    categoryName: 'Football',
    variants: [
      { size: 'One Size', stock: 50 },
    ]
  },
  // Piero Equipment - Football
  {
    sku: 'PIE240100001',
    brandName: 'Piero',
    divisionName: 'Equipment',
    categoryName: 'Football',
    variants: [
      { size: 'Size 5', stock: 25 },
      { size: 'Size 4', stock: 20 },
    ]
  },
];