import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  CreateOrder,
  Order,
  OrderRating,
  OrderStatus,
} from 'src/app/model/models';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  orders = new Map<string, Order>();

  constructor() {}

  /**
   * Get an order by ID
   * Access control for the order will be enforced via the user context
   * @param id Order ID
   */
  public getOrder(id: string): Observable<Order> {
    if (this.orders.has(id)) {
      return of(this.orders.get(id)!).pipe(delay(2500));
    } else {
      return throwError(() => new Error('Order not found'));
    }
  }

  /**
   * Get all orders from the current user&#x27;s history
   */
  public getOrderHistory(): Observable<Order[]> {
    return of([...this.orders.values()]).pipe(delay(2500));
  }

  /**
   * Get all ratings for an order
   * Access control for the order will be enforced via the user context
   * @param id Order ID
   */
  public getOrderRatings(id: string): Observable<OrderRating[]> {
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
    return throwError(() => new Error('undefined'));
  }

  /**
   * Submit a new order
   *
   * @param createOrder
   */
  public submitOrder(createOrder: CreateOrder): Observable<Order> {
    const orderId = new Date().getTime().toString();
    const order: Order = {
      id: orderId,
      ...createOrder,
      orderStatus: OrderStatus.RECEIVED,
    };

    this.orders.set(orderId, order);
    return of(order).pipe(delay(2500));
  }
}
