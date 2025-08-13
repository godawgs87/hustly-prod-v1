
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

// Type alias for compatibility with existing code
export type Listing = EnhancedListingData & {
  id?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  quantity?: number;
  ebay_item_id?: string;
  platform?: string;
  ebay_category_id?: string;
  ebay_category_path?: string;
  ebay_listing_id?: string;
  ebay_sync_status?: string;
  ebay_last_sync?: string;
};
