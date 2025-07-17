
import { supabase } from '@/integrations/supabase/client';

export const cleanupExpiredEbayConnections = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all expired eBay connections for current user
    const { data: expiredConnections } = await supabase
      .from('marketplace_accounts')
      .select('id, oauth_expires_at')
      .eq('user_id', user.id)
      .eq('platform', 'ebay')
      .eq('is_connected', true);

    if (!expiredConnections) return;

    const now = new Date();
    const expiredIds = expiredConnections
      .filter(conn => conn.oauth_expires_at && new Date(conn.oauth_expires_at) <= now)
      .map(conn => conn.id);

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaning up ${expiredIds.length} expired eBay connections`);
      
      const { error } = await supabase
        .from('marketplace_accounts')
        .update({ 
          is_connected: false, 
          is_active: false,
          oauth_token: null,
          refresh_token: null
        })
        .in('id', expiredIds);

      if (error) {
        console.error('❌ Error cleaning up expired connections:', error);
      } else {
        console.log('✅ Expired eBay connections cleaned up');
      }
    }
  } catch (error) {
    console.error('❌ Error in cleanup function:', error);
  }
};

export const forceCleanupEbayConnection = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('🧹 Force cleaning all eBay connections for current user');
    
    const { error } = await supabase
      .from('marketplace_accounts')
      .update({ 
        is_connected: false, 
        is_active: false,
        oauth_token: null,
        refresh_token: null
      })
      .eq('user_id', user.id)
      .eq('platform', 'ebay');

    if (error) {
      console.error('❌ Error force cleaning connections:', error);
    } else {
      console.log('✅ All eBay connections force cleaned');
    }
  } catch (error) {
    console.error('❌ Error in force cleanup:', error);
  }
};
