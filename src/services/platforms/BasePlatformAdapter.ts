import {
  IPlatformAdapter,
  PlatformCapabilities,
  PlatformCredentials,
  UnifiedListing,
  PlatformListingResult,
  SyncResult,
  BulkOperation,
  BulkResult,
  OfferAction
} from '@/types/platform';

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  protected credentials?: PlatformCredentials;
  protected connected: boolean = false;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly icon: string,
    public readonly capabilities: PlatformCapabilities
  ) {}

  // Common connection handling
  async connect(credentials: PlatformCredentials): Promise<void> {
    console.log(`🔌 Connecting to ${this.name}...`);
    this.validateCredentials(credentials);
    this.credentials = credentials;
    await this.performConnection();
    this.connected = true;
    console.log(`✅ Connected to ${this.name}`);
  }

  async disconnect(): Promise<void> {
    console.log(`🔌 Disconnecting from ${this.name}...`);
    this.credentials = undefined;
    this.connected = false;
    await this.performDisconnection();
    console.log(`✅ Disconnected from ${this.name}`);
  }

  async validateConnection(): Promise<boolean> {
    if (!this.connected || !this.credentials) {
      return false;
    }
    
    try {
      return await this.checkConnectionStatus();
    } catch (error) {
      console.error(`❌ ${this.name} connection validation failed:`, error);
      return false;
    }
  }

  // Default implementation for bulk operations (sequential processing)
  async bulkOperations(operations: BulkOperation[]): Promise<BulkResult> {
    const results: BulkResult = {
      successful: 0,
      failed: 0,
      results: []
    };

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            if (operation.listing) {
              const result = await this.createListing(operation.listing);
              results.results.push({
                listingId: operation.listing.id || '',
                success: result.success,
                error: result.errors?.join(', ')
              });
              if (result.success) results.successful++;
              else results.failed++;
            }
            break;
          
          case 'update':
            if (operation.listingId && operation.updates) {
              await this.updateListing(operation.listingId, operation.updates);
              results.results.push({
                listingId: operation.listingId,
                success: true
              });
              results.successful++;
            }
            break;
          
          case 'delete':
            if (operation.listingId) {
              await this.deleteListing(operation.listingId);
              results.results.push({
                listingId: operation.listingId,
                success: true
              });
              results.successful++;
            }
            break;
          
          case 'sync':
            if (operation.listingId) {
              const syncResult = await this.syncListing(operation.listingId);
              const success = syncResult.status !== 'error';
              results.results.push({
                listingId: operation.listingId,
                success,
                error: syncResult.errors?.join(', ')
              });
              if (success) results.successful++;
              else results.failed++;
            }
            break;
        }
      } catch (error: any) {
        results.failed++;
        results.results.push({
          listingId: operation.listingId || '',
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Platform-specific methods to implement
  protected abstract validateCredentials(credentials: PlatformCredentials): void;
  protected abstract performConnection(): Promise<void>;
  protected abstract performDisconnection(): Promise<void>;
  protected abstract checkConnectionStatus(): Promise<boolean>;
  
  abstract createListing(listing: UnifiedListing): Promise<PlatformListingResult>;
  abstract updateListing(id: string, updates: Partial<UnifiedListing>): Promise<void>;
  abstract deleteListing(id: string): Promise<void>;
  abstract syncListing(id: string): Promise<SyncResult>;

  // Optional methods with default implementations
  async manageOffers(offerId: string, action: OfferAction): Promise<void> {
    throw new Error(`${this.name} does not support offer management`);
  }

  async getPolicies(): Promise<any[]> {
    throw new Error(`${this.name} does not support policies`);
  }

  async refreshPolicies(): Promise<void> {
    throw new Error(`${this.name} does not support policies`);
  }
}
