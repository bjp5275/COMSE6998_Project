import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { DeliveryOrder, OrderStatus } from 'src/app/model/models';
import { OrderService } from './order.service';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  constructor(private orderService: OrderService) {}

  private getOrders(): Observable<DeliveryOrder[]> {
    return this.orderService.getOrderHistory().pipe(
      map((orders) => {
        const deliveryOrders: DeliveryOrder[] = [];
        orders.forEach((order) => {
          deliveryOrders.push({
            id: order.id!,
            deliveryLocation: order.deliveryLocation,
            deliveryTime: order.deliveryTime,
            deliveryFee: 5,
            preparedLocation: order.deliveryLocation,
            items: order.items,
          });
        });
        return deliveryOrders;
      })
    );
  }

  /**
   * Get all orders available for delivery pickup
   */
  public getAvailableDeliveries(): Observable<DeliveryOrder[]> {
    // TODO - Implement properly
    return this.getOrders().pipe(
      map((orders) => orders.filter((order) => order.deliveryTime > new Date()))
    );
  }

  /**
   * Get all historical deliveries for the current user
   */
  public getHistoricalDeliveries(): Observable<DeliveryOrder[]> {
    // TODO - Implement properly
    return this.getOrders().pipe(
      map((orders) =>
        orders.filter((order) => order.deliveryTime <= new Date())
      )
    );
  }

  /**
   * Get the delivery order details
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   */
  public getDelivery(id: string): Observable<DeliveryOrder> {
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
   * Secure an order for delivery pickup
   * Uses the user context to determine which deliverer the order will be assigned to
   * @param id Order ID
   */
  public secureOrder(id: string): Observable<boolean> {
    // TODO - Implement properly
    return of(true);
  }

  /**
   * Update an order's delivery status
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   * @param newStatus New order status
   */
  public updateOrderStatus(
    id: string,
    newStatus: OrderStatus
  ): Observable<boolean> {
    return throwError(() => new Error('undefined'));
  }
}
