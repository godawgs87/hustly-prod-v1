import { supabase } from '@/integrations/supabase/client';

/**
 * eBay Token Refresh Utility
 * Automatically refreshes eBay tokens before they expire
 * eBay tokens last 2 hours, refresh tokens last 18 months
 */

interface TokenRefreshResult {
  success: boolean;
  error?: string;
  newExpiresAt?: string;
}

export class EbayTokenRefreshManager {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isRefreshing = false;

  /**
   * Initialize the token refresh manager
   * Checks token expiry and sets up auto-refresh
   */
  static async initialize() {
    console.log('🔄 [TokenRefresh] Initializing eBay token refresh manager');
    
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Check current token status
    const account = await this.getEbayAccount();
    if (!account) {
      console.log('⚠️ [TokenRefresh] No eBay account found');
      return;
    }

    // Schedule refresh if needed
    await this.scheduleRefreshIfNeeded(account);
  }

  /**
   * Get the current eBay account
   */
  private static async getEbayAccount() {
    try {
      const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_active', true)
        .eq('is_connected', true)
        .maybeSingle();

      return data;
    } catch (error) {
      console.error('❌ [TokenRefresh] Error fetching eBay account:', error);
      return null;
    }
  }

  /**
   * Schedule a token refresh if needed
   */
  private static async scheduleRefreshIfNeeded(account: any) {
    if (!account.oauth_expires_at || !account.refresh_token) {
      console.log('⚠️ [TokenRefresh] Missing token expiry or refresh token');
      return;
    }

    const expiresAt = new Date(account.oauth_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Refresh 5 minutes before expiry
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const timeUntilRefresh = timeUntilExpiry - refreshBuffer;

    console.log('📅 [TokenRefresh] Token expires at:', expiresAt.toISOString());
    console.log('⏱️ [TokenRefresh] Time until expiry:', Math.round(timeUntilExpiry / 1000 / 60), 'minutes');

    if (timeUntilRefresh <= 0) {
      // Token expired or about to expire, refresh immediately
      console.log('🚨 [TokenRefresh] Token expired or expiring soon, refreshing immediately');
      await this.refreshToken(account);
    } else if (timeUntilRefresh < 24 * 60 * 60 * 1000) {
      // Less than 24 hours until refresh needed, schedule it
      console.log('⏰ [TokenRefresh] Scheduling refresh in', Math.round(timeUntilRefresh / 1000 / 60), 'minutes');
      
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken(account);
      }, timeUntilRefresh);
    } else {
      console.log('✅ [TokenRefresh] Token valid for more than 24 hours, no refresh needed');
    }
  }

  /**
   * Refresh the eBay token
   */
  static async refreshToken(account?: any): Promise<TokenRefreshResult> {
    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      console.log('⚠️ [TokenRefresh] Already refreshing, skipping');
      return { success: false, error: 'Refresh already in progress' };
    }

    this.isRefreshing = true;

    try {
      // Get account if not provided
      if (!account) {
        account = await this.getEbayAccount();
        if (!account) {
          throw new Error('No eBay account found');
        }
      }

      if (!account.refresh_token) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 [TokenRefresh] Refreshing eBay token...');

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      // Call the refresh endpoint
      const { data, error } = await supabase.functions.invoke('ebay-token-refresh', {
        body: { 
          refresh_token: account.refresh_token,
          account_id: account.id
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error('Token refresh returned unexpected response');
      }

      console.log('✅ [TokenRefresh] Token refreshed successfully');
      
      // Schedule next refresh
      const newAccount = await this.getEbayAccount();
      if (newAccount) {
        await this.scheduleRefreshIfNeeded(newAccount);
      }

      return {
        success: true,
        newExpiresAt: data.expires_at
      };

    } catch (error: any) {
      console.error('❌ [TokenRefresh] Token refresh failed:', error);
      
      // If refresh fails, clear the timer and mark account as disconnected
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Update account status if refresh fails due to invalid token
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid refresh token')) {
        console.log('🔒 [TokenRefresh] Refresh token invalid, disconnecting account');
        
        if (account?.id) {
          await supabase
            .from('marketplace_accounts')
            .update({
              is_connected: false,
              is_active: false,
              oauth_token: null,
              refresh_token: null
            })
            .eq('id', account.id);
        }
      }

      return {
        success: false,
        error: error.message
      };

    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually trigger a token refresh
   */
  static async forceRefresh(): Promise<TokenRefreshResult> {
    console.log('🔄 [TokenRefresh] Force refresh requested');
    return await this.refreshToken();
  }

  /**
   * Clean up the refresh manager
   */
  static cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure auth is ready
  setTimeout(() => {
    EbayTokenRefreshManager.initialize();
  }, 2000);

  // Re-initialize on visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      EbayTokenRefreshManager.initialize();
    }
  });

  // Re-initialize on auth state change
  supabase.auth.onAuthStateChange(() => {
    EbayTokenRefreshManager.initialize();
  });
}
