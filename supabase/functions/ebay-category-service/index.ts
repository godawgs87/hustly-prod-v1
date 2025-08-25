import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { parseStringPromise } from "https://esm.sh/xml2js@0.6.2";
import { Builder } from "https://esm.sh/xml2js@0.6.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class EbayCategoryService {
  private baseUrl = 'https://api.ebay.com/ws/api.dll';
  
  constructor(private accessToken: string) {}

  private getTradingAPIHeaders(callName: string): HeadersInit {
    return {
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-IAF-TOKEN': this.accessToken,
      'Content-Type': 'text/xml'
    };
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async getSuggestedCategory(query: string): Promise<any> {
    try {
      const escapedQuery = this.escapeXml(query.substring(0, 350));
      
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <GetSuggestedCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <Query>${escapedQuery}</Query>
        </GetSuggestedCategoriesRequest>`;
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('GetSuggestedCategories'),
        body: xmlPayload
      });
      
      const responseText = await response.text();
      const result = await parseStringPromise(responseText);
      
      if (result.GetSuggestedCategoriesResponse?.SuggestedCategoryArray?.SuggestedCategory) {
        const suggestions = Array.isArray(result.GetSuggestedCategoriesResponse.SuggestedCategoryArray.SuggestedCategory)
          ? result.GetSuggestedCategoriesResponse.SuggestedCategoryArray.SuggestedCategory
          : [result.GetSuggestedCategoriesResponse.SuggestedCategoryArray.SuggestedCategory];
        
        for (const suggestion of suggestions) {
          if (suggestion?.Category?.CategoryID?.[0]) {
            const categoryId = suggestion.Category.CategoryID[0];
            const categoryName = suggestion.Category.CategoryName?.[0] || '';
            const categoryPath = this.extractCategoryPath(suggestion.Category);
            
            // Check if it's a leaf category
            const isLeaf = await this.checkIfLeafCategory(categoryId);
            
            if (isLeaf) {
              return {
                category_id: categoryId,
                category_name: categoryName,
                is_leaf: true,
                path: categoryPath
              };
            }
            
            // If not leaf, try to get a leaf child
            const leafCategory = await this.getLeafCategoryFromParent(categoryId);
            if (leafCategory) {
              return leafCategory;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('[Category Service] Error getting suggested categories:', error);
      return null;
    }
  }

  async checkIfLeafCategory(categoryId: string): Promise<boolean> {
    try {
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <CategoryID>${categoryId}</CategoryID>
          <LevelLimit>1</LevelLimit>
          <ViewAllNodes>true</ViewAllNodes>
        </GetCategoriesRequest>`;
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('GetCategories'),
        body: xmlPayload
      });
      
      const responseText = await response.text();
      const result = await parseStringPromise(responseText);
      
      if (result.GetCategoriesResponse?.CategoryArray?.Category) {
        const categories = Array.isArray(result.GetCategoriesResponse.CategoryArray.Category)
          ? result.GetCategoriesResponse.CategoryArray.Category
          : [result.GetCategoriesResponse.CategoryArray.Category];
        
        const category = categories.find((cat: any) => cat.CategoryID?.[0] === categoryId);
        return category?.LeafCategory?.[0] === 'true';
      }
    } catch (error) {
      console.error('[Category Service] Error checking if leaf category:', error);
    }
    return false;
  }

  async getLeafCategoryFromParent(parentCategoryId: string): Promise<any> {
    try {
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <CategoryParent>${parentCategoryId}</CategoryParent>
          <ViewAllNodes>false</ViewAllNodes>
        </GetCategoriesRequest>`;
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('GetCategories'),
        body: xmlPayload
      });
      
      const responseText = await response.text();
      const result = await parseStringPromise(responseText);
      
      if (result.GetCategoriesResponse?.CategoryArray?.Category) {
        const categories = Array.isArray(result.GetCategoriesResponse.CategoryArray.Category)
          ? result.GetCategoriesResponse.CategoryArray.Category
          : [result.GetCategoriesResponse.CategoryArray.Category];
        
        // Find the first leaf category
        const leafCategory = categories.find((cat: any) => cat.LeafCategory?.[0] === 'true');
        if (leafCategory) {
          return {
            category_id: leafCategory.CategoryID[0],
            category_name: leafCategory.CategoryName?.[0] || '',
            is_leaf: true,
            path: this.extractCategoryPath(leafCategory)
          };
        }
      }
    } catch (error) {
      console.error('[Category Service] Error getting leaf category from parent:', error);
    }
    return null;
  }

  private extractCategoryPath(category: any): string[] {
    const path = [];
    
    // Build path from parent names if available
    if (category.CategoryParentName) {
      const parentNames = Array.isArray(category.CategoryParentName)
        ? category.CategoryParentName
        : [category.CategoryParentName];
      
      for (const name of parentNames) {
        if (name && name[0]) {
          path.push(name[0]);
        }
      }
    }
    
    // Add current category name
    if (category.CategoryName?.[0]) {
      path.push(category.CategoryName[0]);
    }
    
    return path;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, title, description, categoryId } = await req.json();
    
    // Get eBay access token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: settings } = await supabaseClient
      .from('ebay_settings')
      .select('access_token')
      .single();
    
    if (!settings?.access_token) {
      throw new Error('eBay access token not found');
    }
    
    const categoryService = new EbayCategoryService(settings.access_token);
    
    switch (action) {
      case 'suggest': {
        const query = `${title || ''} ${description || ''}`.trim();
        if (!query) {
          throw new Error('Title or description required for category suggestion');
        }
        
        const category = await categoryService.getSuggestedCategory(query);
        
        return new Response(JSON.stringify({
          success: true,
          category: category || null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      case 'validate': {
        if (!categoryId) {
          throw new Error('Category ID required for validation');
        }
        
        const isLeaf = await categoryService.checkIfLeafCategory(categoryId);
        
        return new Response(JSON.stringify({
          success: true,
          isLeaf
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      case 'getLeafChildren': {
        if (!categoryId) {
          throw new Error('Parent category ID required');
        }
        
        const leafCategory = await categoryService.getLeafCategoryFromParent(categoryId);
        
        return new Response(JSON.stringify({
          success: true,
          category: leafCategory || null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Category Service] Error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
