import { supabase } from '@/integrations/supabase/client';

// Types for Sales Operations
export interface SalesRule {
  id: string;
  name: string;
  type: 'auto_delist' | 'auto_relist' | 'price_adjust' | 'auto_offer' | 'cross_list' | 'promote';
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  priority: number;
  created_at: string;
  execution_count: number;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'delist' | 'relist' | 'adjust_price' | 'send_offer' | 'cross_list' | 'promote';
  parameters: Record<string, any>;
}

/**
 * Simplified Sales Operations Engine for Enterprise Automation
 */
export class SalesOperationsEngine {
  private static instance: SalesOperationsEngine;
  private rules: SalesRule[] = [];
  private isRunning = false;
  private automationInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SalesOperationsEngine {
    if (!SalesOperationsEngine.instance) {
      SalesOperationsEngine.instance = new SalesOperationsEngine();
    }
    return SalesOperationsEngine.instance;
  }

  async loadRules(): Promise<SalesRule[]> {
    // Mock enterprise automation rules
    const mockRules: SalesRule[] = [
      {
        id: '1',
        name: 'Auto-Delist Stale Listings',
        type: 'auto_delist',
        conditions: [
          { field: 'days_listed', operator: 'gt', value: 30 },
          { field: 'views', operator: 'lt', value: 10, logic: 'AND' }
        ],
        actions: [{ type: 'delist', parameters: { reason: 'low_engagement' } }],
        enabled: true,
        priority: 1,
        created_at: new Date().toISOString(),
        execution_count: 0
      },
      {
        id: '2',
        name: 'Price Drop for High-View Items',
        type: 'price_adjust',
        conditions: [
          { field: 'views', operator: 'gt', value: 50 },
          { field: 'days_listed', operator: 'gt', value: 14, logic: 'AND' }
        ],
        actions: [{ type: 'adjust_price', parameters: { type: 'percentage', value: -10 } }],
        enabled: true,
        priority: 2,
        created_at: new Date().toISOString(),
        execution_count: 0
      }
    ];
    
    this.rules = mockRules;
    console.log('📋 Loaded', this.rules.length, 'enterprise automation rules');
    return this.rules;
  }

  async createRule(rule: Omit<SalesRule, 'id' | 'created_at' | 'execution_count'>): Promise<SalesRule> {
    const newRule: SalesRule = {
      ...rule,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      execution_count: 0
    };

    this.rules.push(newRule);
    console.log('✅ Created new sales rule:', newRule.name);
    return newRule;
  }

  async updateRule(ruleId: string, updates: Partial<SalesRule>): Promise<SalesRule> {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) throw new Error('Rule not found');

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return this.rules[ruleIndex];
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  async startAutomation(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 Starting enterprise sales automation...');
    this.isRunning = true;
    await this.loadRules();
    
    this.automationInterval = setInterval(async () => {
      await this.runAutomationCycle();
    }, 30 * 60 * 1000);
    
    await this.runAutomationCycle();
  }

  async stopAutomation(): Promise<void> {
    this.isRunning = false;
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
      this.automationInterval = null;
    }
  }

  private async runAutomationCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active');

      if (!listings?.length) return;

      console.log(`🔄 Processing ${listings.length} listings with ${this.rules.length} rules`);

      for (const rule of this.rules.filter(r => r.enabled)) {
        const matchingListings = listings.filter(listing => 
          this.evaluateConditions(listing, rule.conditions)
        );

        for (const listing of matchingListings) {
          await this.executeActions(listing, rule.actions);
        }
        
        rule.execution_count++;
      }
    } catch (error) {
      console.error('❌ Automation cycle error:', error);
    }
  }

  private evaluateConditions(listing: any, conditions: RuleCondition[]): boolean {
    if (!conditions.length) return true;

    let result = true;
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(listing, condition.field);
      const conditionResult = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (condition.logic === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }
    return result;
  }

  private getFieldValue(listing: any, field: string): any {
    switch (field) {
      case 'days_listed':
        return Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24));
      case 'views':
        return listing.view_count || 0;
      case 'watchers':
        return listing.watcher_count || 0;
      default:
        return listing[field];
    }
  }

  private evaluateCondition(fieldValue: any, operator: string, targetValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === targetValue;
      case 'gt': return fieldValue > targetValue;
      case 'lt': return fieldValue < targetValue;
      case 'gte': return fieldValue >= targetValue;
      case 'lte': return fieldValue <= targetValue;
      default: return false;
    }
  }

  private async executeActions(listing: any, actions: RuleAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'delist':
            await supabase
              .from('listings')
              .update({ status: 'delisted', delisted_at: new Date().toISOString() })
              .eq('id', listing.id);
            console.log(`📤 Delisted: ${listing.title}`);
            break;
          case 'adjust_price':
            const newPrice = action.parameters.type === 'percentage' 
              ? listing.price * (1 + action.parameters.value / 100)
              : action.parameters.value;
            await supabase
              .from('listings')
              .update({ price: newPrice })
              .eq('id', listing.id);
            console.log(`💰 Price adjusted: ${listing.title} -> $${newPrice}`);
            break;
        }
      } catch (error) {
        console.error(`❌ Action failed for ${listing.id}:`, error);
      }
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const { data: listings } = await supabase.from('listings').select('*');
      
      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter(l => l.status === 'active').length || 0;
      const soldListings = listings?.filter(l => l.status === 'sold').length || 0;

      return {
        totalListings,
        activeListings,
        soldListings,
        conversionRate: totalListings > 0 ? (soldListings / totalListings) * 100 : 0,
        totalAutomationRules: this.rules.length,
        activeRules: this.rules.filter(r => r.enabled).length,
        automationRunning: this.isRunning
      };
    } catch (error) {
      return {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        conversionRate: 0,
        totalAutomationRules: 0,
        activeRules: 0,
        automationRunning: false
      };
    }
  }

  getRules(): SalesRule[] {
    return this.rules;
  }

  isAutomationRunning(): boolean {
    return this.isRunning;
  }
}
