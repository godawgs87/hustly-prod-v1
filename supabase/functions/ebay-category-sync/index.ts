import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-CATEGORY-SYNC] ${step}${detailsStr}`);
};

// eBay Category API Integration
class EbayCategoryAPI {
  private accessToken: string = '';
  private baseUrl: string = 'https://api.ebay.com';
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
  }

  async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      logStep('eBay credentials missing', { hasClientId: !!this.clientId, hasClientSecret: !!this.clientSecret });
      throw new Error('eBay credentials not configured. Please add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to Supabase secrets.');
    }

    logStep('Attempting to get eBay access token', { clientId: this.clientId.substring(0, 8) + '...' });

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Token fetch failed', { status: response.status, error: errorText });
      throw new Error(`eBay auth failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    logStep('Access token obtained successfully');
    return this.accessToken;
  }

  async getCategories(categoryId?: string): Promise<any> {
    if (!this.accessToken) await this.getAccessToken();

    // Use the correct eBay Taxonomy API endpoint
    const url = categoryId 
      ? `${this.baseUrl}/commerce/taxonomy/v1/category_tree/0/get_category_subtree?category_id=${categoryId}`
      : `${this.baseUrl}/commerce/taxonomy/v1/category_tree/0`;

    logStep('Fetching categories from eBay Taxonomy API', { categoryId, url });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    logStep('eBay API raw response', { 
      status: response.status, 
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logStep('Category fetch failed', { 
        error: responseText, 
        status: response.status, 
        statusText: response.statusText 
      });
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logStep('Failed to parse JSON response', { parseError, responseText });
      throw new Error(`Invalid JSON response from eBay API: ${parseError}`);
    }

    logStep('Categories parsed successfully', { 
      hasData: !!data,
      dataKeys: Object.keys(data || {}),
      hasRootCategoryNode: !!data.rootCategoryNode,
      hasCategoryTreeNode: !!data.categoryTreeNode,
      rootChildrenCount: data.rootCategoryNode?.childCategoryTreeNodes?.length || 0,
      treeChildrenCount: data.categoryTreeNode?.childCategoryTreeNodes?.length || 0
    });
    
    return data;
  }

  async getAllLeafCategories(): Promise<any[]> {
    logStep('Starting full category tree sync');
    const allCategories: any[] = [];
    
    try {
      // Get root categories first
      const rootData = await this.getCategories();
      logStep('Root data received', { hasData: !!rootData, hasRootCategoryNode: !!rootData.rootCategoryNode });
      
      if (!rootData || !rootData.rootCategoryNode) {
        logStep('No root category data received from eBay - checking alternative structure');
        if (rootData?.categoryTreeNode) {
          logStep('Found categoryTreeNode instead of rootCategoryNode');
          rootData.rootCategoryNode = rootData.categoryTreeNode;
        } else {
          logStep('No valid category structure found in response');
          return [];
        }
      }
      
      const rootCategories = rootData.rootCategoryNode?.childCategoryTreeNodes || [];
      logStep('Root categories found', { count: rootCategories.length });
      
      // Process each root category recursively
      for (const category of rootCategories) {
        await this.processCategory(category, allCategories);
      }
      
      logStep('Full category sync completed', { totalCategories: allCategories.length });
      return allCategories;
    } catch (error) {
      logStep('Category sync failed with error', { error: error.message });
      throw error;
    }
  }

  private async processCategory(category: any, allCategories: any[], parentId: string | null = null) {
    const currentCategoryId = category.category.categoryId;
    const currentParentId = parentId || category.category.parentCategoryId || null;
    
    // Add current category if it's a leaf (has no children)
    if (!category.childCategoryTreeNodes || category.childCategoryTreeNodes.length === 0) {
      allCategories.push({
        ebay_category_id: currentCategoryId,
        category_name: category.category.categoryName,
        parent_ebay_category_id: currentParentId,
        leaf_category: true
      });
    } else {
      // Add non-leaf category too
      allCategories.push({
        ebay_category_id: currentCategoryId,
        category_name: category.category.categoryName,
        parent_ebay_category_id: currentParentId,
        leaf_category: false
      });
      
      // Process children with current category as parent
      for (const child of category.childCategoryTreeNodes) {
        await this.processCategory(child, allCategories, currentCategoryId);
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay category sync started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const requestData = await req.json().catch(() => ({}));
    const { fullSync = false } = requestData;

    logStep("Processing category sync", { fullSync });

    // Check if we have recent categories (less than 24 hours old)
    if (!fullSync) {
      const { data: recentCategories, error: checkError } = await supabaseClient
        .from('ebay_categories')
        .select('id, updated_at')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!checkError && recentCategories && recentCategories.length > 0) {
        logStep("Categories are recent, skipping sync");
        return new Response(JSON.stringify({
          status: 'skipped',
          message: 'Categories are up to date',
          last_updated: recentCategories[0].updated_at
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Initialize eBay API and fetch all categories
    const ebayApi = new EbayCategoryAPI();
    const categories = await ebayApi.getAllLeafCategories();

    logStep("Categories fetched from eBay", { count: categories.length });

    // Clear existing categories if doing full sync
    if (fullSync) {
      await supabaseClient.from('ebay_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      logStep("Existing categories cleared");
    }

    // Insert categories in batches
    const batchSize = 1000;
    let insertedCount = 0;
    
    if (categories.length === 0) {
      throw new Error("No categories received from eBay API - check API credentials and endpoints");
    }
    
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      
      const { error: insertError } = await supabaseClient
        .from('ebay_categories')
        .upsert(batch.map(cat => ({
          ...cat,
          is_active: true,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })), {
          onConflict: 'ebay_category_id'
        });

      if (insertError) {
        logStep("Batch insert failed", { error: insertError, batch: i });
        throw new Error(`Failed to insert category batch: ${insertError.message}`);
      }
      
      insertedCount += batch.length;
      logStep("Category batch inserted", { batch: i / batchSize + 1, inserted: insertedCount });
    }

    logStep("eBay category sync completed successfully", { 
      totalCategories: categories.length,
      insertedCount 
    });

    return new Response(JSON.stringify({
      status: 'success',
      categories_synced: categories.length,
      inserted_count: insertedCount,
      sync_type: fullSync ? 'full' : 'incremental'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      status: 'failed',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});