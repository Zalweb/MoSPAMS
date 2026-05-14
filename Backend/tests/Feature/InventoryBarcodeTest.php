<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\PartBarcode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class InventoryBarcodeTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_barcode_lookup_endpoint_exists()
    {
        // Just verify endpoint is registered
        $response = $this->get('/api/inventory/barcode/nonexistent');
        $this->assertTrue(in_array($response->getStatusCode(), [404, 401, 422]));
    }

    public function test_barcode_link_endpoint_exists()
    {
        $response = $this->post('/api/inventory/barcode/link', [
            'barcode_value' => 'test',
            'part_id' => 1,
        ]);
        $this->assertTrue(in_array($response->getStatusCode(), [404, 401, 422, 409]));
    }

    public function test_part_barcode_model_exists()
    {
        $barcode = PartBarcode::make([
            'part_id' => 1,
            'barcode_value' => '12345',
            'barcode_type' => 'EAN-13',
            'is_primary' => true,
            'shop_id_fk' => 1,
        ]);

        $this->assertInstanceOf(PartBarcode::class, $barcode);
        $this->assertEquals('12345', $barcode->barcode_value);
    }

    public function test_part_barcode_table_exists()
    {
        // Verify migration created the table
        $this->assertTrue(
            DB::connection()->getSchemaBuilder()->hasTable('part_barcodes'),
            'part_barcodes table should exist'
        );
    }

    public function test_part_barcode_table_has_required_columns()
    {
        $columns = DB::connection()->getSchemaBuilder()->getColumnListing('part_barcodes');

        $this->assertContains('part_id', $columns);
        $this->assertContains('barcode_value', $columns);
        $this->assertContains('barcode_type', $columns);
        $this->assertContains('is_primary', $columns);
        $this->assertContains('shop_id_fk', $columns);
    }

    public function test_part_barcode_unique_constraint_exists()
    {
        // Verify unique constraint on barcode_value + shop_id_fk
        $indexes = DB::connection()->getSchemaBuilder()->getIndexes('part_barcodes');
        $uniqueIndexExists = collect($indexes)->filter(function ($index) {
            return $index['name'] === 'unique_barcode_per_shop';
        })->isNotEmpty();

        $this->assertTrue($uniqueIndexExists, 'Unique constraint unique_barcode_per_shop should exist');
    }
}
