import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ListingData } from '@/types/CreateListing';

interface ValidationRule {
  id: string;
  category: 'required' | 'recommended' | 'warning' | 'info';
  field: string;
  name: string;
  description: string;
  validate: (data: ListingData) => ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestions?: string[];
  severity: 'error' | 'warning' | 'info' | 'success';
}

interface ValidationSummary {
  isValid: boolean;
  score: number;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  recommendations: ValidationResult[];
  completedRules: number;
  totalRules: number;
}

interface EnhancedValidationSystemProps {
  data: ListingData;
  onChange?: (field: string, value: any) => void;
  onValidationChange?: (summary: ValidationSummary) => void;
  mode?: 'full' | 'compact';
  autoValidate?: boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  // Required Fields
  {
    id: 'title-required',
    category: 'required',
    field: 'title',
    name: 'Title Required',
    description: 'Every listing must have a descriptive title',
    validate: (data) => ({
      isValid: !!data.title && data.title.trim().length > 0,
      message: data.title ? 'Title is present' : 'Title is required',
      severity: data.title ? 'success' : 'error'
    })
  },
  {
    id: 'title-length',
    category: 'recommended',
    field: 'title',
    name: 'Title Length',
    description: 'eBay titles should be between 20-80 characters for best visibility',
    validate: (data) => {
      const length = data.title?.length || 0;
      if (length === 0) return { isValid: false, message: 'No title provided', severity: 'error' as const };
      if (length < 20) return { 
        isValid: false, 
        message: `Title too short (${length}/20 min)`, 
        suggestions: ['Add more descriptive keywords', 'Include brand and model', 'Mention key features'],
        severity: 'warning' as const 
      };
      if (length > 80) return { 
        isValid: false, 
        message: `Title too long (${length}/80 max)`, 
        suggestions: ['Remove unnecessary words', 'Use abbreviations', 'Focus on key selling points'],
        severity: 'warning' as const 
      };
      return { isValid: true, message: `Good title length (${length} characters)`, severity: 'success' as const };
    }
  },
  {
    id: 'price-required',
    category: 'required',
    field: 'price',
    name: 'Price Required',
    description: 'Every listing must have a selling price',
    validate: (data) => ({
      isValid: !!data.price && data.price > 0,
      message: data.price > 0 ? `Price set: $${data.price}` : 'Price is required',
      severity: data.price > 0 ? 'success' : 'error'
    })
  },
  {
    id: 'category-required',
    category: 'required',
    field: 'category',
    name: 'Category Required',
    description: 'Items must be assigned to an eBay category',
    validate: (data) => ({
      isValid: !!data.ebay_category_id,
      message: data.ebay_category_id ? 'Category selected' : 'eBay category is required',
      severity: data.ebay_category_id ? 'success' : 'error'
    })
  },
  {
    id: 'photos-required',
    category: 'required',
    field: 'photos',
    name: 'Photos Required',
    description: 'At least one photo is required for listings',
    validate: (data) => {
      const photoCount = data.photos?.length || 0;
      return {
        isValid: photoCount > 0,
        message: photoCount > 0 ? `${photoCount} photo(s) added` : 'At least 1 photo required',
        severity: photoCount > 0 ? 'success' : 'error'
      };
    }
  },
  {
    id: 'description-recommended',
    category: 'recommended',
    field: 'description',
    name: 'Description',
    description: 'Detailed descriptions improve buyer confidence',
    validate: (data) => {
      const length = data.description?.length || 0;
      if (length === 0) return { 
        isValid: false, 
        message: 'No description provided', 
        suggestions: ['Add item condition details', 'Mention key features', 'Include measurements'],
        severity: 'warning' as const 
      };
      if (length < 50) return { 
        isValid: false, 
        message: `Description too brief (${length} characters)`, 
        suggestions: ['Add more details about condition', 'Include material/brand info', 'Mention any flaws'],
        severity: 'warning' as const 
      };
      return { isValid: true, message: `Good description (${length} characters)`, severity: 'success' as const };
    }
  },
  {
    id: 'condition-recommended',
    category: 'recommended',
    field: 'condition',
    name: 'Condition',
    description: 'Condition helps buyers understand item quality',
    validate: (data) => ({
      isValid: !!data.condition,
      message: data.condition ? `Condition: ${data.condition}` : 'Consider adding condition info',
      suggestions: !data.condition ? ['Select from: New, Like New, Excellent, Good, Fair'] : undefined,
      severity: data.condition ? 'success' : 'warning'
    })
  },
  {
    id: 'brand-recommended',
    category: 'recommended',
    field: 'brand',
    name: 'Brand',
    description: 'Brand information helps with searchability',
    validate: (data) => {
      const brand = (data as any).brand;
      return {
        isValid: !!brand,
        message: brand ? `Brand: ${brand}` : 'Consider adding brand info',
        severity: brand ? 'success' : 'info'
      };
    }
  },
  {
    id: 'measurements-recommended',
    category: 'recommended',
    field: 'measurements',
    name: 'Measurements',
    description: 'Measurements reduce returns and increase buyer confidence',
    validate: (data) => {
      const hasMeasurements = data.measurements && Object.keys(data.measurements).length > 0;
      return {
        isValid: hasMeasurements,
        message: hasMeasurements ? 'Measurements included' : 'Consider adding measurements',
        suggestions: !hasMeasurements ? ['Add length, width, height', 'Include weight if applicable'] : undefined,
        severity: hasMeasurements ? 'success' : 'info'
      };
    }
  },
  {
    id: 'shipping-cost',
    category: 'warning',
    field: 'shipping_cost',
    name: 'Shipping Cost',
    description: 'High shipping costs can deter buyers',
    validate: (data) => {
      const shipping = (data as any).shipping_cost || 0;
      const price = data.price || 0;
      const ratio = price > 0 ? shipping / price : 0;
      
      if (ratio > 0.3) return {
        isValid: false,
        message: `Shipping cost is ${Math.round(ratio * 100)}% of item price`,
        suggestions: ['Consider free shipping with higher item price', 'Use calculated shipping', 'Review packaging efficiency'],
        severity: 'warning' as const
      };
      
      return {
        isValid: true,
        message: shipping > 0 ? `Shipping: $${shipping}` : 'Free shipping',
        severity: 'success' as const
      };
    }
  }
];

