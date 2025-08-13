/**
 * eBay Policy Validation Utilities
 * Provides consistent validation and error reporting for eBay business policies
 */

import { supabase } from '@/integrations/supabase/client';

export interface PolicyValidationResult {
  isValid: boolean;
  isIndividualAccount: boolean;
  errors: string[];
  warnings: string[];
  requiredActions: string[];
}

export interface UserPolicies {
  ebay_payment_policy_id?: string | null;
  ebay_fulfillment_policy_id?: string | null;
  ebay_return_policy_id?: string | null;
}

// Known fake/placeholder policy IDs that should be treated as invalid
const INVALID_POLICY_IDS = [
  'INDIVIDUAL_DEFAULT_PAYMENT',
  'INDIVIDUAL_DEFAULT_RETURN',
  'INDIVIDUAL_DEFAULT_FULFILLMENT',
  'DEFAULT_PAYMENT_POLICY',
  'DEFAULT_RETURN_POLICY',
  'DEFAULT_FULFILLMENT_POLICY'
];

/**
 * Validates if a policy ID is a real eBay policy ID
 * Real eBay policy IDs are typically 15+ characters long and alphanumeric
 */
export function isValidPolicyId(policyId: string | null | undefined): boolean {
  if (!policyId) return false;
  
  // Check for known fake IDs
  if (INVALID_POLICY_IDS.includes(policyId)) return false;
  
  // Real eBay policy IDs are at least 15 characters
  if (policyId.length < 15) return false;
  
  // Real eBay policy IDs are alphanumeric (may include underscores)
  const validPattern = /^[A-Za-z0-9_]+$/;
  return validPattern.test(policyId);
}

/**
 * Determines if an account is an individual account based on policy IDs
 */
export function isIndividualAccount(policies: UserPolicies): boolean {
  const { ebay_payment_policy_id, ebay_fulfillment_policy_id, ebay_return_policy_id } = policies;
  
  // No policies = individual account
  if (!ebay_payment_policy_id && !ebay_fulfillment_policy_id && !ebay_return_policy_id) {
    return true;
  }
  
  // Any invalid policy = individual account
  if (ebay_payment_policy_id && !isValidPolicyId(ebay_payment_policy_id)) return true;
  if (ebay_fulfillment_policy_id && !isValidPolicyId(ebay_fulfillment_policy_id)) return true;
  if (ebay_return_policy_id && !isValidPolicyId(ebay_return_policy_id)) return true;
  
  return false;
}

/**
 * Validates user's eBay policies and provides actionable feedback
 */
export async function validateEbayPolicies(userId: string): Promise<PolicyValidationResult> {
  const result: PolicyValidationResult = {
    isValid: false,
    isIndividualAccount: false,
    errors: [],
    warnings: [],
    requiredActions: []
  };

  try {
    // Fetch user profile with policies
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('ebay_payment_policy_id, ebay_fulfillment_policy_id, ebay_return_policy_id')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      result.errors.push('Unable to fetch user profile');
      result.requiredActions.push('Please ensure you are logged in');
      return result;
    }

    // Check if individual account
    result.isIndividualAccount = isIndividualAccount(userProfile);

    if (result.isIndividualAccount) {
      // Individual accounts don't need policies
      result.isValid = true;
      result.warnings.push('Individual eBay account detected - using eBay default policies');
      
      // Check for fake policies that need cleanup
      if (userProfile.ebay_payment_policy_id && INVALID_POLICY_IDS.includes(userProfile.ebay_payment_policy_id)) {
        result.warnings.push('Outdated placeholder policy IDs detected - these will be cleaned up automatically');
      }
    } else {
      // Business account - validate all policies
      const hasPaymentPolicy = isValidPolicyId(userProfile.ebay_payment_policy_id);
      const hasFulfillmentPolicy = isValidPolicyId(userProfile.ebay_fulfillment_policy_id);
      const hasReturnPolicy = isValidPolicyId(userProfile.ebay_return_policy_id);

      if (!hasPaymentPolicy) {
        result.errors.push('Invalid or missing payment policy');
      }
      if (!hasFulfillmentPolicy) {
        result.errors.push('Invalid or missing fulfillment policy');
      }
      if (!hasReturnPolicy) {
        result.errors.push('Invalid or missing return policy');
      }

      result.isValid = hasPaymentPolicy && hasFulfillmentPolicy && hasReturnPolicy;

      if (!result.isValid) {
        result.requiredActions.push('Go to Settings → Connections → eBay');
        result.requiredActions.push('Click "Refresh Business Policies" to fetch your policies from eBay');
      }
    }

    return result;
  } catch (error) {
    console.error('Error validating eBay policies:', error);
    result.errors.push('An error occurred while validating policies');
    return result;
  }
}

/**
 * Cleans up invalid/fake policy IDs from user profile
 */
export async function cleanupInvalidPolicies(userId: string): Promise<boolean> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('ebay_payment_policy_id, ebay_fulfillment_policy_id, ebay_return_policy_id')
      .eq('id', userId)
      .single();

    if (!userProfile) return false;

    const updates: Partial<UserPolicies> = {};
    let needsUpdate = false;

    // Clean up any fake policy IDs
    if (userProfile.ebay_payment_policy_id && INVALID_POLICY_IDS.includes(userProfile.ebay_payment_policy_id)) {
      updates.ebay_payment_policy_id = null;
      needsUpdate = true;
    }
    if (userProfile.ebay_fulfillment_policy_id && INVALID_POLICY_IDS.includes(userProfile.ebay_fulfillment_policy_id)) {
      updates.ebay_fulfillment_policy_id = null;
      needsUpdate = true;
    }
    if (userProfile.ebay_return_policy_id && INVALID_POLICY_IDS.includes(userProfile.ebay_return_policy_id)) {
      updates.ebay_return_policy_id = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Error cleaning up invalid policies:', error);
        return false;
      }

      console.log('Successfully cleaned up invalid policy IDs');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error in cleanupInvalidPolicies:', error);
    return false;
  }
}
