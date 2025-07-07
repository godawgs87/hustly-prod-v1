
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ListingCardBadgesProps {
  category?: string | null;
  condition?: string | null;
  status?: string | null;
  isConsignment?: boolean;
  createdAt: string;
  daysToSell?: number;
}

const ListingCardBadges = ({
  category,
  condition,
  status,
  isConsignment,
  createdAt,
  daysToSell
}: ListingCardBadgesProps) => {
  const getDaysListedBadge = () => {
    const daysListed = daysToSell || 
      Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysListed <= 7) {
      return <Badge variant="default" className="text-xs bg-green-100 text-green-800">New</Badge>;
    } else if (daysListed <= 30) {
      return <Badge variant="secondary" className="text-xs">{daysListed} days</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs text-orange-600">{daysListed} days</Badge>;
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className="text-xs">{category || 'Uncategorized'}</Badge>
      <Badge variant="outline" className="text-xs">{condition || 'N/A'}</Badge>
      {status && (
        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="text-xs">
          {status}
        </Badge>
      )}
      {isConsignment && (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          Consignment
        </Badge>
      )}
      {getDaysListedBadge()}
    </div>
  );
};

export default ListingCardBadges;
