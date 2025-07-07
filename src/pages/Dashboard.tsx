
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, ArrowUp, List, TrendingUp } from 'lucide-react';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import EnhancedStatsCard from '@/components/dashboard/EnhancedStatsCard';
import EnhancedDebugPanel from '@/components/debug/EnhancedDebugPanel';

interface DashboardProps {
  onCreateListing: () => void;
  onViewListings: () => void;
}

const Dashboard = ({ onCreateListing, onViewListings }: DashboardProps) => {
  const recentListings = [
    { id: 1, title: "Vintage Nike Air Max 90", price: 85, status: "Active", profit: 35 },
    { id: 2, title: "Levi's 501 Jeans Size 32", price: 45, status: "Sold", profit: 20 },
    { id: 3, title: "North Face Jacket Large", price: 65, status: "Active", profit: 25 }
  ];

  const stats = {
    totalListings: 127,
    activeSales: 45,
    monthlyRevenue: 2340,
    avgListingTime: "2.3 min"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StreamlinedHeader title="Smart Listing Generator" />
      
      {/* Hero Section */}
      <div className="gradient-bg text-white p-6">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100 mb-6">Ready to create your next listing?</p>
        
        <div className="space-y-3">
          <Button
            onClick={onCreateListing}
            className="w-full bg-white text-blue-600 hover:bg-gray-100 py-3 text-lg font-medium transition-all duration-200 hover:scale-[1.02]"
          >
            <Camera className="w-5 h-5 mr-2" />
            Create New Listing
          </Button>
          
          <Button
            onClick={onViewListings}
            className="w-full bg-white/10 text-white border border-white/30 hover:bg-white hover:text-blue-600 py-3 text-lg font-medium transition-all duration-200 hover:scale-[1.02]"
          >
            <List className="w-5 h-5 mr-2" />
            Manage Listings
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="p-4 -mt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <EnhancedStatsCard
            title="Total Listings"
            value={stats.totalListings}
            subtitle="12 active this month"
            badge={{ text: "All time", variant: "secondary" }}
          />
          <EnhancedStatsCard
            title="Active Sales"
            value={stats.activeSales}
            subtitle="5 sold this week"
            trend={{ value: 12, label: "vs last month", isPositive: true }}
            className="border-green-200"
          />
          <EnhancedStatsCard
            title="Revenue"
            value={`$${stats.monthlyRevenue}`}
            subtitle="This month"
            trend={{ value: 8, label: "vs last month", isPositive: true }}
            className="border-purple-200"
          />
          <EnhancedStatsCard
            title="Avg. Time"
            value={stats.avgListingTime}
            subtitle="Per listing"
            badge={{ text: "Fast", variant: "default" }}
            className="border-blue-200"
          />
        </div>

        {/* Recent Listings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
            <Button variant="ghost" size="sm" onClick={onViewListings} className="text-sm">
              View all
            </Button>
          </div>
          
          {recentListings.map((listing) => (
            <div 
              key={listing.id} 
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer"
              onClick={onViewListings}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{listing.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">${listing.price}</p>
                    {listing.profit && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        +${listing.profit}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    listing.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {listing.status}
                  </span>
                  <ArrowUp className="w-4 h-4 text-gray-400 rotate-45" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Debug Panel */}
        <div className="mt-6">
          <EnhancedDebugPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