const EnhancedValidationSystem = ({ 
  data, 
  onChange, 
  onValidationChange, 
  mode = 'full',
  autoValidate = true 
}: EnhancedValidationSystemProps) => {
  const [validationResults, setValidationResults] = useState<{ [key: string]: ValidationResult }>({});
  const [summary, setSummary] = useState<ValidationSummary>({
    isValid: false,
    score: 0,
    errors: [],
    warnings: [],
    recommendations: [],
    completedRules: 0,
    totalRules: VALIDATION_RULES.length
  });
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    required: true,
    recommended: false,
    warning: false
  });
  const { toast } = useToast();

  // Run validation when data changes
  useEffect(() => {
    if (autoValidate) {
      validateAll();
    }
  }, [data, autoValidate]);

  const validateAll = () => {
    const results: { [key: string]: ValidationResult } = {};
    
    VALIDATION_RULES.forEach(rule => {
      results[rule.id] = rule.validate(data);
    });
    
    setValidationResults(results);
    
    // Calculate summary
    const errors = Object.values(results).filter(r => r.severity === 'error');
    const warnings = Object.values(results).filter(r => r.severity === 'warning');
    const recommendations = Object.values(results).filter(r => r.severity === 'info');
    const completed = Object.values(results).filter(r => r.isValid).length;
    
    const newSummary: ValidationSummary = {
      isValid: errors.length === 0,
      score: Math.round((completed / VALIDATION_RULES.length) * 100),
      errors,
      warnings,
      recommendations,
      completedRules: completed,
      totalRules: VALIDATION_RULES.length
    };
    
    setSummary(newSummary);
    
    if (onValidationChange) {
      onValidationChange(newSummary);
    }
  };

  const getSeverityIcon = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'info': return 'border-blue-200 bg-blue-50';
    }
  };

  const getCategoryRules = (category: ValidationRule['category']) => {
    return VALIDATION_RULES.filter(rule => rule.category === category);
  };

  const getCategoryStatus = (category: ValidationRule['category']) => {
    const rules = getCategoryRules(category);
    const results = rules.map(rule => validationResults[rule.id]).filter(Boolean);
    const passed = results.filter(r => r.isValid).length;
    
    return {
      passed,
      total: rules.length,
      hasErrors: results.some(r => r.severity === 'error'),
      hasWarnings: results.some(r => r.severity === 'warning')
    };
  };

  if (mode === 'compact') {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">{summary.score}%</span>
                </div>
              </div>
              <div>
                <div className="font-medium">
                  Validation Score: {summary.completedRules}/{summary.totalRules}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summary.errors.length > 0 && `${summary.errors.length} errors, `}
                  {summary.warnings.length > 0 && `${summary.warnings.length} warnings`}
                </div>
              </div>
            </div>
            <Badge variant={summary.isValid ? "default" : "destructive"}>
              {summary.isValid ? 'Ready' : 'Issues Found'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Listing Validation</span>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">{summary.score}%</div>
            <Badge variant={summary.isValid ? "default" : "destructive"}>
              {summary.completedRules}/{summary.totalRules}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Fields */}
        <Collapsible 
          open={expandedCategories.required} 
          onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, required: open }))}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium">Required Fields</span>
                {(() => {
                  const status = getCategoryStatus('required');
                  return (
                    <Badge variant={status.hasErrors ? "destructive" : "default"}>
                      {status.passed}/{status.total}
                    </Badge>
                  );
                })()}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {getCategoryRules('required').map(rule => {
              const result = validationResults[rule.id];
              if (!result) return null;
              
              return (
                <div key={rule.id} className={`p-3 rounded-lg border ${getSeverityColor(result.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(result.severity)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                      {result.suggestions && (
                        <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                          {result.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Recommended Fields */}
        <Collapsible 
          open={expandedCategories.recommended} 
          onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, recommended: open }))}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium">Recommended</span>
                {(() => {
                  const status = getCategoryStatus('recommended');
                  return (
                    <Badge variant="secondary">
                      {status.passed}/{status.total}
                    </Badge>
                  );
                })()}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {getCategoryRules('recommended').map(rule => {
              const result = validationResults[rule.id];
              if (!result) return null;
              
              return (
                <div key={rule.id} className={`p-3 rounded-lg border ${getSeverityColor(result.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(result.severity)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                      {result.suggestions && (
                        <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                          {result.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <Collapsible 
            open={expandedCategories.warning} 
            onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, warning: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Warnings</span>
                  <Badge variant="secondary">
                    {getCategoryStatus('warning').total}
                  </Badge>
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {getCategoryRules('warning').map(rule => {
                const result = validationResults[rule.id];
                if (!result || result.isValid) return null;
                
                return (
                  <div key={rule.id} className={`p-3 rounded-lg border ${getSeverityColor(result.severity)}`}>
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(result.severity)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                        {result.suggestions && (
                          <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                            {result.suggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Button 
          onClick={validateAll}
          variant="outline" 
          className="w-full"
        >
          <Loader2 className="h-4 w-4 mr-2" />
          Re-validate
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedValidationSystem;