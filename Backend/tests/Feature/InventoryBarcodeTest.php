<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Shop;
use App\Models\Part;
use App\Models\Category;
use App\Models\PartBarcode;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryBarcodeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shop = Shop::factory()->create();
        $this->user = User::factory()
            ->for($this->shop, 'shop')
            ->create();
        $this->user->assignRole('staff');

        $this->category = Category::factory()
            ->for($this->shop, 'shop')
            ->create();
    }

    public function test_lookup_barcode_found()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        $barcode = PartBarcode::create([
            'part_id' => $part->id,
            'barcode_value' => '4545913123456',
            'barcode_type' => 'EAN-13',
            'shop_id_fk' => $this->shop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/4545913123456");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'found',
                'part' => [
                    'id' => $part->id,
                    'part_code' => $part->part_code,
                ],
            ]);
    }

    public function test_lookup_barcode_not_found()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/nonexistent");

        $response->assertStatus(404)
            ->assertJson(['status' => 'not_found']);
    }

    public function test_lookup_barcode_scoped_to_shop()
    {
        $otherShop = Shop::factory()->create();
        $otherPart = Part::factory()
            ->for($otherShop, 'shop')
            ->create();

        PartBarcode::create([
            'part_id' => $otherPart->id,
            'barcode_value' => '4545913123456',
            'barcode_type' => 'EAN-13',
            'shop_id_fk' => $otherShop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/4545913123456");

        $response->assertStatus(404);
    }

    public function test_link_barcode_to_part()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/barcode/link", [
                'barcode_value' => '4545913123456',
                'part_id' => $part->id,
                'barcode_type' => 'EAN-13',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'barcode_value' => '4545913123456',
                'part_id' => $part->id,
            ]);

        $this->assertDatabaseHas('part_barcodes', [
            'barcode_value' => '4545913123456',
            'part_id' => $part->id,
            'shop_id_fk' => $this->shop->id,
        ]);
    }

    public function test_prevent_duplicate_barcode()
    {
        $part1 = Part::factory()->for($this->shop, 'shop')->create();
        $part2 = Part::factory()->for($this->shop, 'shop')->create();

        PartBarcode::create([
            'part_id' => $part1->id,
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/barcode/link", [
                'barcode_value' => '4545913123456',
                'part_id' => $part2->id,
            ]);

        $response->assertStatus(409)
            ->assertJson(['status' => 'error']);
    }

    public function test_create_part_with_barcode()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/parts/with-barcode", [
                'brand' => 'Yamaha',
                'part_code' => '1LB-H3912-00',
                'description' => 'Lever LH',
                'category_id_fk' => $this->category->id,
                'price' => 45.99,
                'stock_quantity' => 1,
                'barcode_value' => '4545913123456',
                'barcode_type' => 'EAN-13',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'part' => [
                    'brand' => 'Yamaha',
                    'part_code' => '1LB-H3912-00',
                ],
                'barcode' => [
                    'barcode_value' => '4545913123456',
                ],
            ]);

        $this->assertDatabaseHas('parts', [
            'part_code' => '1LB-H3912-00',
            'shop_id_fk' => $this->shop->id,
        ]);

        $this->assertDatabaseHas('part_barcodes', [
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
        ]);
    }

    public function test_get_part_barcodes()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        PartBarcode::create([
            'part_id' => $part->id,
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
            'is_primary' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/parts/{$part->id}/barcodes");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'part',
                'barcodes' => [
                    '*' => ['id', 'barcode_value', 'is_primary'],
                ],
            ]);
    }
}
