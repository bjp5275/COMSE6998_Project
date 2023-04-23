import { Injectable } from '@angular/core';
import { Observable, delay, map, of, switchMap, throwError } from 'rxjs';
import { OrderStatus, PendingOrder } from 'src/app/model/models';
import { OrderService } from './order.service';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private updatedStatuses = new Map<string, OrderStatus>();

  constructor(private orderService: OrderService) {}

  private getOrders(): Observable<PendingOrder[]> {
    return this.orderService.getOrderHistory().pipe(
      map((orders) => {
        const pendingOrders: PendingOrder[] = [];
        orders.forEach((order) => {
          pendingOrders.push({
            id: order.id!,
            orderStatus:
              this.updatedStatuses.get(order.id!) ||
              (order.deliveryTime <= new Date()
                ? OrderStatus.MADE
                : OrderStatus.RECEIVED),
            deliveryLocation: order.deliveryLocation,
            deliveryTime: order.deliveryTime,
            commission: 5,
            items: order.items,
          });
        });
        return pendingOrders;
      })
    );
  }

  /**
   * Get all orders available for preparation
   */
  public getAvailablePendingOrders(): Observable<PendingOrder[]> {
    // TODO - Implement properly
    return this.getOrders().pipe(
      map((orders) => orders.filter((order) => order.deliveryTime > new Date()))
    );
  }

  /**
   * Get all orders prepared by the current shop
   */
  public getHistoricalOrdersPrepared(): Observable<PendingOrder[]> {
    // TODO - Implement properly
    return this.getOrders().pipe(
      map((orders) =>
        orders.filter((order) => order.deliveryTime <= new Date())
      )
    );
  }

  /**
   * Get the pending order details
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   */
  public getPendingOrder(id: string): Observable<PendingOrder> {
    // TODO - Implement properly
    return this.getOrders().pipe(
      map((orders) => orders.find((order) => order.id == id) || null),
      switchMap((order) => {
        if (order) {
          return of(order);
        } else {
          return throwError(() => new Error('Not found'));
        }
      })
    );
  }

  /**
   * Secure an order for preparation
   * Uses the user context to determine which shop the order will be assigned to
   * @param id Order ID
   */
  public securePendingOrder(id: string): Observable<boolean> {
    // TODO - Implement properly
    return of(true).pipe(delay(1000));
  }

  /**
   * Update an in-preparation order's status
   * User context must be the shop assigned to the order
   * @param id Order ID
   * @param newStatus New order status
   */
  public updatePendingOrderStatus(
    id: string,
    newStatus: OrderStatus
  ): Observable<boolean> {
    // TODO - Implement properly
    this.updatedStatuses.set(id, newStatus);
    return of(true).pipe(delay(1000));
  }
}
