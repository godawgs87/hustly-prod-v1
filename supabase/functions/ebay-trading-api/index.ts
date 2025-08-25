import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseStringPromise, Builder } from 'https://esm.sh/xml2js@0.6.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ListingData {
  id?: string
  title: string
  description: string
  price: number
  quantity: number
  condition: string
  ebay_category_id?: string
  photos?: string[]
  brand?: string
  mpn?: string
  upc?: string
  ean?: string
  isbn?: string
  shipping_cost?: number
  shipping_service?: string
  handling_time?: number
  return_accepted?: boolean
  return_period?: number
  payment_methods?: string[]
  platform_categories?: any
}

class EbayTradingAPI {
  private baseUrl: string
  private supabaseClient: any
  private userId: string
  private appId: string
  private devId: string
  private certId: string

  constructor(isSandbox = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'
    this.supabaseClient = supabaseClient
    this.userId = userId
    
    // eBay app credentials from environment
    this.appId = Deno.env.get('EBAY_APP_ID') || ''
    this.devId = Deno.env.get('EBAY_DEV_ID') || ''
    this.certId = Deno.env.get('EBAY_CERT_ID') || ''
  }

  private async getUserBusinessType(): Promise<string> {
    const { data: profile } = await this.supabaseClient
      .from('user_profiles')
      .select('business_type')
      .eq('user_id', this.userId)
      .single()
    
    return profile?.business_type || 'individual'
  }

  private async getUserLocation(): Promise<{ postalCode: string; location: string }> {
    const { data: profile } = await this.supabaseClient
      .from('user_profiles')
      .select('zip_code, city, state')
      .eq('user_id', this.userId)
      .single()
    
    // Use user's zip code if available, otherwise default to a common US zip
    const postalCode = profile?.zip_code || '10001'
    const location = (profile?.city && profile?.state) 
      ? `${profile.city}, ${profile.state}` 
      : 'United States'
    
    return { postalCode, location }
  }

  private async getAccessToken(): Promise<string> {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('oauth_token')
      .eq('user_id', this.userId)
      .eq('platform', 'ebay')
      .single()

    if (error || !account) {
      throw new Error('No eBay account found')
    }

    return account.oauth_token
  }

  private getTradingAPIHeaders(callName: string, token: string): Headers {
    const headers = new Headers()
    headers.set('X-EBAY-API-SITEID', '0') // US site
    headers.set('X-EBAY-API-COMPATIBILITY-LEVEL', '1157')
    headers.set('X-EBAY-API-CALL-NAME', callName)
    headers.set('X-EBAY-API-IAF-TOKEN', token)
    headers.set('Content-Type', 'text/xml')
    return headers
  }

