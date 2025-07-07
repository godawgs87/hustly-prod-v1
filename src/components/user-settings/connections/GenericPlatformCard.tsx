import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Platform {
  name: string;
  connected: boolean;
  autoList: boolean;
  icon: string;
}

interface GenericPlatformCardProps {
  platform: Platform;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const GenericPlatformCard: React.FC<GenericPlatformCardProps> = ({
  platform,
  onConnect,
  onDisconnect
}) => {
  const { toast } = useToast();

  const handleConnect = () => {
    toast({
      title: "Coming Soon",
      description: `${platform.name} integration will be available soon`
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{platform.icon}</span>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{platform.name}</span>
            <Badge variant={platform.connected ? "default" : "secondary"}>
              {platform.connected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          {platform.connected && (
            <p className="text-sm text-gray-600">Last sync: 2 hours ago</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {platform.connected ? (
          <>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button 
            size="sm" 
            onClick={handleConnect}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
};