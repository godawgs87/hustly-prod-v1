import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Mail, Calendar, Shield, CreditCard } from 'lucide-react';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const AdminUserManagement = () => {
  const { 
    users, 
    isLoading, 
    updateUserRole, 
    updateUserSubscription,
    isUpdatingRole,
    isUpdatingSubscription
  } = useAdminUserManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.user_role === roleFilter;
    const matchesTier = tierFilter === 'all' || user.subscription_tier === tierFilter;
    
    return matchesSearch && matchesRole && matchesTier;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'tester': return 'default';
      default: return 'secondary';
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'founders': return 'destructive';
      case 'full-time-flipper': return 'default';
      case 'serious-seller': return 'default';
      case 'side-hustler': return 'secondary';
      default: return 'outline';
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserRole({ userId, role: newRole });
  };

  const handleSubscriptionChange = (userId: string, tier: string, status: string) => {
    updateUserSubscription({ userId, tier, status });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading users...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="tester">Tester</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="side-hustler">Side Hustler</SelectItem>
              <SelectItem value="serious-seller">Serious Seller</SelectItem>
              <SelectItem value="full-time-flipper">Full-time Flipper</SelectItem>
              <SelectItem value="founders">Founders</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Users ({filteredUsers?.length || 0})</h3>
          </div>

          <div className="space-y-4">
            {filteredUsers?.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{user.email}</span>
                    </div>
                    {user.full_name && (
                      <p className="text-sm text-gray-600">{user.full_name}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant={getRoleBadgeVariant(user.user_role)}>
                      {user.user_role}
                    </Badge>
                    <Badge variant={getTierBadgeVariant(user.subscription_tier)}>
                      {user.subscription_tier}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t">
                  {/* Role Management */}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <Select
                      value={user.user_role}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="tester">Tester</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subscription Management */}
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <Select
                      value={user.subscription_tier}
                      onValueChange={(newTier) => handleSubscriptionChange(user.id, newTier, user.subscription_status)}
                      disabled={isUpdatingSubscription}
                    >
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="side-hustler">Side Hustler</SelectItem>
                        <SelectItem value="serious-seller">Serious Seller</SelectItem>
                        <SelectItem value="full-time-flipper">Full-time Flipper</SelectItem>
                        <SelectItem value="founders">Founders</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select
                    value={user.subscription_status}
                    onValueChange={(newStatus) => handleSubscriptionChange(user.id, user.subscription_tier, newStatus)}
                    disabled={isUpdatingSubscription}
                  >
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {filteredUsers?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your filters.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminUserManagement;