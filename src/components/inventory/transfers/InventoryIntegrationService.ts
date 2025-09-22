/**
 * Inventory Integration Service
 * Ensures harmony between Transfer and Inventory modules
 */

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  uom: {
    base: string;
    purchase?: string;
    recipe?: string;
  };
  levels: {
    current: number;
    reserved: number;
    available: number;
    onOrder: number;
    par: {
      min: number;
      max: number;
      reorderPoint: number;
      reorderQuantity: number;
    };
  };
  costing: {
    averageCost: number;
    lastCost: number;
    currency: string;
    costMethod: string;
  };
  status: 'active' | 'inactive' | 'discontinued';
}

export interface TransferSearchItem {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  availableQty: number;
  unitCost: number;
  category: string;
}

export class InventoryIntegrationService {
  /**
   * Search inventory items for transfer
   */
  static async searchForTransfer(
    searchTerm: string, 
    locationId: string
  ): Promise<TransferSearchItem[]> {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: 'active',
        limit: '20'
      });

      if (locationId) {
        params.set('locationId', locationId);
      }

      const response = await fetch(`/api/inventory/items?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }

      const data = await response.json();
      const items = data.items || [];

      // Transform to transfer format and filter available stock
      return items
        .filter((item: InventoryItem) => 
          item.status === 'active' && 
          item.levels && 
          item.levels.available > 0
        )
        .map((item: InventoryItem): TransferSearchItem => ({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.uom?.base || 'each',
          availableQty: Math.round(item.levels.available * 100) / 100,
          unitCost: item.costing?.averageCost || 0,
          category: item.categoryId || 'Other'
        }));

    } catch (error) {
      console.error('Error searching inventory for transfer:', error);
      return [];
    }
  }

  /**
   * Validate transfer quantity against inventory
   */
  static validateTransferQuantity(
    _itemId: string,
    requestedQuantity: number,
    availableQuantity: number
  ): {
    isValid: boolean;
    message?: string;
    maxQuantity: number;
  } {
    if (requestedQuantity <= 0) {
      return {
        isValid: false,
        message: 'Quantity must be greater than 0',
        maxQuantity: availableQuantity
      };
    }

    if (requestedQuantity > availableQuantity) {
      return {
        isValid: false,
        message: `Cannot exceed available stock (${availableQuantity} available)`,
        maxQuantity: availableQuantity
      };
    }

    return {
      isValid: true,
      maxQuantity: availableQuantity
    };
  }

  /**
   * Check if item can be transferred
   */
  static canTransferItem(item: InventoryItem): boolean {
    return (
      item.status === 'active' &&
      item.levels &&
      item.levels.available > 0
    );
  }

  /**
   * Get real-time inventory levels for an item
   */
  static async getItemAvailability(
    itemId: string, 
    locationId?: string
  ): Promise<{
    available: number;
    reserved: number;
    current: number;
    unit: string;
  } | null> {
    try {
      const params = new URLSearchParams();
      if (locationId) {
        params.set('locationId', locationId);
      }

      const response = await fetch(`/api/inventory/items/${itemId}?${params}`);
      
      if (!response.ok) {
        return null;
      }

      const item = await response.json();
      
      return {
        available: item.levels?.available || 0,
        reserved: item.levels?.reserved || 0,
        current: item.levels?.current || 0,
        unit: item.uom?.base || 'each'
      };

    } catch (error) {
      console.error('Error fetching item availability:', error);
      return null;
    }
  }
}
