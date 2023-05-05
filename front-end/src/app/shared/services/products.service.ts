import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, retry, tap } from 'rxjs';

import { OrderItem, Product, ProductAddition } from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';

const INCLUDE_DISABLED_PARAMETER = 'includeDisabled';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  constructor(private http: HttpClient) {}

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

  public static convertToOrderItem(product: Product): OrderItem {
    return {
      productId: product.id,
      basePrice: product.basePrice,
      coffeeType: product.allowedCoffeeTypes[0],
      milkType: product.allowedMilkTypes?.[0],
    };
  }
}
