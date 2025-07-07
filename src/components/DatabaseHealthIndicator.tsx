
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { useDatabaseHealth } from '@/hooks/useDatabaseHealth';

const DatabaseHealthIndicator = () => {
  const { health } = useDatabaseHealth();

  const getStatusColor = () => {
    if (!health.lastChecked) return 'bg-gray-100 text-gray-800';
    if (health.errorCount > 5) return 'bg-red-100 text-red-800';
    if (health.errorCount > 2) return 'bg-yellow-100 text-yellow-800';
    if (health.responseTime && health.responseTime > 3000) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (!health.lastChecked) return <Clock className="w-3 h-3" />;
    if (health.errorCount > 5) return <WifiOff className="w-3 h-3" />;
    if (health.errorCount > 2) return <AlertCircle className="w-3 h-3" />;
    if (health.responseTime && health.responseTime > 3000) return <Database className="w-3 h-3" />;
    return <Wifi className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (!health.lastChecked) return 'Checking...';
    if (health.errorCount > 5) return 'DB Down';
    if (health.errorCount > 2) return 'DB Issues';
    if (health.responseTime && health.responseTime > 3000) return 'DB Slow';
    return 'DB OK';
  };

  return (
    <Badge className={`${getStatusColor()} text-xs flex items-center gap-1`}>
      {getStatusIcon()}
      {getStatusText()}
      {health.responseTime && (
        <span className="text-xs ml-1">({health.responseTime}ms)</span>
      )}
    </Badge>
  );
};

export default DatabaseHealthIndicator;
