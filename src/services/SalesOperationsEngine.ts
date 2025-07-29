import { supabase } from '@/integrations/supabase/client';
import { EbayService } from './api/ebayService';

export interface SalesRule {
  id: string;
  name: string;
  type: 'auto_list' | 'auto_delist' | 'price_adjust' | 'offer_response' | 'cross_list';
  conditions: SalesCondition[];
  actions: SalesAction[];
  enabled: boolean;
  priority: number;
  created_at: string;
  last_executed?: string;
  execution_count: number;
}

export interface SalesCondition {
  field: string; // 'days_listed', 'views', 'watchers', 'price_range', 'category', 'season'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface SalesAction {
  type: 'delist' | 'relist' | 'price_drop' | 'send_offer' | 'cross_list' | 'promote';
  parameters: Record<string, any>;
}

export interface ListingPerformance {
  listing_id: string;
  views: number;
  watchers: number;
  days_listed: number;
  price_changes: number;
  offers_received: number;
  conversion_rate: number;
  engagement_score: number;
  last_activity: string;
}

export interface MarketIntelligence {
  category: string;
  average_price: number;
  price_trend: 'up' | 'down' | 'stable';
  demand_level: 'high' | 'medium' | 'low';
  competition_count: number;
  seasonal_factor: number;
  recommended_actions: string[];
}

export class SalesOperationsEngine {
  private static instance: SalesOperationsEngine;
  private rules: SalesRule[] = [];
  private isRunning = false;

  static getInstance(): SalesOperationsEngine {
    if (!SalesOperationsEngine.instance) {
      SalesOperationsEngine.instance = new SalesOperationsEngine();
    }
    return SalesOperationsEngine.instance;
  }

  // ==================== RULE MANAGEMENT ====================

  async loadRules(): Promise<SalesRule[]> {
    try {
      // For now, return mock rules until database migration is applied
      const mockRules: SalesRule[] = [
        {
          id: '1',
          name: 'Auto-Delist Stale Listings',
          type: 'auto_delist',
          conditions: [
            { field: 'days_listed', operator: 'gt', value: 30 },
            { field: 'views', operator: 'lt', value: 10, logic: 'AND' }
          ],
          actions: [
            { type: 'delist', parameters: { reason: 'low_engagement' } }
          ],
          enabled: true,
          priority: 1,
          created_at: new Date().toISOString(),
          execution_count: 0
        }
      ];
      
      this.rules = mockRules;
      console.log('📋 Loaded', this.rules.length, 'active sales rules (mock data)');
      return this.rules;
    } catch (error) {
      console.error('❌ Failed to load sales rules:', error);
      return [];
    }
  }

  async createRule(rule: Omit<SalesRule, 'id' | 'created_at' | 'execution_count'>): Promise<SalesRule> {
    try {
      const { data, error } = await supabase
        .from('sales_automation_rules')
        .insert({
          ...rule,
          execution_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      await this.loadRules(); // Refresh rules
      console.log('✅ Created sales rule:', rule.name);
      return data;
    } catch (error) {
      console.error('❌ Failed to create sales rule:', error);
      throw error;
    }
  }

  async updateRule(id: string, updates: Partial<SalesRule>): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales_automation_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await this.loadRules(); // Refresh rules
      console.log('✅ Updated sales rule:', id);
    } catch (error) {
      console.error('❌ Failed to update sales rule:', error);
      throw error;
    }
  }

  // ==================== AUTOMATION ENGINE ====================

  async startAutomation(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Sales automation already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting sales operations automation...');

    // Load rules
    await this.loadRules();

    // Run automation cycle every 15 minutes
    const automationInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(automationInterval);
        return;
      }

      try {
        await this.runAutomationCycle();
      } catch (error) {
        console.error('❌ Error in automation cycle:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Run initial cycle
    await this.runAutomationCycle();
  }

  async stopAutomation(): Promise<void> {
    this.isRunning = false;
    console.log('⏹️ Stopped sales operations automation');
  }

  private async runAutomationCycle(): Promise<void> {
    console.log('🔄 Running sales automation cycle...');

    // Get all active listings
    const listings = await this.getActiveListings();
    console.log('📊 Processing', listings.length, 'active listings');

    // Get performance data for all listings
    const performanceData = await this.getListingPerformance(listings.map(l => l.id));

    // Process each rule
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const applicableListings = listings.filter(listing => 
          this.evaluateConditions(listing, performanceData.find(p => p.listing_id === listing.id), rule.conditions)
        );

        if (applicableListings.length > 0) {
          console.log(`🎯 Rule "${rule.name}" applies to ${applicableListings.length} listings`);
          
          for (const listing of applicableListings) {
            await this.executeActions(listing, rule.actions);
          }

          // Update rule execution count
          await this.updateRuleExecution(rule.id);
        }
      } catch (error) {
        console.error(`❌ Error executing rule "${rule.name}":`, error);
      }
    }

