import type { Listing } from '@/types/Listing';

export const exportListingsToCSV = (listings: Listing[]): string => {
  const headers = [
    'ID',
    'Title',
    'Description',
    'Price',
    'Category',
    'Condition',
    'Status',
    'Purchase Price',
    'Purchase Date',
    'Cost Basis',
    'Net Profit',
    'Profit Margin',
    'Shipping Cost',
    'Is Consignment',
    'Consignment Percentage',
    'Consignor Name',
    'Consignor Contact',
    'Source Type',
    'Source Location',
    'Listed Date',
    'Sold Date',
    'Sold Price',
    'Days to Sell',
    'Performance Notes',
    'Keywords',
    'Photos',
    'Measurements Length',
    'Measurements Width',
    'Measurements Height',
    'Measurements Weight',
    'Clothing Size',
    'Shoe Size',
    'Gender',
    'Age Group',
    'Created At',
    'Updated At'
  ];

  const csvRows = [headers.join(',')];

  listings.forEach(listing => {
    const row = [
      listing.id,
      `"${(listing.title || '').replace(/"/g, '""')}"`,
      `"${(listing.description || '').replace(/"/g, '""')}"`,
      listing.price || 0,
      `"${listing.category || ''}"`,
      `"${listing.condition || ''}"`,
      `"${listing.status || ''}"`,
      listing.purchase_price || '',
      listing.purchase_date || '',
      listing.cost_basis || '',
      listing.net_profit || '',
      listing.profit_margin || '',
      listing.shipping_cost || '',
      listing.is_consignment || false,
      listing.consignment_percentage || '',
      `"${listing.consignor_name || ''}"`,
      `"${listing.consignor_contact || ''}"`,
      `"${listing.source_type || ''}"`,
      `"${listing.source_location || ''}"`,
      listing.listed_date || '',
      listing.sold_date || '',
      listing.sold_price || '',
      listing.days_to_sell || '',
      `"${(listing.performance_notes || '').replace(/"/g, '""')}"`,
      `"${Array.isArray(listing.keywords) ? listing.keywords.join(';') : ''}"`,
      `"${Array.isArray(listing.photos) ? listing.photos.join(';') : ''}"`,
      listing.measurements?.length || '',
      listing.measurements?.width || '',
      listing.measurements?.height || '',
      listing.measurements?.weight || '',
      `"${listing.clothing_size || ''}"`,
      `"${listing.shoe_size || ''}"`,
      `"${listing.gender || ''}"`,
      `"${listing.age_group || ''}"`,
      listing.created_at,
      listing.updated_at
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export interface CSVImportRow {
  [key: string]: string;
}

export const parseCSV = (csvText: string): CSVImportRow[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: CSVImportRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: CSVImportRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

export const validateCSVRow = (row: CSVImportRow, rowIndex: number): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required fields validation
  if (!row.Title || row.Title.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Title is required`);
  }
  
  if (!row.Price || isNaN(Number(row.Price)) || Number(row.Price) < 0) {
    errors.push(`Row ${rowIndex + 1}: Valid price is required`);
  }
  
  // Optional field validations
  if (row['Purchase Price'] && (isNaN(Number(row['Purchase Price'])) || Number(row['Purchase Price']) < 0)) {
    errors.push(`Row ${rowIndex + 1}: Purchase price must be a valid number`);
  }
  
  if (row['Shipping Cost'] && (isNaN(Number(row['Shipping Cost'])) || Number(row['Shipping Cost']) < 0)) {
    errors.push(`Row ${rowIndex + 1}: Shipping cost must be a valid number`);
  }
  
  if (row['Consignment Percentage'] && (isNaN(Number(row['Consignment Percentage'])) || Number(row['Consignment Percentage']) < 0 || Number(row['Consignment Percentage']) > 100)) {
    errors.push(`Row ${rowIndex + 1}: Consignment percentage must be between 0 and 100`);
  }
  
  // Gender validation
  if (row.Gender && !['Men', 'Women', 'Kids', 'Unisex'].includes(row.Gender)) {
    errors.push(`Row ${rowIndex + 1}: Gender must be one of: Men, Women, Kids, Unisex`);
  }
  
  // Age Group validation
  if (row['Age Group'] && !['Adult', 'Youth', 'Toddler', 'Baby'].includes(row['Age Group'])) {
    errors.push(`Row ${rowIndex + 1}: Age Group must be one of: Adult, Youth, Toddler, Baby`);
  }
  
  // Date validation
  if (row['Purchase Date'] && row['Purchase Date'].trim() !== '' && isNaN(Date.parse(row['Purchase Date']))) {
    errors.push(`Row ${rowIndex + 1}: Invalid purchase date format`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const convertCSVRowToListing = (row: CSVImportRow): Partial<Listing> => {
  return {
    title: row.Title?.trim() || '',
    description: row.Description?.trim() || null,
    price: Number(row.Price) || 0,
    category: row.Category?.trim() || null,
    condition: row.Condition?.trim() || null,
    status: row.Status?.trim() || 'draft',
    purchase_price: row['Purchase Price'] ? Number(row['Purchase Price']) : null,
    purchase_date: row['Purchase Date']?.trim() || null,
    cost_basis: row['Cost Basis'] ? Number(row['Cost Basis']) : null,
    net_profit: row['Net Profit'] ? Number(row['Net Profit']) : null,
    profit_margin: row['Profit Margin'] ? Number(row['Profit Margin']) : null,
    shipping_cost: row['Shipping Cost'] ? Number(row['Shipping Cost']) : null,
    is_consignment: row['Is Consignment']?.toLowerCase() === 'true',
    consignment_percentage: row['Consignment Percentage'] ? Number(row['Consignment Percentage']) : null,
    consignor_name: row['Consignor Name']?.trim() || null,
    consignor_contact: row['Consignor Contact']?.trim() || null,
    source_type: row['Source Type']?.trim() || null,
    source_location: row['Source Location']?.trim() || null,
    listed_date: row['Listed Date']?.trim() || null,
    sold_date: row['Sold Date']?.trim() || null,
    sold_price: row['Sold Price'] ? Number(row['Sold Price']) : null,
    days_to_sell: row['Days to Sell'] ? Number(row['Days to Sell']) : null,
    performance_notes: row['Performance Notes']?.trim() || null,
    keywords: row.Keywords ? row.Keywords.split(';').filter(k => k.trim()) : null,
    photos: row.Photos ? row.Photos.split(';').filter(p => p.trim()) : null,
    measurements: {
      length: row['Measurements Length']?.trim() || undefined,
      width: row['Measurements Width']?.trim() || undefined,
      height: row['Measurements Height']?.trim() || undefined,
      weight: row['Measurements Weight']?.trim() || undefined,
    },
    clothing_size: row['Clothing Size']?.trim() || null,
    shoe_size: row['Shoe Size']?.trim() || null,
    gender: row.Gender?.trim() as 'Men' | 'Women' | 'Kids' | 'Unisex' || null,
    age_group: row['Age Group']?.trim() as 'Adult' | 'Youth' | 'Toddler' | 'Baby' || null
  };
};
