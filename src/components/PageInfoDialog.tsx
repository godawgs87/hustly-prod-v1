
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface PageInfoDialogProps {
  pageName: string;
}

const PageInfoDialog = ({ pageName }: PageInfoDialogProps) => {
  const getPageInfo = () => {
    switch (pageName) {
      case 'Manage Listings':
        return {
          title: 'Manage Listings',
          description: 'This page shows ALL your listings regardless of status. Use this page to:',
          features: [
            'View and edit all listings (draft, active, sold, archived)',
            'Bulk operations across all statuses',
            'Complete listing management with full editing capabilities',
            'Search and filter across all your inventory',
            'Quick status changes and bulk actions'
          ]
        };
      case 'Active Listings':
        return {
          title: 'Active Listings',
          description: 'This page shows only ACTIVE listings that are currently live and for sale. Use this page to:',
          features: [
            'Monitor your currently active/live listings only',
            'Quick view of what\'s currently available for sale',
            'Focused management of active inventory',
            'Performance tracking of live listings',
            'Streamlined view for day-to-day sales management'
          ]
        };
      case 'Inventory Manager':
        return {
          title: 'Inventory Manager',
          description: 'This page provides comprehensive inventory tracking and analytics. Use this page to:',
          features: [
            'Track inventory value and profitability',
            'Detailed analytics and reporting',
            'Cost basis and profit margin tracking',
            'Advanced filtering and sorting options',
            'Business intelligence and insights'
          ]
        };
      default:
        return {
          title: 'Page Information',
          description: 'Information about this page',
          features: []
        };
    }
  };

  const info = getPageInfo();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription className="text-left">
            <p className="mb-3">{info.description}</p>
            <ul className="space-y-1 text-sm">
              {info.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default PageInfoDialog;
