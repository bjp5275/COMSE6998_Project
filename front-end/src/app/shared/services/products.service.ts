import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, retry, tap } from 'rxjs';

import {
  CoffeeType,
  MilkType,
  OrderItem,
  Product,
  ProductAddition,
} from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';

const INCLUDE_DISABLED_PARAMETER = 'includeDisabled';

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

  constructor(private http: HttpClient) {
    PRODUCTS.forEach((product) => this.products.set(product.id, product));
    ADDITIONS.forEach((addition) => this.additions.set(addition.id!, addition));
  }

  private cleanProductFromService(product: Product): Product {
    if (product) {
      if (product.basePrice) {
        product.basePrice = HttpUtils.convertDecimalFromString(
          product.basePrice
        )!;
      }
      if (product.allowedAdditions) {
        product.allowedAdditions = product.allowedAdditions.map((addition) =>
          this.cleanProductAdditionFromService(addition)
        );
      }
    }

    return product;
  }

  private cleanProductsFromService(products: Product[]): Product[] {
    if (products) {
      products = products.map((product) =>
        this.cleanProductFromService(product)
      );
    }

    return products;
  }

  private cleanProductAdditionFromService(
    addition: ProductAddition
  ): ProductAddition {
    if (addition && addition.price) {
      addition.price = HttpUtils.convertDecimalFromString(addition.price)!;
    }

    return addition;
  }

  private cleanProductAdditionsFromService(
    additions: ProductAddition[]
  ): ProductAddition[] {
    if (additions) {
      additions = additions.map((addition) =>
        this.cleanProductAdditionFromService(addition)
      );
    }

    return additions;
  }

  /**
   * Get all product additions in the system
   *
   * @param includeDisabled Whether to include disabled product additions in the returned list
   */
  public getProductAdditions(
    includeDisabled: boolean = false
  ): Observable<ProductAddition[]> {
    const url = `${environment.backendUrl}/products/additions`;
    const params = new HttpParams().set(
      INCLUDE_DISABLED_PARAMETER,
      includeDisabled
    );
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<ProductAddition[]>(url, { headers, params }).pipe(
      map((rawData) => this.cleanProductAdditionsFromService(rawData)),
      tap((data) => console.log('Retrieved product additions', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get all products in the system
   *
   * @param includeDisabled Whether to include disabled products in the returned list
   */
  public getProducts(includeDisabled: boolean = false): Observable<Product[]> {
    const url = `${environment.backendUrl}/products`;
    const params = new HttpParams().set(
      INCLUDE_DISABLED_PARAMETER,
      includeDisabled
    );
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<Product[]>(url, { headers, params }).pipe(
      map((rawData) => this.cleanProductsFromService(rawData)),
      tap((data) => console.log('Retrieved products', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Add or update a product in the system
   * User context used to enforce admin access to the system
   * @param product product definition
   */
  public upsertProduct(product: Product): Observable<Product> {
    const url = `${environment.backendUrl}/products`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.post<Product>(url, product, { headers }).pipe(
      map((rawData) => this.cleanProductFromService(rawData)),
      tap((data) => console.log('Upserted product', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Add or update a product addition in the system
   * User context used to enforce admin access to the system
   * @param addition product addition definition
   */
  public upsertProductAddition(
    addition: ProductAddition
  ): Observable<ProductAddition> {
    const url = `${environment.backendUrl}/products/additions`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.post<ProductAddition>(url, addition, { headers }).pipe(
      map((rawData) => this.cleanProductAdditionFromService(rawData)),
      tap((data) => console.log('Upserted product addition', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
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