    console.log('✅ Automation cycle completed');
  }

  // ==================== CONDITION EVALUATION ====================

  private evaluateConditions(
    listing: any, 
    performance: ListingPerformance | undefined, 
    conditions: SalesCondition[]
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(listing, performance, condition);
      
      if (currentLogic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogic = condition.logic || 'AND';
    }

    return result;
  }

  private evaluateCondition(
    listing: any, 
    performance: ListingPerformance | undefined, 
    condition: SalesCondition
  ): boolean {
    let fieldValue: any;

    // Get field value from listing or performance data
    switch (condition.field) {
      case 'days_listed':
        fieldValue = performance?.days_listed || 0;
        break;
      case 'views':
        fieldValue = performance?.views || 0;
        break;
      case 'watchers':
        fieldValue = performance?.watchers || 0;
        break;
      case 'price':
        fieldValue = listing.price || 0;
        break;
      case 'category':
        fieldValue = listing.category;
        break;
      case 'engagement_score':
        fieldValue = performance?.engagement_score || 0;
        break;
      default:
        fieldValue = listing[condition.field];
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'gt': return fieldValue > condition.value;
      case 'gte': return fieldValue >= condition.value;
      case 'lt': return fieldValue < condition.value;
      case 'lte': return fieldValue <= condition.value;
      case 'eq': return fieldValue === condition.value;
      case 'contains': return String(fieldValue).includes(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default: return false;
    }
  }

  // ==================== ACTION EXECUTION ====================

  private async executeActions(listing: any, actions: SalesAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(listing, action);
      } catch (error) {
        console.error(`❌ Failed to execute action ${action.type} for listing ${listing.id}:`, error);
      }
    }
  }

  private async executeAction(listing: any, action: SalesAction): Promise<void> {
    console.log(`🎬 Executing ${action.type} for listing ${listing.id}`);

    switch (action.type) {
      case 'delist':
        await this.delistItem(listing);
        break;
      case 'relist':
        await this.relistItem(listing);
        break;
      case 'price_drop':
        await this.adjustPrice(listing, action.parameters);
        break;
      case 'send_offer':
        await this.sendAutomaticOffer(listing, action.parameters);
        break;
      case 'cross_list':
        await this.crossListItem(listing, action.parameters);
        break;
      case 'promote':
        await this.promoteItem(listing, action.parameters);
        break;
    }

    // Log action execution
    await this.logActionExecution(listing.id, action);
  }

  // ==================== SPECIFIC ACTIONS ====================

  private async delistItem(listing: any): Promise<void> {
    // Implementation for delisting item
    console.log('📤 Delisting item:', listing.title);
    // Call eBay API to end listing
    // Update local database
  }

  private async relistItem(listing: any): Promise<void> {
    // Implementation for relisting item
    console.log('🔄 Relisting item:', listing.title);
    // Create new listing with updated data
  }

  private async adjustPrice(listing: any, parameters: any): Promise<void> {
    const { adjustment_type, amount } = parameters;
    let newPrice = listing.price;

    if (adjustment_type === 'percentage') {
      newPrice = listing.price * (1 - amount / 100);
    } else if (adjustment_type === 'fixed') {
      newPrice = listing.price - amount;
    }

    console.log(`💰 Adjusting price from $${listing.price} to $${newPrice.toFixed(2)}`);
    // Call eBay API to update price
  }

  private async sendAutomaticOffer(listing: any, parameters: any): Promise<void> {
    const { discount_percentage, message } = parameters;
    const offerPrice = listing.price * (1 - discount_percentage / 100);
    
    console.log(`📧 Sending automatic offer: $${offerPrice.toFixed(2)} (${discount_percentage}% off)`);
    // Send offer to interested buyers
  }

  private async crossListItem(listing: any, parameters: any): Promise<void> {
    const { target_platforms } = parameters;
    console.log(`🔗 Cross-listing to platforms:`, target_platforms);
    // List item on additional platforms
  }

  private async promoteItem(listing: any, parameters: any): Promise<void> {
    const { promotion_type } = parameters;
    console.log(`📢 Promoting item with ${promotion_type}`);
    // Apply promotional features
  }

  // ==================== DATA RETRIEVAL ====================

  private async getActiveListings(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('status', 'listed')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get active listings:', error);
      return [];
    }
  }

  private async getListingPerformance(listingIds: string[]): Promise<ListingPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('listing_performance')
        .select('*')
        .in('listing_id', listingIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get listing performance:', error);
      return [];
    }
  }

  private async updateRuleExecution(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales_automation_rules')
        .update({
          last_executed: new Date().toISOString(),
          execution_count: supabase.sql`execution_count + 1`
        })
        .eq('id', ruleId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to update rule execution:', error);
    }
  }

  private async logActionExecution(listingId: string, action: SalesAction): Promise<void> {
    try {
      await supabase
        .from('sales_action_log')
        .insert({
          listing_id: listingId,
          action_type: action.type,
          parameters: action.parameters,
          executed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Failed to log action execution:', error);
    }
  }

  // ==================== MARKET INTELLIGENCE ====================

  async getMarketIntelligence(category: string): Promise<MarketIntelligence> {
    try {
      // This would integrate with eBay's market data APIs
      const marketData = await EbayService.getMarketData(category);
      
      return {
        category,
        average_price: marketData.averagePrice,
        price_trend: marketData.trend,
        demand_level: marketData.demandLevel,
        competition_count: marketData.competitorCount,
        seasonal_factor: marketData.seasonalFactor,
        recommended_actions: marketData.recommendations
      };
    } catch (error) {
      console.error('❌ Failed to get market intelligence:', error);
      throw error;
    }
  }
}

export default SalesOperationsEngine;