  private async getEbayCategorySuggestions(query: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken()
      if (!token) {
        console.error('[Trading API] No access token available for Taxonomy API')
        return null
      }

      console.log(`[Trading API] Calling Taxonomy API with query: "${query.substring(0, 50)}..."`)
      
      // Call the category suggestions endpoint directly with category tree ID 0 (US marketplace)
      const response = await fetch(
        `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Trading API] Taxonomy API error:', response.status, errorText)
        return null
      }

      const data = await response.json()
      console.log(`[Trading API] Taxonomy API returned ${data.categorySuggestions?.length || 0} suggestions`)
      
      if (data.categorySuggestions && data.categorySuggestions.length > 0) {
        // Log the raw structure to understand the response
        console.log('[Trading API] First suggestion structure:', JSON.stringify(data.categorySuggestions[0], null, 2))
        
        // Find all leaf categories - check both possible structures
        const leafCategories = data.categorySuggestions.filter((cat: any) => {
          // Check if it's directly a leaf
          if (cat.categoryTreeNodeLevel === 'LEAF') return true
          // Check if it's nested under category
          if (cat.category?.categoryTreeNodeLevel === 'LEAF') return true
          // Check if leafCategoryTreeNode is true
          if (cat.leafCategoryTreeNode === true) return true
          if (cat.category?.leafCategoryTreeNode === true) return true
          return false
        })
        
        console.log(`[Trading API] Found ${leafCategories.length} leaf categories`)
        
        if (leafCategories.length > 0) {
          const firstLeaf = leafCategories[0]
          // Handle both possible structures
          const categoryId = firstLeaf.categoryId || firstLeaf.category?.categoryId
          const categoryName = firstLeaf.categoryName || firstLeaf.category?.categoryName
          
          if (categoryId) {
            console.log(`[Trading API] Selected leaf category: ${categoryId} - ${categoryName}`)
            return categoryId
          }
        }
        
        // If no leaf categories, use the first suggestion anyway (eBay should only return valid categories)
        console.warn('[Trading API] No leaf categories identified, using first suggestion')
        const firstSuggestion = data.categorySuggestions[0]
        const categoryId = firstSuggestion.categoryId || firstSuggestion.category?.categoryId
        const categoryName = firstSuggestion.categoryName || firstSuggestion.category?.categoryName
        
        if (categoryId) {
          console.log(`[Trading API] Using non-leaf category: ${categoryId} - ${categoryName}`)
          return categoryId
        }
      } else {
        console.warn('[Trading API] No category suggestions returned from Taxonomy API')
      }
    } catch (error) {
      console.error('[Trading API] Error getting category suggestions:', error)
    }
    return null
  }

  private async validateAndGetLeafCategory(listing: any): Promise<string> {
    // First check if we have pre-resolved platform categories
    if (listing.platform_categories?.ebay?.categoryId) {
      const categoryId = listing.platform_categories.ebay.categoryId
      console.log(`[Trading API] Found pre-resolved eBay category ${categoryId}, will validate...`)
      
      // Validate it's a leaf category
      if (await this.validateLeafCategory(categoryId)) {
        console.log(`[Trading API] Validated ${categoryId} is a leaf category`)
        return categoryId
      } else {
        console.warn(`[Trading API] Category ${categoryId} is not a leaf, will search for alternatives`)
      }
    }

    // Check if we have an ebay_category_id
    if (listing.ebay_category_id) {
      console.log(`[Trading API] Found ebay_category_id ${listing.ebay_category_id}, will validate...`)
      
      // Validate it's a leaf category
      if (await this.validateLeafCategory(listing.ebay_category_id)) {
        console.log(`[Trading API] Validated ${listing.ebay_category_id} is a leaf category`)
        return listing.ebay_category_id
      } else {
        console.warn(`[Trading API] Category ${listing.ebay_category_id} is not a leaf, will search for alternatives`)
      }
    }

    // Try to get category suggestions from eBay Taxonomy API
    const title = listing.title || ''
    const description = listing.description || ''
    const brand = listing.brand || ''
    
    // Build a smart query that includes key product identifiers
    let query = title
    if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
      query = `${brand} ${title}`
    }
    
    // Add some description context but limit length
    if (description) {
      query = `${query} ${description}`.substring(0, 200).trim()
    }
    
    console.log(`[Trading API] Searching for category with query: "${query.substring(0, 100)}..."`);
    const suggestedCategory = await this.getEbayCategorySuggestions(query)

    if (suggestedCategory) {
      console.log(`[Trading API] Using Taxonomy API suggested category ${suggestedCategory}`)
      return suggestedCategory
    }

    // If all else fails, try a more generic search
    console.warn(`[Trading API] No category found for full query, trying generic search...`)
    const genericQuery = title.split(' ').slice(0, 3).join(' ') // Just first 3 words
    const genericCategory = await this.getEbayCategorySuggestions(genericQuery)
    
    if (genericCategory) {
      console.log(`[Trading API] Using generic search category ${genericCategory}`)
      return genericCategory
    }

    // Absolute last resort - search for "other items"
    console.error(`[Trading API] CRITICAL: No category found at all, searching for 'other' category`)
    const otherCategory = await this.getEbayCategorySuggestions('other items for sale')
    
    if (otherCategory) {
      console.log(`[Trading API] Using 'other' category ${otherCategory}`)
      return otherCategory
    }
    
    // This should never happen if eBay API is working
    throw new Error('Unable to determine any valid eBay category. Taxonomy API may be down.')
  }
  
  private async validateLeafCategory(categoryId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken()
      if (!token) return false

      const response = await fetch(
        `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_subtree?category_id=${categoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        console.error(`[Trading API] Failed to validate category ${categoryId}:`, response.status)
        return false
      }

      const data = await response.json()
      const isLeaf = data.categoryTreeNodeLevel === 'LEAF'
      console.log(`[Trading API] Category ${categoryId} validation: isLeaf=${isLeaf}, level=${data.categoryTreeNodeLevel}`)
      return isLeaf
    } catch (error) {
      console.error(`[Trading API] Error validating category ${categoryId}:`, error)
      return false
    }
  }

