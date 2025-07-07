
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
}

const EnhancedStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  badge, 
  className = '' 
}: EnhancedStatsCardProps) => {
  return (
    <Card className={`p-4 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">{title}</div>
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
        
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        
        {subtitle && (
          <div className="text-sm text-gray-600">{subtitle}</div>
        )}
        
        {trend && (
          <div className={`text-xs flex items-center gap-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            <span className="text-gray-500">{trend.label}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EnhancedStatsCard;
