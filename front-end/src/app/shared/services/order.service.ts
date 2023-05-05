import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  map,
  of,
  retry,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import {
  CreateOrder,
  Order,
  OrderItem,
  OrderRating,
  Product,
  ProductAddition,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';
import { ProductsService } from './products.service';

export function cleanOrderItemFromService(item: OrderItem): OrderItem {
  if (!item) {
    return item;
  }

  if (item.basePrice) {
    item.basePrice = HttpUtils.convertDecimalFromString(item.basePrice)!;
  }

  if (item.additions) {
    item.additions = item.additions.map((addition) => {
      addition.price = HttpUtils.convertDecimalFromString(addition.price)!;
      return addition;
    });
  }
  return item;
}

export function cleanOrderItemsFromService(items: OrderItem[]): OrderItem[] {
  if (items) {
    items = items.map((item) => cleanOrderItemFromService(item));
  }
  return items;
}

export interface ValidatedOrderItems {
  orderItems: OrderItem[];
  errors?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(private http: HttpClient) {}

  private cleanOrderFromService(order: Order): Order {
    if (order) {
      if (order.deliveryTime) {
        order.deliveryTime = new Date(order.deliveryTime);
      }
      order.items = cleanOrderItemsFromService(order.items);
    }

    return order;
  }

  private cleanOrdersFromService(orders: Order[]): Order[] {
    if (orders) {
      orders = orders.map((order) => this.cleanOrderFromService(order));
    }

    return orders;
  }

  /**
   * Get an order by ID
   * Access control for the order will be enforced via the user context
   * @param id Order ID
   */
  public getOrder(id: string): Observable<Order> {
    const url = `${environment.backendUrl}/orders/${id}`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<Order>(url, { headers }).pipe(
      map((rawData) => this.cleanOrderFromService(rawData)),
      tap((data) => console.log('Retrieved order', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get all orders from the current user&#x27;s history
   */
  public getOrderHistory(): Observable<Order[]> {
    const url = `${environment.backendUrl}/orders`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<Order[]>(url, { headers }).pipe(
      map((rawData) => this.cleanOrdersFromService(rawData)),
      tap((data) => console.log('Retrieved orders', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get all ratings for an order
   * Access control for the order will be enforced via the user context
   * @param id Order ID
   */
  public getOrderRatings(id: string): Observable<OrderRating[]> {
    const url = `${environment.backendUrl}/orders/${id}/ratings`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<OrderRating[]>(url, { headers }).pipe(
      tap((data) => console.log('Got order ratings', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Rate an item in an order
   * Access control for the order will be enforced via the user context
   * @param id Order ID
   * @param orderRating
   */
  public rateOrderItem(
    id: string,
    orderRating: OrderRating
  ): Observable<boolean> {
    const url = `${environment.backendUrl}/orders/${id}/ratings`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http
      .put(url, orderRating, { headers, observe: 'response' })
      .pipe(
        switchMap((response) => {
          if (response.ok) {
            return of(true);
          } else {
            return throwError(() => response.body);
          }
        }),
        retry(HttpUtils.RETRY_ATTEMPTS),
        catchError((error) => HttpUtils.handleError(error))
      );
  }

  /**
   * Submit a new order
   *
   * @param createOrder
   */
  public submitOrder(createOrder: CreateOrder): Observable<Order> {
    const url = `${environment.backendUrl}/orders`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.post<Order>(url, createOrder, { headers }).pipe(
      map((rawData) => this.cleanOrderFromService(rawData)),
      tap((data) => console.log('Created order', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  private static validateOrderItem(
    orderItem: OrderItem,
    index: number,
    productMap: Map<string, Product>,
    productAdditionsMap: Map<string, Map<string, ProductAddition>>,
    errors: string[]
  ): OrderItem | null {
    const product = productMap.get(orderItem.productId);
    if (!product) {
      errors.push(`Order item ${index + 1} is not available`);
      return null;
    }

    const newOrderItem = ProductsService.convertToOrderItem(product);
    if (!product.allowedCoffeeTypes.includes(orderItem.coffeeType)) {
      const defaultedCoffeeType = product.allowedCoffeeTypes[0];
      errors.push(
        `${product.name} is not available with ${convertCoffeeTypeToString(
          orderItem.coffeeType
        )} - defaulting to ${convertCoffeeTypeToString(defaultedCoffeeType)}`
      );

      orderItem.coffeeType = defaultedCoffeeType;
    }
    newOrderItem.coffeeType = orderItem.coffeeType;

    const milkType = orderItem.milkType;
    const allowedMilkTypes = product.allowedMilkTypes;
    if (
      (!milkType && allowedMilkTypes?.length) ||
      (milkType && allowedMilkTypes && !allowedMilkTypes.includes(milkType))
    ) {
      const defaultedMilkType = allowedMilkTypes[0];
      errors.push(
        `${
          product.name
        } requires a valid milk selection - defaulting to ${convertMilkTypeToString(
          defaultedMilkType
        )}`
      );
      orderItem.milkType = defaultedMilkType;
    } else if (milkType && !allowedMilkTypes?.length) {
      errors.push(`${product.name} no longer has a milk selection`);
      orderItem.milkType = undefined;
    }
    newOrderItem.milkType = orderItem.milkType;

    if (orderItem.additions?.length) {
      const validatedAdditions: ProductAddition[] = [];
      const allowedAdditions = productAdditionsMap.get(product.id)!;

      orderItem.additions.forEach((addition) => {
        const validAddition = allowedAdditions.get(addition.id!);
        if (validAddition) {
          validatedAdditions.push(validAddition);
        } else {
          errors.push(`${product.name} no longer allows ${addition.name}.`);
        }
      });

      newOrderItem.additions = validatedAdditions;
    }

    return newOrderItem;
  }

  public static validateOrderItems(
    orderItems: OrderItem[],
    products: Product[]
  ): ValidatedOrderItems {
    const productMap = new Map<string, Product>();
    const productAdditionsMap = new Map<string, Map<string, ProductAddition>>();
    products.forEach((product) => {
      productMap.set(product.id, product);
      const additionMap = new Map<string, ProductAddition>();
      productAdditionsMap.set(product.id, additionMap);
      product.allowedAdditions?.forEach((addition) =>
        additionMap.set(addition.id!, addition)
      );
    });

    const errors: string[] = [];
    const validatedOrderItems: OrderItem[] = [];
    orderItems
      .map((orderItem, index) =>
        this.validateOrderItem(
          orderItem,
          index,
          productMap,
          productAdditionsMap,
          errors
        )
      )
      .filter((item) => item !== null)
      .forEach((validOrderItem) => validatedOrderItems.push(validOrderItem!));

    return { orderItems: validatedOrderItems, errors };
  }
}
