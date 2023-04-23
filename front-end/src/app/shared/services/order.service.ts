import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, retry, tap, throwError } from 'rxjs';

import {
  CreateOrder,
  Order,
  OrderItem,
  OrderRating,
} from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';

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

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  orders = new Map<string, Order>();

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
    // TODO - implement
    return throwError(() => new Error('undefined'));
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
    // TODO - implement
    return throwError(() => new Error('undefined'));
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
}