  private async uploadDataUriToStorage(dataUri: string, listingId: string, index: number): Promise<string | null> {
    try {
      // Extract the base64 data and mime type from the data URI
      const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        console.error('[Trading API] Invalid data URI format')
        return null
      }

      const mimeType = matches[1]
      const base64Data = matches[2]
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Generate a unique filename
      const extension = mimeType.split('/')[1] || 'jpg'
      const filename = `${listingId}_${index}_${Date.now()}.${extension}`

      // Upload to Supabase storage
      const { data, error } = await this.supabaseClient.storage
        .from('listing_photos')
        .upload(filename, bytes, {
          contentType: mimeType,
          upsert: true
        })

      if (error) {
        console.error('[Trading API] Error uploading to storage:', error)
        return null
      }

      // Get the public URL
      const { data: { publicUrl } } = this.supabaseClient.storage
        .from('listing_photos')
        .getPublicUrl(filename)

      console.log(`[Trading API] Uploaded photo to storage: ${publicUrl}`)
      return publicUrl
    } catch (error) {
      console.error('[Trading API] Error converting data URI to URL:', error)
      return null
    }
  }

  private async extractPhotoUrls(photos: any[], listingId?: string): Promise<string[]> {
    if (!photos || !Array.isArray(photos)) {
      return []
    }

    const validUrls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      
      if (!photo || typeof photo !== 'string') {
        console.log(`[Trading API] Skipping invalid photo at index ${i}: not a string`)
        continue
      }

      // Check if it's a data URI
      if (photo.startsWith('data:')) {
        console.log(`[Trading API] Photo ${i} is a data URI, uploading to storage...`)
        const uploadedUrl = await this.uploadDataUriToStorage(photo, listingId, i)
        if (uploadedUrl) {
          validUrls.push(uploadedUrl)
        } else {
          console.warn(`[Trading API] Failed to upload data URI photo ${i}`)
        }
        continue
      }

      // Check if it's a valid HTTP/HTTPS URL
      if (photo.startsWith('http://') || photo.startsWith('https://')) {
        // eBay doesn't accept URLs with semicolons or certain special characters
        if (photo.includes(';')) {
          console.log(`[Trading API] Skipping photo ${i}: contains semicolon (likely a data URI disguised as URL)`)
          continue
        }
        
        // Check if it's a Supabase storage URL (these are always valid)
        if (photo.includes('supabase') || photo.includes('storage')) {
          console.log(`[Trading API] Photo ${i} is a valid Supabase storage URL`)
          validUrls.push(photo)
          continue
        }
        
        // For other URLs, do basic validation
        try {
          new URL(photo) // This will throw if invalid
          console.log(`[Trading API] Photo ${i} is a valid URL`)
          validUrls.push(photo)
        } catch {
          console.log(`[Trading API] Skipping photo ${i}: invalid URL format`)
        }
        continue
      }

      console.log(`[Trading API] Skipping photo ${i}: not a valid URL or data URI`)
    }

    return validUrls
  }

  private async buildAddItemXML(listing: any): Promise<string> {
    const businessType = await this.getUserBusinessType()
    const { postalCode, location } = await this.getUserLocation()
    
    // Get validated leaf category
    const ebayCategoryId = await this.validateAndGetLeafCategory(listing)
    console.log(`[Trading API] Using eBay category ID: ${ebayCategoryId}`)
    
    // Use photos from listing object or listing_photos
    let photoUrls = listing.photos || []
    
    // If photos is empty but listing_photos exists, extract URLs from there
    if ((!photoUrls || photoUrls.length === 0) && listing.listing_photos) {
      photoUrls = listing.listing_photos.map((p: any) => p.photo_url).filter(Boolean)
    }
    
    console.log(`[Trading API] Found ${photoUrls.length} photo URLs:`, photoUrls)
    
    // Pass listing ID for better file naming if available
    const validPhotoUrls = await this.extractPhotoUrls(photoUrls, listing.id)

    console.log(`[Trading API] ${validPhotoUrls.length} valid photo URLs after processing`)
    
    if (validPhotoUrls.length === 0) {
      console.warn('[Trading API] Warning: No valid photo URLs for eBay. Photos may be data URIs or contain semicolons.')
      console.log('[Trading API] Original photo URLs:', photoUrls)
    }

    const sku = `HUSTLY-${listing.id || Date.now()}`
    
    // Build comprehensive item data with all required fields
    const itemData = {
      AddFixedPriceItemRequest: {
        $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: {
          Title: listing.title,
          Description: listing.description,
          PrimaryCategory: {
            CategoryID: ebayCategoryId
          },
          StartPrice: listing.price,
          CategoryMappingAllowed: true,
          Country: 'US',
          Currency: 'USD',
          DispatchTimeMax: listing.handling_time || 3,
          ListingDuration: 'GTC',
          ListingType: 'FixedPriceItem',
          
          // Enhanced Payment Methods
          PaymentMethods: ['PayPal', 'CreditCard', 'Discover', 'VisaMC', 'Amex'],
          PayPalEmailAddress: listing.paypal_email || 'payments@hustly.app',
          
          // Picture Details - CRITICAL FIX FOR PHOTO ERROR
          PictureDetails: validPhotoUrls.length > 0 ? {
            PictureURL: validPhotoUrls.slice(0, 24) // eBay max is 24 photos
          } : undefined,
          
          PostalCode: postalCode,
          Quantity: listing.quantity || 1,
          
          // Enhanced Return Policy
          ReturnPolicy: {
            ReturnsAcceptedOption: listing.return_accepted !== false ? 'ReturnsAccepted' : 'ReturnsNotAccepted',
            RefundOption: 'MoneyBack',
            ReturnsWithinOption: `Days_${listing.return_period || 30}`,
            ShippingCostPaidByOption: listing.return_shipping_paid_by || 'Buyer',
            Description: listing.return_description || 'Items must be returned in original condition. Buyer pays return shipping unless item is defective or not as described.'
          },
          
          // Comprehensive Shipping Details
          ShippingDetails: this.buildShippingDetails(listing),
          
          Site: 'US',
          SKU: sku,
          Location: location,
          ConditionID: this.getConditionID(listing.condition),
          
          // Item Specifics for categories
          ItemSpecifics: this.buildItemSpecifics(listing, ebayCategoryId)
        }
      }
    }

    // Add product identifiers if available
    if (listing.brand || listing.mpn || listing.upc || listing.ean || listing.isbn) {
      itemData.AddFixedPriceItemRequest.Item.ProductListingDetails = {
        BrandMPN: (listing.brand || listing.mpn) ? {
          Brand: listing.brand || 'Unbranded',
          MPN: listing.mpn || 'Does Not Apply'
        } : undefined,
        UPC: listing.upc,
        EAN: listing.ean,
        ISBN: listing.isbn
      }
    }

    // Add business seller profiles if applicable
    if (businessType === 'business' && listing.use_business_policies) {
      itemData.AddFixedPriceItemRequest.Item.SellerProfiles = {
        SellerPaymentProfile: {
          PaymentProfileID: listing.payment_profile_id || '0',
          PaymentProfileName: listing.payment_profile_name || 'Default Payment'
        },
        SellerReturnProfile: {
          ReturnProfileID: listing.return_profile_id || '0',
          ReturnProfileName: listing.return_profile_name || '30 Day Returns'
        },
        SellerShippingProfile: {
          ShippingProfileID: listing.shipping_profile_id || '0',
          ShippingProfileName: listing.shipping_profile_name || 'Standard Shipping'
        }
      }
    }

    const builder = new Builder()
    return builder.buildObject(itemData)
  }

  private buildShippingDetails(listing: any): any {
    const shippingDetails: any = {
      ShippingType: listing.shipping_type || 'Flat',
      ShippingServiceOptions: []
    }

    // Primary shipping service (required)
    const primaryService = {
      ShippingServicePriority: 1,
      ShippingService: this.getValidShippingService(listing.shipping_service),
      ShippingServiceCost: listing.shipping_cost || 0,
      ShippingServiceAdditionalCost: listing.shipping_additional_cost || 0
    }
    shippingDetails.ShippingServiceOptions.push(primaryService)

    // Add expedited shipping option if specified
    if (listing.expedited_service) {
      shippingDetails.ShippingServiceOptions.push({
        ShippingServicePriority: 2,
        ShippingService: this.getValidShippingService(listing.expedited_service),
        ShippingServiceCost: listing.expedited_cost || 10,
        ShippingServiceAdditionalCost: listing.expedited_additional_cost || 5
      })
    }

    // Add calculated shipping details if applicable
    if (listing.shipping_type === 'Calculated') {
      shippingDetails.CalculatedShippingRate = {
        OriginatingPostalCode: listing.origin_postal_code || '90210',
        PackageDepth: listing.package_depth || 10,
        PackageLength: listing.package_length || 10,
        PackageWidth: listing.package_width || 10,
        PackageWeight: listing.package_weight || 1,
        WeightMajor: listing.weight_major || 1,
        WeightMinor: listing.weight_minor || 0,
        ShippingPackage: listing.shipping_package || 'PackageThickEnvelope'
      }
    }

    // Add international shipping if enabled
    if (listing.international_shipping) {
      shippingDetails.InternationalShippingServiceOption = {
        ShippingServicePriority: 1,
        ShippingService: 'USPSFirstClassMailInternational',
        ShippingServiceCost: listing.international_shipping_cost || 25,
        ShippingServiceAdditionalCost: listing.international_additional_cost || 10,
        ShipToLocation: listing.ship_to_locations || ['Worldwide']
      }
    }

    // Exclude ship-to locations if specified
    if (listing.exclude_ship_to_locations) {
      shippingDetails.ExcludeShipToLocation = listing.exclude_ship_to_locations
    }

    return shippingDetails
  }

  private getValidShippingService(service?: string): string {
    // Map common shipping services to valid eBay shipping service codes
    const serviceMap: { [key: string]: string } = {
      'usps_priority': 'USPSPriority',
      'usps_first_class': 'USPSFirstClass',
      'usps_ground': 'USPSGroundAdvantage',
      'usps_media': 'USPSMedia',
      'ups_ground': 'UPSGround',
      'ups_3day': 'UPS3rdDay',
      'ups_2day': 'UPS2ndDay',
      'ups_next_day': 'UPSNextDay',
      'fedex_ground': 'FedExHomeDelivery',
      'fedex_2day': 'FedEx2Day',
      'fedex_overnight': 'FedExPriorityOvernight',
      'economy': 'EconomyShippingFromOutsideUS',
      'standard': 'StandardShippingFromOutsideUS',
      'expedited': 'ExpeditedShippingFromOutsideUS'
    }

    if (service && serviceMap[service.toLowerCase()]) {
      return serviceMap[service.toLowerCase()]
    }

    // Default to USPS Priority if service not recognized
    return service || 'USPSPriority'
  }

  private buildItemSpecifics(listing: any, categoryId: string): any {
    const specifics: any[] = []

    // Always add brand if available
    if (listing.brand) {
      specifics.push({
        Name: 'Brand',
        Value: listing.brand
      })
    }

    // Category-specific item specifics
    if (this.isClothingCategory(categoryId)) {
      // Clothing-specific fields
      if (listing.size) {
        specifics.push({
          Name: 'Size',
          Value: listing.size
        })
      }
      if (listing.color) {
        specifics.push({
          Name: 'Color',
          Value: listing.color
        })
      }
      if (listing.material) {
        specifics.push({
          Name: 'Material',
          Value: listing.material
        })
      }
      if (listing.style) {
        specifics.push({
          Name: 'Style',
          Value: listing.style
        })
      }
      if (listing.gender) {
        specifics.push({
          Name: 'Department',
          Value: listing.gender
        })
      }
    } else if (this.isElectronicsCategory(categoryId)) {
      // Electronics-specific fields
      if (listing.model) {
        specifics.push({
          Name: 'Model',
          Value: listing.model
        })
      }
      if (listing.connectivity) {
        specifics.push({
          Name: 'Connectivity',
          Value: listing.connectivity
        })
      }
      if (listing.features) {
        specifics.push({
          Name: 'Features',
          Value: Array.isArray(listing.features) ? listing.features.join(', ') : listing.features
        })
      }
    } else if (this.isAutomotiveCategory(categoryId)) {
      // Automotive-specific fields
      if (listing.manufacturer_part_number) {
        specifics.push({
          Name: 'Manufacturer Part Number',
          Value: listing.manufacturer_part_number
        })
      }
      if (listing.fitment) {
        specifics.push({
          Name: 'Fitment',
          Value: listing.fitment
        })
      }
      if (listing.warranty) {
        specifics.push({
          Name: 'Warranty',
          Value: listing.warranty
        })
      }
    }

    // Add any custom item specifics passed in the listing
    if (listing.item_specifics && Array.isArray(listing.item_specifics)) {
      listing.item_specifics.forEach((specific: any) => {
        if (specific.name && specific.value) {
          specifics.push({
            Name: specific.name,
            Value: specific.value
          })
        }
      })
    }

    return specifics.length > 0 ? { NameValueList: specifics } : undefined
  }

  private isClothingCategory(categoryId: string): boolean {
    // Common clothing category IDs
    const clothingCategories = ['11450', '11483', '11484', '11504', '11505', '11506', '11507', '11510', '11511', '11514', '11516', '11554', '11555', '15724', '15775', '31515', '53159', '63861', '63862', '63863', '63864', '63865', '63866', '63867', '63869', '95672', '137084', '137085', '155183', '155184', '155185', '155186', '155187', '155188', '155189', '155190', '155191', '155192', '155193', '155194', '155195', '155196', '155197', '155198', '155199', '155200', '155201', '155202', '260010', '260012', '314']
    return clothingCategories.includes(categoryId)
  }

  private isElectronicsCategory(categoryId: string): boolean {
    // Common electronics category IDs
    const electronicsCategories = ['293', '3270', '11071', '14948', '15032', '31387', '31388', '31530', '42428', '48446', '51076', '58058', '80053', '96915', '139971', '139973', '171485', '171957', '171961', '175672', '175673', '175674', '175675', '175676', '175677', '175678', '175679', '175680', '175681', '175682', '175683', '175684', '175685', '175686', '175687', '175688', '175689', '175690', '175691', '175709', '175710', '175711', '178893', '178894', '178895', '178896', '178897', '178898', '178899', '182050', '182051', '182064', '182065', '182066', '182067', '182068', '182069', '182070', '182071', '182085', '182086', '182087', '182088', '182089', '182090', '182091', '182092', '182093', '182094']
    return electronicsCategories.includes(categoryId)
  }

  private isAutomotiveCategory(categoryId: string): boolean {
    // Common automotive category IDs
    const automotiveCategories = ['6000', '6001', '6003', '6007', '6008', '6015', '6016', '6017', '6018', '6019', '6020', '6021', '6022', '6024', '6026', '6028', '6030', '6031', '6035', '6036', '6038', '6042', '6043', '6755', '10063', '33542', '33543', '33544', '33545', '33546', '33547', '33548', '33549', '33550', '33551', '33552', '33553', '33554', '33555', '33556', '33557', '33558', '33559', '33560', '33561', '33562', '33563', '33564', '33565']
    return automotiveCategories.includes(categoryId)
  }

  private getConditionID(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'new': '1000',
      'like_new': '1500',
      'excellent': '2000',
      'very_good': '3000',
      'good': '4000',
      'acceptable': '5000',
      'for_parts': '7000'
    }
    return conditionMap[condition] || '3000'
  }

  private validateListingData(listing: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields validation
    if (!listing.title || listing.title.trim().length === 0) {
      errors.push('Title is required')
    } else if (listing.title.length > 80) {
      errors.push('Title must be 80 characters or less')
    }

    if (!listing.description || listing.description.trim().length === 0) {
      errors.push('Description is required')
    }

    if (!listing.price || listing.price <= 0) {
      errors.push('Price must be greater than 0')
    }

    if (!listing.quantity || listing.quantity < 1) {
      errors.push('Quantity must be at least 1')
    }

    if (!listing.condition) {
      errors.push('Condition is required')
    }

    // Shipping validation
    if (!listing.shipping_cost && listing.shipping_cost !== 0) {
      errors.push('Shipping cost is required (can be 0 for free shipping)')
    }

    if (!listing.shipping_service) {
      errors.push('Shipping service is required')
    }

    // Photo validation
    if (!listing.photos || listing.photos.length === 0) {
      if (!listing.listing_photos || listing.listing_photos.length === 0) {
        errors.push('At least one photo is required')
      }
    }

    // Category validation
    if (!listing.ebay_category_id && !listing.platform_categories?.ebay?.category_id) {
      errors.push('eBay category is required')
    }

    // Payment validation
    if (!listing.paypal_email && !Deno.env.get('EBAY_PAYPAL_EMAIL')) {
      console.warn('[Trading API] Warning: No PayPal email specified, using default')
    }

    // Return policy validation
    if (listing.return_accepted && !listing.return_period) {
      errors.push('Return period is required when returns are accepted')
    }

    // Item specifics validation for certain categories
    if (listing.ebay_category_id) {
      const categoryId = listing.ebay_category_id.toString()
      
      // Clothing categories often require size
      if (this.isClothingCategory(categoryId) && !listing.size && !listing.item_specifics?.find((s: any) => s.name === 'Size')) {
        console.warn('[Trading API] Warning: Size not specified for clothing item')
      }

      // Electronics often require brand
      if (this.isElectronicsCategory(categoryId) && !listing.brand && !listing.item_specifics?.find((s: any) => s.name === 'Brand')) {
        console.warn('[Trading API] Warning: Brand not specified for electronics item')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  async addFixedPriceItem(listingData: any): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      console.log('[Trading API] Starting addFixedPriceItem')
      
      // Use provided listing data or fetch from database
      let listing = listingData
      
      // If listingData is a string (listingId), fetch from database
      if (typeof listingData === 'string') {
        console.log('[Trading API] Fetching listing data for ID:', listingData)
        const { data, error: listingError } = await this.supabaseClient
          .from('listings')
          .select('*')
          .eq('id', listingData)
          .single()

        if (listingError || !data) {
          throw new Error(`Failed to fetch listing: ${listingError?.message}`)
        }
        
        // Check for photos in multiple locations
        let photos: string[] = []
        
        // 1. Check the photos field directly on the listing (most common)
        if (data.photos) {
          console.log('[Trading API] Found photos field on listing:', Array.isArray(data.photos) ? data.photos.length : 'string')
          if (Array.isArray(data.photos)) {
            photos = data.photos.filter(Boolean)
          } else if (typeof data.photos === 'string') {
            try {
              const parsed = JSON.parse(data.photos)
              if (Array.isArray(parsed)) {
                photos = parsed.filter(Boolean)
              }
            } catch {
              photos = [data.photos]
            }
          }
        }
        
        // 2. If no photos yet, check listing_photos table
        if (photos.length === 0) {
          console.log('[Trading API] No photos in listing, checking listing_photos table...')
          const { data: listingPhotos } = await this.supabaseClient
            .from('listing_photos')
            .select('photo_url')
            .eq('listing_id', listingData)
            .order('display_order', { ascending: true })

          if (listingPhotos && listingPhotos.length > 0) {
            photos = listingPhotos.map((p: any) => p.photo_url).filter(Boolean)
            console.log(`[Trading API] Found ${photos.length} photos in listing_photos table`)
          }
        }

        listing = {
          ...data,
          photos,
          title: data.title,
          description: data.description,
          price: data.price,
          quantity: data.quantity || 1,
          condition: data.condition || 'good',
          ebay_category_id: data.ebay_category_id || data.platform_categories?.ebay?.category_id,
          brand: data.brand,
          size: data.size,
          color: data.color,
          material: data.material,
          shipping_cost: data.shipping_cost,
          shipping_service: data.shipping_service || 'USPSPriority',
          handling_time: data.handling_time || 3,
          return_accepted: data.return_accepted !== false,
          return_period: data.return_period || 30,
          platform_categories: data.platform_categories
        }
      }

      // Validate listing data before proceeding
      const validation = this.validateListingData(listing)
      if (!validation.isValid) {
        console.error('[Trading API] Validation failed:', validation.errors)
        throw new Error(`Listing validation failed: ${validation.errors.join(', ')}`)
      }

      // Ensure we have required fields
      if (!listing.title || !listing.description || !listing.price) {
        throw new Error('Missing required listing fields: title, description, or price')
      }

      // Build XML payload
      const xmlPayload = await this.buildAddItemXML(listing)
      
      // Get access token and make the Trading API request
      const token = await this.getAccessToken()
      
      console.log('[Trading API] Sending request to eBay Trading API')
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('AddFixedPriceItem', token),
        body: xmlPayload
      })

      const responseText = await response.text()
      const result = await parseStringPromise(responseText)
      
      // Check for errors in the response
      if (result.AddFixedPriceItemResponse?.Errors) {
        const errors = result.AddFixedPriceItemResponse.Errors
        const severeErrors = Array.isArray(errors) ? errors.filter((e: any) => 
          e.SeverityCode && e.SeverityCode[0] === 'Error'
        ) : []
        
        if (severeErrors.length > 0) {
          const errorMessages = severeErrors.map((e: any) => ({
            code: e.ErrorCode?.[0],
            message: e.LongMessage?.[0] || e.ShortMessage?.[0]
          }))
          console.error('[Trading API] eBay errors:', errorMessages)
          throw new Error(`eBay Trading API Error: ${JSON.stringify(errorMessages)}`)
        }
      }

      // Check for successful response with ItemID
      if (result.AddFixedPriceItemResponse?.ItemID) {
        const itemId = result.AddFixedPriceItemResponse.ItemID[0]
        console.log('[Trading API] Successfully created eBay listing with ItemID:', itemId)
        
        // Update listing with eBay item ID if we have a listing ID
        if (listing.id) {
          const ebayCategoryId = await this.validateAndGetLeafCategory(listing)
          await this.supabaseClient
            .from('listings')
            .update({ 
              ebay_item_id: itemId,
              ebay_category_id: ebayCategoryId,
              ebay_listing_status: 'active',
              ebay_last_sync: new Date().toISOString()
            })
            .eq('id', listing.id)
        }

        return {
          success: true,
          itemId: itemId
        }
      } else {
        throw new Error('Unexpected response from eBay Trading API - no ItemID returned')
      }
    } catch (error: any) {
      console.error('[Trading API] Error in addFixedPriceItem:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async endFixedPriceItem(itemId: string, reason: string = 'NotAvailable'): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken()
      
      const endItemData = {
        EndFixedPriceItemRequest: {
          $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
          ErrorLanguage: 'en_US',
          WarningLevel: 'High',
          ItemID: itemId,
          EndingReason: reason
        }
      }

      const builder = new Builder()
      const xmlPayload = builder.buildObject(endItemData)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('EndFixedPriceItem', token),
        body: xmlPayload
      })

      const responseText = await response.text()
      const result = await parseStringPromise(responseText)

      if (result.EndFixedPriceItemResponse?.Ack?.[0] === 'Success') {
        return { success: true }
      } else {
        const errors = result.EndFixedPriceItemResponse?.Errors || []
        throw new Error(`Failed to end listing: ${JSON.stringify(errors)}`)
      }
    } catch (error: any) {
      console.error('[Trading API] Error ending item:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, listingId, listing, itemId, reason } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    const api = new EbayTradingAPI(false, supabaseClient, userId)

    switch (action) {
      case 'addFixedPriceItem': {
        // Pass either the listing object or listingId
        const result = await api.addFixedPriceItem(listing || listingId)
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'endFixedPriceItem': {
        if (!itemId) {
          throw new Error('Item ID required to end listing')
        }
        
        const result = await api.endFixedPriceItem(itemId, reason || 'NotAvailable')
        
        // Update listing status if listingId provided
        if (listingId) {
          await supabaseClient
            .from('listings')
            .update({ 
              ebay_listing_status: 'ended',
              ebay_last_sync: new Date().toISOString()
            })
            .eq('id', listingId)
        }
        
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('[Trading API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
