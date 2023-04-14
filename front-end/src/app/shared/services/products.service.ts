import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

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
    enabled: true,
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
    enabled: true,
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
    enabled: true,
    name: 'Espresso',
    basePrice: 5,
    imageUrl:
      'https://globalassets.starbucks.com/assets/ec519dd5642c41629194192cce582135.jpg?impolicy=1by1_tight_288',
    allowedCoffeeTypes: [CoffeeType.REGULAR],
  },
  {
    id: 'caramel-macchiato',
    enabled: true,
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
    enabled: true,
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
  products = new Map<string, Product>();
  additions = new Map<string, ProductAddition>();

  constructor() {
    PRODUCTS.forEach((product) => this.products.set(product.id, product));
    ADDITIONS.forEach((addition) => this.additions.set(addition.id!, addition));
  }

  /**
   * Get all product additions in the system
   *
   * @param includeDisabled Whether to include disabled product additions in the returned list
   */
  public getProductAdditions(
    includeDisabled?: boolean
  ): Observable<ProductAddition[]> {
    return of(
      [...this.additions.values()].filter(
        (addition) => addition.enabled || includeDisabled
      )
    );
  }

  /**
   * Get all products in the system
   *
   * @param includeDisabled Whether to include disabled products in the returned list
   */
  public getProducts(includeDisabled?: boolean): Observable<Product[]> {
    return of(
      [...this.products.values()].filter(
        (product) => product.enabled || includeDisabled
      )
    );
  }

  /**
   * Add or update a product in the system
   * User context used to enforce admin access to the system
   * @param product product definition
   */
  public upsertProduct(product: Product): Observable<Product> {
    let id: string;
    if (!product.id) {
      id = new Date().getMilliseconds().toString();
      console.log('Creating new product', product);
      this.products.set(id, { ...product, id });
    } else {
      id = product.id;
      const oldProduct = this.products.get(id);
      if (!oldProduct) {
        return throwError(() => new Error('Product not found'));
      }
      console.log('Updating existing product', product);
      this.products.set(id, { ...product });
    }

    return of(this.products.get(id)!).pipe(delay(500));
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
      basePrice: product.basePrice,
      coffeeType: product.allowedCoffeeTypes[0],
      milkType: product.allowedMilkTypes?.[0],
    };
  }
}
