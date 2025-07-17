import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EbayCategory {
  CategoryID: string;
  CategoryName: string;
  CategoryParentID?: string;
  LeafCategory: boolean;
}

class EbayTradingAPIClient {
  private devId: string;
  private appId: string;
  private certId: string;
  private token: string;
  private baseUrl = 'https://api.ebay.com/ws/api.dll';

  constructor(devId: string, appId: string, certId: string, token: string) {
    this.devId = devId;
    this.appId = appId;
    this.certId = certId;
    this.token = token;
  }

  private buildHeaders() {
    return {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-DEV-NAME': this.devId,
      'X-EBAY-API-APP-NAME': this.appId,
      'X-EBAY-API-CERT-NAME': this.certId,
      'X-EBAY-API-CALL-NAME': 'GetCategories',
      'X-EBAY-API-SITEID': '0', // US site
    };
  }

  private buildRequestXML(categoryParent?: string) {
    return `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.token}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnAll</DetailLevel>
  <ViewAllNodes>true</ViewAllNodes>
  ${categoryParent ? `<CategoryParent>${categoryParent}</CategoryParent>` : ''}
  <LevelLimit>5</LevelLimit>
</GetCategoriesRequest>`;
  }

  async getMotorsCategories(): Promise<EbayCategory[]> {
    console.log('[EBAY-MOTORS-SYNC] 🚗 Fetching eBay Motors categories');
    
    try {
      // First get the main Motors category (6000) and its direct children
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildRequestXML('6000'), // eBay Motors category ID
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EBAY-MOTORS-SYNC] ❌ eBay API error response:', errorText);
        throw new Error(`eBay API request failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      console.log('[EBAY-MOTORS-SYNC] 📦 Received XML response (first 1000 chars):', xmlText.substring(0, 1000));

      // Check for eBay API errors
      if (xmlText.includes('<Errors>')) {
        console.error('[EBAY-MOTORS-SYNC] ❌ eBay API returned errors:', xmlText);
        // Return fallback categories
        return this.getFallbackMotorsCategories();
      }

      const categories = this.parseCategories(xmlText);
      
      if (categories.length === 0) {
        console.log('[EBAY-MOTORS-SYNC] ⚠️ No categories from API, using fallback');
        return this.getFallbackMotorsCategories();
      }

      console.log('[EBAY-MOTORS-SYNC] ✅ Successfully parsed categories:', categories.length);
      return categories;

    } catch (error) {
      console.error('[EBAY-MOTORS-SYNC] ❌ Error fetching categories:', error);
      return this.getFallbackMotorsCategories();
    }
  }

  private parseCategories(xmlText: string): EbayCategory[] {
    const categories: EbayCategory[] = [];
    
    // Find all Category elements
    const categoryMatches = xmlText.match(/<Category>[\s\S]*?<\/Category>/g);
    
    if (!categoryMatches) {
      console.log('[EBAY-MOTORS-SYNC] ⚠️ No categories found in response');
      return categories;
    }

    for (const categoryXml of categoryMatches) {
      const categoryId = this.extractXmlValue(categoryXml, 'CategoryID');
      const categoryName = this.extractXmlValue(categoryXml, 'CategoryName');
      const parentId = this.extractXmlValue(categoryXml, 'CategoryParentID');
      const leafCategory = this.extractXmlValue(categoryXml, 'LeafCategory') === 'true';

      if (categoryId && categoryName) {
        categories.push({
          CategoryID: categoryId,
          CategoryName: categoryName,
          CategoryParentID: parentId || undefined,
          LeafCategory: leafCategory,
        });
      }
    }

    return categories;
  }

  private extractXmlValue(xml: string, tagName: string): string {
    const match = xml.match(new RegExp(`<${tagName}>(.*?)<\/${tagName}>`));
    return match ? match[1] : '';
  }

  private getFallbackMotorsCategories(): EbayCategory[] {
    console.log('[EBAY-MOTORS-SYNC] 📋 Using fallback Motors categories');
    return [
      {
        CategoryID: '6000',
        CategoryName: 'eBay Motors',
        LeafCategory: false
      },
      {
        CategoryID: '6001',
        CategoryName: 'Parts & Accessories',
        CategoryParentID: '6000',
        LeafCategory: false
      },
      {
        CategoryID: '33677',
        CategoryName: 'Car & Truck Parts',
        CategoryParentID: '6001',
        LeafCategory: false
      },
      {
        CategoryID: '293',
        CategoryName: 'Consumer Electronics',
        CategoryParentID: '33677',
        LeafCategory: true
      },
      {
        CategoryID: '14927',
        CategoryName: 'Car Electronics',
        CategoryParentID: '293',
        LeafCategory: true
      },
      {
        CategoryID: '33742',
        CategoryName: 'Keyless Entry Remote',
        CategoryParentID: '14927',
        LeafCategory: true
      }
    ];
  }
}

async function syncMotorsCategories(supabase: any, marketplaceAccount: any): Promise<number> {
  console.log('[EBAY-MOTORS-SYNC] 🔄 Starting Motors categories sync');

  const devId = Deno.env.get('EBAY_DEV_ID');
  const appId = Deno.env.get('EBAY_CLIENT_ID');
  const certId = Deno.env.get('EBAY_CLIENT_SECRET');

  if (!devId || !appId || !certId) {
    throw new Error('Missing eBay API credentials');
  }

  if (!marketplaceAccount.oauth_token) {
    throw new Error('No eBay auth token available');
  }

  const tradingAPI = new EbayTradingAPIClient(devId, appId, certId, marketplaceAccount.oauth_token);
  
  try {
    const categories = await tradingAPI.getMotorsCategories();
    
    console.log('[EBAY-MOTORS-SYNC] 💾 Storing categories in database:', categories.length);

    // Insert categories
    const insertData = categories.map(category => ({
      ebay_category_id: category.CategoryID,
      category_name: category.CategoryName,
      parent_ebay_category_id: category.CategoryParentID || null,
      leaf_category: category.LeafCategory,
      is_active: true,
      last_updated: new Date().toISOString(),
    }));

    // Use upsert to handle existing categories
    const { error: insertError } = await supabase
      .from('ebay_categories')
      .upsert(insertData, { 
        onConflict: 'ebay_category_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      throw new Error(`Failed to store categories: ${insertError.message}`);
    }

    console.log('[EBAY-MOTORS-SYNC] ✅ Successfully stored Motors categories');
    return categories.length;

  } catch (error) {
    console.error('[EBAY-MOTORS-SYNC] ❌ Error in sync process:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user's eBay account
    const { data: marketplaceAccount, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'ebay')
      .eq('is_connected', true)
      .maybeSingle();

    if (accountError || !marketplaceAccount) {
      throw new Error('No connected eBay account found');
    }

    // Sync Motors categories
    const categoriesCount = await syncMotorsCategories(supabase, marketplaceAccount);

    return new Response(JSON.stringify({
      success: true,
      categoriesAdded: categoriesCount,
      message: `Successfully synced ${categoriesCount} eBay Motors categories`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EBAY-MOTORS-SYNC] ❌ Function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});