<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ShopFactory extends Factory
{
    public function definition(): array
    {
        return [
            'shop_name' => $this->faker->company(),
            'subdomain' => $this->faker->unique()->slug(),
            'registration_owner_name' => $this->faker->name(),
            'registration_owner_email' => $this->faker->email(),
            'phone' => $this->faker->phoneNumber(),
            'shop_status_id_fk' => 1,
        ];
    }
}
