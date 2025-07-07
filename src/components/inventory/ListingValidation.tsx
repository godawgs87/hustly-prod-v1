import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { Listing } from '@/types/Listing';

interface ListingValidationProps {
  listing: Listing;
  userProfile?: any;
  onValidationComplete?: (isValid: boolean, errors: string[]) => void;
}

interface ValidationRule {
  field: string;
  label: string;
  isRequired: boolean;
  validator: (listing: Listing, userProfile?: any) => boolean;
  errorMessage: string;
  category: 'listing' | 'user' | 'business';
}

const EBAY_VALIDATION_RULES: ValidationRule[] = [
  // Listing-specific validations
  {
    field: 'title',
    label: 'Title',
    isRequired: true,
    validator: (listing) => !!listing.title && listing.title.length >= 10,
    errorMessage: 'Title must be at least 10 characters long',
    category: 'listing'
  },
  {
    field: 'price',
    label: 'Price',
    isRequired: true,
    validator: (listing) => !!listing.price && listing.price > 0,
    errorMessage: 'Price must be greater than $0',
    category: 'listing'
  },
  {
    field: 'condition',
    label: 'Condition',
    isRequired: true,
    validator: (listing) => !!listing.condition,
    errorMessage: 'Item condition is required',
    category: 'listing'
  },
  {
    field: 'description',
    label: 'Description',
    isRequired: true,
    validator: (listing) => !!listing.description && listing.description.length >= 20,
    errorMessage: 'Description must be at least 20 characters long',
    category: 'listing'
  },
  {
    field: 'category',
    label: 'Category',
    isRequired: true,
    validator: (listing) => !!listing.category,
    errorMessage: 'Category is required for eBay listings',
    category: 'listing'
  },
  {
    field: 'ebay_category',
    label: 'eBay Category',
    isRequired: true,
    validator: (listing) => !!listing.ebay_category_id,
    errorMessage: 'eBay-specific category must be selected for eBay sync',
    category: 'listing'
  },
  {
    field: 'photos',
    label: 'Photos',
    isRequired: true,
    validator: (listing) => {
      // Check BOTH photo storage locations for compatibility
      const hasPhotosInField = listing.photos && listing.photos.length > 0;
      // Note: listing_photos table check is handled in the sync operation itself
      // This UI validation focuses on the primary photos field
      return hasPhotosInField;
    },
    errorMessage: 'At least one photo is required',
    category: 'listing'
  },
  {
    field: 'weight',
    label: 'Weight',
    isRequired: true,
    validator: (listing) => !!listing.measurements?.weight && parseFloat(listing.measurements.weight) > 0,
    errorMessage: 'Item weight is required for shipping calculations',
    category: 'listing'
  },

  // User profile validations
  {
    field: 'shipping_address',
    label: 'Shipping Address',
    isRequired: true,
    validator: (listing, userProfile) => !!(userProfile?.shipping_address_line1 && userProfile?.shipping_city && userProfile?.shipping_state && userProfile?.shipping_postal_code),
    errorMessage: 'Complete shipping address is required in Business settings',
    category: 'business'
  },
  {
    field: 'business_phone',
    label: 'Business Phone',
    isRequired: true,
    validator: (listing, userProfile) => !!userProfile?.business_phone && userProfile.business_phone.length >= 10,
    errorMessage: 'Business phone number is required in Business settings',
    category: 'business'
  }
];

const ListingValidation = ({ listing, userProfile, onValidationComplete }: ListingValidationProps) => {
  const validationResults = EBAY_VALIDATION_RULES.map(rule => {
    const isValid = rule.validator(listing, userProfile);
    return {
      ...rule,
      isValid,
      isBlocking: rule.isRequired && !isValid
    };
  });

  const errors = validationResults.filter(result => result.isBlocking);
  const warnings = validationResults.filter(result => !result.isRequired && !result.isValid);
  const isValid = errors.length === 0;

  React.useEffect(() => {
    if (onValidationComplete) {
      onValidationComplete(isValid, errors.map(e => e.errorMessage));
    }
  }, [isValid, errors.length, onValidationComplete]);

  const groupedResults = {
    listing: validationResults.filter(r => r.category === 'listing'),
    business: validationResults.filter(r => r.category === 'business'),
    user: validationResults.filter(r => r.category === 'user')
  };

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center gap-3">
        {isValid ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600" />
        )}
        <div>
          <h4 className="font-medium">
            {isValid ? 'Ready for eBay' : 'eBay Sync Requirements'}
          </h4>
          <p className="text-sm text-gray-600">
            {isValid 
              ? 'This listing meets all eBay requirements and can be synced'
              : `${errors.length} issue${errors.length !== 1 ? 's' : ''} must be resolved before syncing`
            }
          </p>
        </div>
      </div>

      {/* Listing Issues */}
      {groupedResults.listing.some(r => r.isBlocking) && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Listing Information Required:</p>
              <ul className="list-disc list-inside space-y-1">
                {groupedResults.listing
                  .filter(r => r.isBlocking)
                  .map(result => (
                    <li key={result.field} className="text-sm">
                      {result.errorMessage}
                    </li>
                  ))
                }
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Business Settings Issues */}
      {groupedResults.business.some(r => r.isBlocking) && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Business Settings Required:</p>
              <ul className="list-disc list-inside space-y-1">
                {groupedResults.business
                  .filter(r => r.isBlocking)
                  .map(result => (
                    <li key={result.field} className="text-sm">
                      {result.errorMessage}
                    </li>
                  ))
                }
              </ul>
              <p className="text-sm mt-2">
                <a 
                  href="/settings?tab=business" 
                  className="text-blue-600 hover:underline"
                >
                  Complete Business Settings →
                </a>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {validationResults.map(result => (
          <div
            key={result.field}
            className={`flex items-center gap-2 p-2 rounded border ${
              result.isValid 
                ? 'border-green-200 bg-green-50' 
                : result.isRequired 
                  ? 'border-red-200 bg-red-50'
                  : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            {result.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${result.isRequired ? 'text-red-600' : 'text-yellow-600'}`} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{result.label}</p>
              {!result.isValid && (
                <p className="text-xs text-gray-600 truncate">{result.errorMessage}</p>
              )}
            </div>
            <Badge 
              variant={result.isValid ? "secondary" : result.isRequired ? "destructive" : "default"}
              className="text-xs"
            >
              {result.isValid ? 'OK' : result.isRequired ? 'Required' : 'Warning'}
            </Badge>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {!isValid && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">Quick Actions:</h5>
          <div className="space-y-1 text-sm">
            {groupedResults.business.some(r => r.isBlocking) && (
              <p>
                • <a href="/settings?tab=business" className="text-blue-600 hover:underline">
                  Complete Business Settings
                </a>
              </p>
            )}
            {groupedResults.listing.some(r => r.isBlocking) && (
              <p>
                • Edit this listing to add missing information
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingValidation;