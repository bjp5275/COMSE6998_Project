import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  CoffeeType,
  CreateOrder,
  MilkType,
  Order,
  OrderRating,
  OrderStatus,
} from 'src/app/model/models';

const ORDER: Order = {
  id: 'default',
  items: [
    {
      id: '0',
      coffeeType: CoffeeType.REGULAR,
      milkType: MilkType.ALMOND,
      productId: 'cafe-americano',

      additions: [
        {
          id: 'pumpkin-spice-syrup',
          name: 'Pumpkin Spice Syrup',
          price: 0.75,
        },
      ],
    },
  ],
  deliveryTime: new Date(),
  payment: {
    nameOnCard: 'Joe Smith',
    cardNumber: '1234987612349876',
    cvv: '123',
  },
  deliveryLocation: {
    streetAddress: '123 Main Street',
    city: 'Sesame City',
    state: 'GA',
    zip: '12345',
  },
};

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  orders = new Map<string, Order>();

  constructor() {
    this.orders.set(ORDER.id!, ORDER);
  }

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
    return throwError(() => new Error('undefined'));
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
