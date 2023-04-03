import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import {
  CoffeeType,
  MilkType,
  Product,
  ProductAddition,
} from 'src/app/model/models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  constructor() {}

  /**
   * Get all product additions in the system
   *
   * @param includeDisabled Whether to include disabled product additions in the returned list
   */
  public getProductAdditions(
    includeDisabled?: boolean
  ): Observable<ProductAddition[]> {
    return of([
      {
        "id": "caramel-syrup",
        "name": "Caramel Syrup",
        "price": 0.50,
        "enabled": true
      },
      {
        "id": "chocolate-syrup",
        "name": "Chocolate Syrup",
        "price": 0.25,
        "enabled": true
      },
      {
        "id": "hazelnut-syrup",
        "name": "Hazelnut Syrup",
        "price": 0.50,
        "enabled": true
      },
      {
        "id": "whipped-cream",
        "name": "Whipped Cream",
        "price": 0.30,
        "enabled": true
      },
      {
        "id": "pumpkin-spice-syrup",
        "name": "Pumpkin Spice Syrup",
        "price": 0.75,
        "enabled": false
      },
    ]);
  }

  /**
   * Get all products in the system
   *
   * @param includeDisabled Whether to include disabled products in the returned list
   */
  public getProducts(includeDisabled?: boolean): Observable<Product[]> {
    return of([
      {
        id: 'cafe-americano',
        name: 'Cafe Americano',
        basePrice: 5,
        imageUrl:
          'https://globalassets.starbucks.com/assets/f12bc8af498d45ed92c5d6f1dac64062.jpg?impolicy=1by1_tight_288',
        allowedCoffeeTypes: [CoffeeType.REGULAR, CoffeeType.DECAF],
        allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
        allowedAdditions: [],
      },
      {
        id: 'cappuccino',
        name: 'cappuccino',
        basePrice: 5,
        imageUrl:
          'https://globalassets.starbucks.com/assets/5c515339667943ce84dc56effdf5fc1b.jpg?impolicy=1by1_tight_288',
        allowedCoffeeTypes: [CoffeeType.REGULAR, CoffeeType.DECAF],
        allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
        allowedAdditions: [],
      },
      {
        id: 'espresso',
        name: 'espresso',
        basePrice: 5,
        imageUrl:
          'https://globalassets.starbucks.com/assets/ec519dd5642c41629194192cce582135.jpg?impolicy=1by1_tight_288',
        allowedCoffeeTypes: [CoffeeType.REGULAR],
        allowedMilkTypes: [],
        allowedAdditions: [],
      },
      {
        id: 'caramel-macchiato',
        name: 'Caramel Macchiato',
        basePrice: 5,
        imageUrl:
          'https://globalassets.starbucks.com/assets/58db701349cb48738069e8c912e2b3ac.jpg?impolicy=1by1_tight_288',
        allowedCoffeeTypes: [CoffeeType.REGULAR],
        allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
        allowedAdditions: [],
      },
      {
        id: 'mocha',
        name: 'Mocha',
        basePrice: 5,
        imageUrl:
          'https://globalassets.starbucks.com/assets/915736da018842e788147f7eab73db73.jpg?impolicy=1by1_tight_288',
        allowedCoffeeTypes: [CoffeeType.REGULAR],
        allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
        allowedAdditions: [],
      },
    ]);
  }

  /**
   * Add or update a product in the system
   * User context used to enforce admin access to the system
   * @param product product definition
   */
  public upsertProduct(product: Product): Observable<Product> {
    return throwError(() => new Error('undefined'));
  }

  /**
   * Add or update a product addition in the system
   * User context used to enforce admin access to the system
   * @param productAddition product addition definition
   */
  public upsertProductAddition(
    productAddition: ProductAddition
  ): Observable<ProductAddition> {
    return throwError(() => new Error('undefined'));
  }
}
