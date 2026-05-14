import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface OfflineDBSchema extends DBSchema {
  parts: {
    key: number;
    value: {
      id: number;
      brand: string;
      part_code: string;
      description: string;
      category: string;
      price: number;
      stock_quantity: number;
      shop_id_fk: number;
    };
    indexes: {
      'by-part-code': string;
      'by-shop': number;
    };
  };
  part_barcodes: {
    key: number;
    value: {
      id: number;
      part_id: number;
      barcode_value: string;
      barcode_type: string;
      is_primary: boolean;
      shop_id_fk: number;
    };
    indexes: {
      'by-barcode': string;
      'by-part': number;
      'by-shop': number;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      type: 'new_part' | 'new_barcode';
      data: any;
      status: 'pending' | 'synced';
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

export async function initializeOfflineDB(): Promise<void> {
  db = await openDB<OfflineDBSchema>('mospams-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('parts')) {
        const partsStore = db.createObjectStore('parts', { keyPath: 'id' });
        partsStore.createIndex('by-part-code', 'part_code');
        partsStore.createIndex('by-shop', 'shop_id_fk');
      }

      if (!db.objectStoreNames.contains('part_barcodes')) {
        const barcodesStore = db.createObjectStore('part_barcodes', {
          keyPath: 'id',
        });
        barcodesStore.createIndex('by-barcode', 'barcode_value');
        barcodesStore.createIndex('by-part', 'part_id');
        barcodesStore.createIndex('by-shop', 'shop_id_fk');
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function syncPartsToOffline(
  shopId: number,
  parts: any[]
): Promise<void> {
  if (!db) await initializeOfflineDB();

  for (const part of parts) {
    await db!.put('parts', {
      ...part,
      shop_id_fk: shopId,
    });
  }
}

export async function syncBarcodesToOffline(
  shopId: number,
  barcodes: any[]
): Promise<void> {
  if (!db) await initializeOfflineDB();

  for (const barcode of barcodes) {
    await db!.put('part_barcodes', {
      ...barcode,
      shop_id_fk: shopId,
    });
  }
}

export async function lookupBarcodeOffline(
  barcode: string,
  shopId: number
): Promise<any | null> {
  if (!db) await initializeOfflineDB();

  if (!db) return null;

  // Search part_barcodes table by barcode_value
  const allBarcodes = await db.getAll('part_barcodes');
  const barcode_record = allBarcodes.find(
    (b) => b.barcode_value === barcode && b.shop_id_fk === shopId
  );

  if (!barcode_record) {
    return null;
  }

  const part = await db.get('parts', barcode_record.part_id);
  return part || null;
}

export async function queueNewPart(
  partData: any,
  barcodeData: any
): Promise<void> {
  if (!db) await initializeOfflineDB();

  const queueId = `part-${Date.now()}`;
  await db!.put('sync_queue', {
    id: queueId,
    type: 'new_part',
    data: { part: partData, barcode: barcodeData },
    status: 'pending',
    timestamp: Date.now(),
  });
}

export async function getPendingSyncItems(): Promise<any[]> {
  if (!db) await initializeOfflineDB();

  return db!.getAll('sync_queue');
}

export async function markSyncItemSynced(id: string): Promise<void> {
  if (!db) await initializeOfflineDB();

  const item = await db!.get('sync_queue', id);
  if (item) {
    item.status = 'synced';
    await db!.put('sync_queue', item);
  }
}

export async function cleanupOldSyncItems(olderThanMs: number = 86400000): Promise<void> {
  if (!db) await initializeOfflineDB();

  const allItems = await db!.getAll('sync_queue');
  const now = Date.now();

  for (const item of allItems) {
    if (now - item.timestamp > olderThanMs) {
      await db!.delete('sync_queue', item.id);
    }
  }
}
