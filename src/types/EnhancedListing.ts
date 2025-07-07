
export interface EnhancedListingData {
  title: string;
  description: string;
  price: number;
  purchase_price?: number;
  purchase_date?: string;
  is_consignment?: boolean;
  consignment_percentage?: number;
  consignor_name?: string;
  consignor_contact?: string;
  source_location?: string;
  source_type?: string;
  category: string;
  condition: string;
  measurements: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  };
  keywords?: string[];
  photos: string[];
  priceResearch?: string;
  shipping_cost?: number;
  status?: string;
  cost_basis?: number;
  fees_paid?: number;
  net_profit?: number;
  profit_margin?: number;
  listed_date?: string;
  sold_date?: string;
  sold_price?: number;
  days_to_sell?: number;
  performance_notes?: string;
}

export interface PurchaseInfo {
  purchase_price?: number;
  purchase_date?: string;
  source_location?: string;
  source_type?: 'thrift_store' | 'estate_sale' | 'garage_sale' | 'consignment' | 'wholesale' | 'online' | 'other';
}

export interface ConsignmentInfo {
  is_consignment: boolean;
  consignment_percentage?: number;
  consignor_name?: string;
  consignor_contact?: string;
}
