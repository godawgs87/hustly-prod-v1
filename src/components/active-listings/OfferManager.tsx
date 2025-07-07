
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, X, Percent, Clock, DollarSign } from 'lucide-react';
import type { ListingOffer } from '@/types/Platform';

interface OfferManagerProps {
  offers: ListingOffer[];
  onCreateOffer: (offer: any) => void;
  onSendOffer: (offerId: string) => void;
  onCancelOffer: (offerId: string) => void;
}

const OfferManager = ({
  offers,
  onCreateOffer,
  onSendOffer,
  onCancelOffer
}: OfferManagerProps) => {
  const getOfferTypeColor = (type: string) => {
    switch (type) {
      case 'price_drop': return 'default';
      case 'coupon': return 'secondary';
      case 'best_offer': return 'outline';
      default: return 'secondary';
    }
  };

  const getOfferTypeIcon = (type: string) => {
    switch (type) {
      case 'price_drop': return <DollarSign className="w-3 h-3" />;
      case 'coupon': return <Percent className="w-3 h-3" />;
      case 'best_offer': return <Send className="w-3 h-3" />;
      default: return <Percent className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Promotional Offers</h2>
        <Button onClick={() => onCreateOffer({})} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Offer
        </Button>
      </div>

      {offers.length === 0 ? (
        <Card className="p-8 text-center">
          <Percent className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Offers</h3>
          <p className="text-gray-600 mb-4">
            Create promotional offers to boost sales and engagement across platforms.
          </p>
          <Button onClick={() => onCreateOffer({})}>Create Your First Offer</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <Card key={offer.id} className={!offer.isActive ? 'opacity-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getOfferTypeColor(offer.offerType)} className="text-xs">
                      {getOfferTypeIcon(offer.offerType)}
                      {offer.offerType.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-gray-500">{offer.platform}</span>
                  </div>
                  {offer.isActive && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500">Original Price</div>
                    <div className="font-semibold">${offer.originalPrice}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Offer Price</div>
                    <div className="font-semibold text-green-600">${offer.offerPrice}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Savings</div>
                    <div className="font-semibold text-red-600">
                      {Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500">
                    Created: {new Date(offer.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    {offer.isActive ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendOffer(offer.id)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelOffer(offer.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSendOffer(offer.id)}
                      >
                        Reactivate
                      </Button>
                    )}
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

export default OfferManager;
