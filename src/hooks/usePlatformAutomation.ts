import { useState, useEffect, useCallback } from 'react';
import { PlatformAutomationService, type AutomationRule, type PlatformPromotion } from '@/services/PlatformAutomationService';
import { useToast } from '@/hooks/use-toast';

export interface UsePlatformAutomationReturn {
  automationRules: AutomationRule[];
  activePromotions: PlatformPromotion[];
  isLoading: boolean;
  error: string | null;
  createAutomationRule: (rule: Omit<AutomationRule, 'id'>) => Promise<void>;
  createMercariPromotion: (listingId: string, type: 'price_drop' | 'boost' | 'featured') => Promise<void>;
  schedulePoshmarkSharing: (listingId: string, schedule: string[]) => Promise<void>;
  scheduleEbayAuctionUpgrade: (listingId: string, conditions: { daysSinceListed: number; viewThreshold: number }) => Promise<void>;
  createSmartRelistRule: (listingId: string, platform: string, strategy: 'aggressive' | 'moderate' | 'conservative') => Promise<void>;
  implementDynamicPricing: (listingId: string, strategy: any) => Promise<void>;
  cancelPromotion: (promotionId: string) => Promise<void>;
  toggleAutomationRule: (ruleId: string) => Promise<void>;
}

export function usePlatformAutomation(): UsePlatformAutomationReturn {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [activePromotions, setActivePromotions] = useState<PlatformPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Subscribe to real-time automation updates
  useEffect(() => {
    const unsubscribe = PlatformAutomationService.subscribeToAutomationUpdates((update) => {
      // Handle real-time updates to automation rules
      console.log('Automation update:', update);
      
      if (update.eventType === 'INSERT') {
        toast({
          title: 'Automation Rule Created',
          description: `New ${update.new.ruleType} rule activated for ${update.new.platform}`,
        });
      } else if (update.eventType === 'UPDATE') {
        toast({
          title: 'Automation Rule Updated',
          description: `Rule status changed to ${update.new.isActive ? 'active' : 'inactive'}`,
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  const createAutomationRule = useCallback(async (rule: Omit<AutomationRule, 'id'>) => {
    try {
      setIsLoading(true);
      setError(null);

      const newRule = await PlatformAutomationService.createAutomationRule(rule);
      
      setAutomationRules(prev => [...prev, newRule]);

      toast({
        title: 'Automation Rule Created',
        description: `${rule.ruleType} rule created for ${rule.platform}`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create automation rule';
      setError(errorMessage);
      toast({
        title: 'Rule Creation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createMercariPromotion = useCallback(async (listingId: string, type: 'price_drop' | 'boost' | 'featured') => {
    try {
      setIsLoading(true);
      const promotion = await PlatformAutomationService.createMercariPromotion(listingId, type);
      
      setActivePromotions(prev => [...prev, promotion]);

      toast({
        title: 'Mercari Promotion Created',
        description: `${type.replace('_', ' ')} promotion activated`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create Mercari promotion';
      setError(errorMessage);
      toast({
        title: 'Promotion Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const schedulePoshmarkSharing = useCallback(async (listingId: string, schedule: string[]) => {
    try {
      setIsLoading(true);
      await PlatformAutomationService.schedulePoshmarkSharing(listingId, schedule);

      toast({
        title: 'Poshmark Sharing Scheduled',
        description: `Auto-sharing scheduled for ${schedule.length} time slots`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to schedule Poshmark sharing';
      setError(errorMessage);
      toast({
        title: 'Scheduling Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const scheduleEbayAuctionUpgrade = useCallback(async (listingId: string, conditions: { daysSinceListed: number; viewThreshold: number }) => {
    try {
      setIsLoading(true);
      await PlatformAutomationService.scheduleEbayAuctionUpgrade(listingId, conditions);

      toast({
        title: 'eBay Auction Upgrade Scheduled',
        description: `Will upgrade to auction after ${conditions.daysSinceListed} days if views < ${conditions.viewThreshold}`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to schedule eBay auction upgrade';
      setError(errorMessage);
      toast({
        title: 'Scheduling Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createSmartRelistRule = useCallback(async (listingId: string, platform: string, strategy: 'aggressive' | 'moderate' | 'conservative') => {
    try {
      setIsLoading(true);
      const rule = await PlatformAutomationService.createSmartRelistRule(listingId, platform, strategy);
      
      setAutomationRules(prev => [...prev, rule]);

      toast({
        title: 'Smart Relist Rule Created',
        description: `${strategy} relist strategy activated for ${platform}`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create relist rule';
      setError(errorMessage);
      toast({
        title: 'Rule Creation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const implementDynamicPricing = useCallback(async (listingId: string, strategy: any) => {
    try {
      setIsLoading(true);
      await PlatformAutomationService.implementDynamicPricing(listingId, strategy);

      toast({
        title: 'Dynamic Pricing Activated',
        description: `Price drops scheduled over ${strategy.priceDropSchedule.length} intervals`,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to implement dynamic pricing';
      setError(errorMessage);
      toast({
        title: 'Pricing Setup Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const cancelPromotion = useCallback(async (promotionId: string) => {
    try {
      setIsLoading(true);
      await PlatformAutomationService.cancelPromotion(promotionId);
      
      setActivePromotions(prev => prev.filter(p => p.id !== promotionId));

      toast({
        title: 'Promotion Cancelled',
        description: 'Promotion has been successfully cancelled',
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to cancel promotion';
      setError(errorMessage);
      toast({
        title: 'Cancellation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const toggleAutomationRule = useCallback(async (ruleId: string) => {
    try {
      setIsLoading(true);
      
      setAutomationRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      ));

      toast({
        title: 'Rule Updated',
        description: 'Automation rule status changed',
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to toggle automation rule';
      setError(errorMessage);
      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    automationRules,
    activePromotions,
    isLoading,
    error,
    createAutomationRule,
    createMercariPromotion,
    schedulePoshmarkSharing,
    scheduleEbayAuctionUpgrade,
    createSmartRelistRule,
    implementDynamicPricing,
    cancelPromotion,
    toggleAutomationRule
  };
}