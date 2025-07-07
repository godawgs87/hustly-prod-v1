import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POSTING-QUEUE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'add_to_queue':
        return await addToQueue(supabaseClient, params);
      
      case 'process_queue':
        return await processQueue(supabaseClient, params);
      
      case 'get_queue_status':
        return await getQueueStatus(supabaseClient, params);
      
      case 'retry_failed':
        return await retryFailedJobs(supabaseClient, params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function addToQueue(supabaseClient: any, params: any) {
  logStep("Adding items to posting queue", { count: params.items?.length });

  const { userId, items, scheduledFor } = params;
  
  if (!userId || !items || !Array.isArray(items)) {
    throw new Error('userId and items array required');
  }

  const queueItems = [];

  for (const item of items) {
    const { listingId, platforms } = item;
    
    // Get marketplace accounts for each platform
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('marketplace_accounts')
      .select('*')
      .eq('user_id', userId)
      .in('platform', platforms)
      .eq('is_connected', true)
      .eq('is_active', true);

    if (accountsError) {
      throw new Error(`Failed to fetch marketplace accounts: ${accountsError.message}`);
    }

    // Add queue item for each platform
    for (const account of accounts) {
      queueItems.push({
        user_id: userId,
        listing_id: listingId,
        marketplace_account_id: account.id,
        platform: account.platform,
        queue_status: 'pending',
        priority: item.priority || 0,
        scheduled_for: scheduledFor || new Date().toISOString(),
        processing_data: {
          auto_relist: item.autoRelist || false,
          pricing_strategy: item.pricingStrategy || 'fixed',
          optimization_level: item.optimizationLevel || 'standard'
        }
      });
    }
  }

  if (queueItems.length === 0) {
    throw new Error('No connected marketplace accounts found for specified platforms');
  }

  const { error } = await supabaseClient
    .from('posting_queue')
    .insert(queueItems);

  if (error) {
    throw new Error(`Failed to add items to queue: ${error.message}`);
  }

  logStep("Items added to queue successfully", { count: queueItems.length });

  return new Response(JSON.stringify({
    status: 'success',
    queued_count: queueItems.length,
    message: 'Items added to posting queue successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function processQueue(supabaseClient: any, params: any) {
  logStep("Processing posting queue", { batchSize: params.batchSize || 10 });

  const batchSize = params.batchSize || 10;
  const currentTime = new Date().toISOString();

  // Get pending items that are scheduled to run
  const { data: queueItems, error } = await supabaseClient
    .from('posting_queue')
    .select(`
      *,
      listings(*),
      marketplace_accounts(*)
    `)
    .eq('queue_status', 'pending')
    .lte('scheduled_for', currentTime)
    .lt('attempts', 3) // Max 3 attempts
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Failed to fetch queue items: ${error.message}`);
  }

  if (!queueItems || queueItems.length === 0) {
    return new Response(JSON.stringify({
      status: 'success',
      processed_count: 0,
      message: 'No items to process'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const results = [];

  for (const queueItem of queueItems) {
    try {
      logStep("Processing queue item", { 
        queueId: queueItem.id,
        platform: queueItem.platform,
        listingId: queueItem.listing_id
      });

      // Update status to processing
      await supabaseClient
        .from('posting_queue')
        .update({
          queue_status: 'processing',
          last_attempt_at: new Date().toISOString(),
          attempts: queueItem.attempts + 1
        })
        .eq('id', queueItem.id);

      // Process based on platform
      let result;
      switch (queueItem.platform) {
        case 'ebay':
          result = await processEbayListing(supabaseClient, queueItem);
          break;
        case 'poshmark':
          result = await processPoshmarkListing(supabaseClient, queueItem);
          break;
        case 'mercari':
          result = await processMercariListing(supabaseClient, queueItem);
          break;
        default:
          throw new Error(`Unsupported platform: ${queueItem.platform}`);
      }

      // Update queue item with success
      await supabaseClient
        .from('posting_queue')
        .update({
          queue_status: 'completed',
          result_data: result
        })
        .eq('id', queueItem.id);

      results.push({
        queue_id: queueItem.id,
        listing_id: queueItem.listing_id,
        platform: queueItem.platform,
        status: 'success',
        result: result
      });

    } catch (error) {
      logStep("Failed to process queue item", {
        queueId: queueItem.id,
        error: error.message
      });

      // Update queue item with error
      const status = queueItem.attempts >= 2 ? 'failed' : 'pending';
      await supabaseClient
        .from('posting_queue')
        .update({
          queue_status: status,
          error_message: error.message
        })
        .eq('id', queueItem.id);

      results.push({
        queue_id: queueItem.id,
        listing_id: queueItem.listing_id,
        platform: queueItem.platform,
        status: 'error',
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  logStep("Queue processing complete", { 
    processed: results.length,
    successful: successCount,
    errors: errorCount
  });

  return new Response(JSON.stringify({
    status: 'success',
    processed_count: results.length,
    successful_count: successCount,
    error_count: errorCount,
    results: results,
    message: 'Queue processing completed'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getQueueStatus(supabaseClient: any, params: any) {
  const { userId } = params;

  if (!userId) {
    throw new Error('userId required');
  }

  // Get queue statistics
  const { data: stats, error } = await supabaseClient
    .from('posting_queue')
    .select('queue_status')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch queue status: ${error.message}`);
  }

  const statusCounts = stats.reduce((acc: any, item: any) => {
    acc[item.queue_status] = (acc[item.queue_status] || 0) + 1;
    return acc;
  }, {});

  // Get recent queue items
  const { data: recentItems, error: recentError } = await supabaseClient
    .from('posting_queue')
    .select(`
      *,
      listings(title),
      marketplace_accounts(platform, account_username)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (recentError) {
    throw new Error(`Failed to fetch recent items: ${recentError.message}`);
  }

  return new Response(JSON.stringify({
    status: 'success',
    queue_stats: {
      pending: statusCounts.pending || 0,
      processing: statusCounts.processing || 0,
      completed: statusCounts.completed || 0,
      failed: statusCounts.failed || 0,
      total: stats.length
    },
    recent_items: recentItems
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function retryFailedJobs(supabaseClient: any, params: any) {
  const { userId, queueIds } = params;

  if (!userId) {
    throw new Error('userId required');
  }

  let query = supabaseClient
    .from('posting_queue')
    .update({
      queue_status: 'pending',
      attempts: 0,
      error_message: null,
      scheduled_for: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('queue_status', 'failed');

  if (queueIds && Array.isArray(queueIds)) {
    query = query.in('id', queueIds);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to retry jobs: ${error.message}`);
  }

  return new Response(JSON.stringify({
    status: 'success',
    message: 'Failed jobs reset for retry'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// Platform-specific processing functions
async function processEbayListing(supabaseClient: any, queueItem: any) {
  logStep("Processing eBay listing", { queueId: queueItem.id });

  // Call eBay integration function
  const ebayResponse = await supabaseClient.functions.invoke('ebay-integration', {
    body: {
      action: 'publish_listing',
      listingId: queueItem.listing_id
    }
  });

  if (ebayResponse.error) {
    throw new Error(`eBay API error: ${ebayResponse.error.message}`);
  }

  return {
    platform_listing_id: ebayResponse.data.platform_listing_id,
    platform_url: ebayResponse.data.platform_url,
    fees: ebayResponse.data.fees
  };
}

async function processPoshmarkListing(supabaseClient: any, queueItem: any) {
  logStep("Processing Poshmark listing", { queueId: queueItem.id });

  // Simulate Poshmark processing via browser extension
  // In real implementation, this would communicate with browser extension
  const mockPoshmarkId = `posh_${Date.now()}`;
  
  // Create platform listing record
  const { error } = await supabaseClient
    .from('platform_listings')
    .insert({
      user_id: queueItem.user_id,
      listing_id: queueItem.listing_id,
      marketplace_account_id: queueItem.marketplace_account_id,
      platform: 'poshmark',
      platform_listing_id: mockPoshmarkId,
      platform_url: `https://poshmark.com/listing/${mockPoshmarkId}`,
      status: 'active',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to create platform listing: ${error.message}`);
  }

  return {
    platform_listing_id: mockPoshmarkId,
    platform_url: `https://poshmark.com/listing/${mockPoshmarkId}`,
    method: 'browser_extension'
  };
}

async function processMercariListing(supabaseClient: any, queueItem: any) {
  logStep("Processing Mercari listing", { queueId: queueItem.id });

  // Simulate Mercari processing via browser extension
  const mockMercariId = `merc_${Date.now()}`;
  
  // Create platform listing record
  const { error } = await supabaseClient
    .from('platform_listings')
    .insert({
      user_id: queueItem.user_id,
      listing_id: queueItem.listing_id,
      marketplace_account_id: queueItem.marketplace_account_id,
      platform: 'mercari',
      platform_listing_id: mockMercariId,
      platform_url: `https://mercari.com/item/${mockMercariId}`,
      status: 'active',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to create platform listing: ${error.message}`);
  }

  return {
    platform_listing_id: mockMercariId,
    platform_url: `https://mercari.com/item/${mockMercariId}`,
    method: 'browser_extension'
  };
}