import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import {
  CoffeeType,
  MilkType,
  OrderItem,
  Product,
  ProductAddition,
} from 'src/app/model/models';

const ADDITIONS: ProductAddition[] = [
  {
    id: 'caramel-syrup',
    name: 'Caramel Syrup',
    price: 0.5,
    enabled: true,
  },
  {
    id: 'chocolate-syrup',
    name: 'Chocolate Syrup',
    price: 0.25,
    enabled: true,
  },
  {
    id: 'hazelnut-syrup',
    name: 'Hazelnut Syrup',
    price: 0.5,
    enabled: true,
  },
  {
    id: 'whipped-cream',
    name: 'Whipped Cream',
    price: 0.3,
    enabled: true,
  },
  {
    id: 'pumpkin-spice-syrup',
    name: 'Pumpkin Spice Syrup',
    price: 0.75,
    enabled: false,
  },
];

const PRODUCTS: Product[] = [
  {
    id: 'cafe-americano',
    name: 'Cafe Americano',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/f12bc8af498d45ed92c5d6f1dac64062.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR, CoffeeType.DECAF],
    allowedMilkTypes: [
      MilkType.REGULAR,
      MilkType.SKIM,
      MilkType.OAT,
      MilkType.ALMOND,
    ],
    allowedAdditions: ADDITIONS,
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/5c515339667943ce84dc56effdf5fc1b.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR, CoffeeType.DECAF],
    allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
    allowedAdditions: [],
  },
  {
    id: 'espresso',
    name: 'Espresso',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/ec519dd5642c41629194192cce582135.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR],
  },
  {
    id: 'caramel-macchiato',
    name: 'Caramel Macchiato',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/58db701349cb48738069e8c912e2b3ac.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR],
    allowedMilkTypes: [],
    allowedAdditions: ADDITIONS.slice(3),
  },
  {
    id: 'mocha',
    name: 'Mocha',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/915736da018842e788147f7eab73db73.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR],
    allowedMilkTypes: [MilkType.REGULAR, MilkType.OAT],
    allowedAdditions: ADDITIONS,
  },
];

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
    return of(ADDITIONS);
  }

  /**
   * Get all products in the system
   *
   * @param includeDisabled Whether to include disabled products in the returned list
   */
  public getProducts(includeDisabled?: boolean): Observable<Product[]> {
    return of(PRODUCTS);
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

  public convertToOrderItem(product: Product): OrderItem {
    return {
      productId: product.id,
      coffeeType: product.allowedCoffeeTypes[0],
      milkType: product.allowedMilkTypes?.[0],
    };
  }
}
