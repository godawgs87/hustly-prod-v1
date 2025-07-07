import { supabase } from '@/integrations/supabase/client';

export interface EbayConnectionStatus {
  isConnected: boolean;
  isTokenValid: boolean;
  accountUsername?: string;
  expiresAt?: string;
  timeUntilExpiry?: number;
  needsReconnection: boolean;
  issues: string[];
}

export const validateEbayConnection = async (): Promise<EbayConnectionStatus> => {
  const issues: string[] = [];
  
  try {
    // Get eBay account
    const { data: account, error } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('platform', 'ebay')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      issues.push(`Database error: ${error.message}`);
      return {
        isConnected: false,
        isTokenValid: false,
        needsReconnection: true,
        issues
      };
    }

    if (!account) {
      issues.push('No eBay account found');
      return {
        isConnected: false,
        isTokenValid: false,
        needsReconnection: true,
        issues
      };
    }

    if (!account.is_connected) {
      issues.push('Account exists but is marked as disconnected');
      return {
        isConnected: false,
        isTokenValid: false,
        needsReconnection: true,
        issues
      };
    }

    if (!account.oauth_token) {
      issues.push('Account connected but no OAuth token found');
      return {
        isConnected: false,
        isTokenValid: false,
        needsReconnection: true,
        issues
      };
    }

    // Check token expiry
    const expiresAt = account.oauth_expires_at;
    if (!expiresAt) {
      issues.push('Token exists but no expiry date found');
      return {
        isConnected: true,
        isTokenValid: false,
        accountUsername: account.account_username,
        needsReconnection: true,
        issues
      };
    }

    const expiryTime = new Date(expiresAt);
    const now = new Date();
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / 1000 / 60);

    if (timeUntilExpiry <= 0) {
      issues.push(`Token expired ${Math.abs(minutesUntilExpiry)} minutes ago`);
      
      // Auto-mark as disconnected if expired
      await supabase
        .from('marketplace_accounts')
        .update({ is_connected: false, is_active: false })
        .eq('id', account.id);

      return {
        isConnected: false,
        isTokenValid: false,
        accountUsername: account.account_username,
        expiresAt,
        timeUntilExpiry,
        needsReconnection: true,
        issues
      };
    }

    // Warn if expires within 30 minutes
    if (timeUntilExpiry <= 30 * 60 * 1000) {
      issues.push(`Token expires in ${minutesUntilExpiry} minutes`);
    }

    return {
      isConnected: true,
      isTokenValid: true,
      accountUsername: account.account_username,
      expiresAt,
      timeUntilExpiry,
      needsReconnection: false,
      issues
    };

  } catch (error: any) {
    issues.push(`Validation error: ${error.message}`);
    return {
      isConnected: false,
      isTokenValid: false,
      needsReconnection: true,
      issues
    };
  }
};

export const cleanupExpiredEbayConnections = async (): Promise<number> => {
  try {
    const { data: expiredAccounts } = await supabase
      .from('marketplace_accounts')
      .select('id, oauth_expires_at')
      .eq('platform', 'ebay')
      .eq('is_connected', true);

    if (!expiredAccounts) return 0;

    const now = new Date();
    const expiredIds = expiredAccounts
      .filter(acc => acc.oauth_expires_at && new Date(acc.oauth_expires_at) <= now)
      .map(acc => acc.id);

    if (expiredIds.length > 0) {
      await supabase
        .from('marketplace_accounts')
        .update({ is_connected: false, is_active: false })
        .in('id', expiredIds);
    }

    return expiredIds.length;
  } catch (error) {
    console.error('Failed to cleanup expired eBay connections:', error);
    return 0;
  }
};