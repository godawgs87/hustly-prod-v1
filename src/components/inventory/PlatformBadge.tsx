import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PlatformConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  ebay: {
    label: 'eBay',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '🛒'
  },
  poshmark: {
    label: 'Poshmark',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    icon: '👗'
  },
  mercari: {
    label: 'Mercari',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '📦'
  },
  depop: {
    label: 'Depop',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '🎨'
  },
  facebook: {
    label: 'Facebook',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: '📘'
  },
  whatnot: {
    label: 'Whatnot',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '🎥'
  },
  manual: {
    label: 'Manual',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '✏️'
  }
};

interface PlatformBadgeProps {
  platform?: string;
  showIcon?: boolean;
  className?: string;
}

const PlatformBadge: React.FC<PlatformBadgeProps> = ({ 
  platform, 
  showIcon = true,
  className = '' 
}) => {
  // Default to manual if no platform specified
  const platformKey = platform?.toLowerCase() || 'manual';
  const config = PLATFORM_CONFIGS[platformKey] || PLATFORM_CONFIGS.manual;

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor} ${className}`}
    >
      {showIcon && config.icon && (
        <span className="mr-1">{config.icon}</span>
      )}
      {config.label}
    </span>
  );
};

export default PlatformBadge;
