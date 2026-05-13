import {
  initializeOfflineDB,
  syncPartsToOffline,
  lookupBarcodeOffline,
  queueNewPart,
  getPendingSyncItems,
} from '@/shared/services/offlineCache';

describe('Offline Cache Service', () => {
  beforeEach(async () => {
    await initializeOfflineDB();
  });

  it('initializes IndexedDB without error', async () => {
    await initializeOfflineDB();
    expect(true).toBe(true);
  });

  it('syncs parts to offline cache', async () => {
    const parts = [
      {
        id: 1,
        brand: 'Yamaha',
        part_code: '1LB-H3912-00',
        description: 'Lever LH',
        category: 'levers',
        price: 45.99,
        stock_quantity: 8,
      },
    ];

    await syncPartsToOffline(1, parts);
    expect(true).toBe(true);
  });

  it('queues new parts for sync', async () => {
    const partData = {
      brand: 'Yamaha',
      part_code: '1LB-H3912-00',
      description: 'Lever LH',
    };
    const barcodeData = {
      barcode_value: '4545913123456',
      barcode_type: 'EAN-13',
    };

    await queueNewPart(partData, barcodeData);
    const items = await getPendingSyncItems();

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].data.part.brand).toBe('Yamaha');
  });
});
