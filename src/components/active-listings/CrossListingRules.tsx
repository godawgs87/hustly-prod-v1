
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Zap, Target, DollarSign } from 'lucide-react';
import type { CrossListingRule } from '@/types/Platform';

interface CrossListingRulesProps {
  rules: CrossListingRule[];
  onCreateRule: () => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

const CrossListingRules = ({
  rules,
  onCreateRule,
  onEditRule,
  onDeleteRule,
  onToggleRule
}: CrossListingRulesProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cross-Listing Rules</h2>
        <Button onClick={onCreateRule} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
          <p className="text-gray-600 mb-4">
            Create rules to automatically list items across multiple platforms based on your criteria.
          </p>
          <Button onClick={onCreateRule}>Create Your First Rule</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <Switch
                    checked={rule.settings.autoList}
                    onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {rule.platforms.map((platform) => (
                    <Badge key={platform} variant="secondary" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  {rule.conditions.category && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span>Categories: {rule.conditions.category.join(', ')}</span>
                    </div>
                  )}
                  {rule.conditions.priceRange && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>
                        Price: ${rule.conditions.priceRange.min} - ${rule.conditions.priceRange.max}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-600">
                    Price Multiplier: {rule.settings.priceMultiplier}x
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditRule(rule.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrossListingRules;
