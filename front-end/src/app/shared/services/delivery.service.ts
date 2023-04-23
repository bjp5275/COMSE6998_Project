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
import { DeliveryOrder, OrderStatus } from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';
import { cleanOrderItemsFromService } from './order.service';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  private cleanOrderFromService(order: DeliveryOrder): DeliveryOrder {
    if (order) {
      if (order.deliveryTime) {
        order.deliveryTime = new Date(order.deliveryTime);
      }
      if (order.deliveryFee) {
        order.deliveryFee = HttpUtils.convertDecimalFromString(
          order.deliveryFee
        )!;
      }
      order.items = cleanOrderItemsFromService(order.items);
    }

    return order;
  }

  private cleanOrdersFromService(orders: DeliveryOrder[]): DeliveryOrder[] {
    if (orders) {
      orders = orders.map((order) => this.cleanOrderFromService(order));
    }

    return orders;
  }

  constructor(private http: HttpClient) {}

  /**
   * Get all orders available for delivery pickup
   */
  public getAvailableDeliveries(): Observable<DeliveryOrder[]> {
    const url = `${environment.backendUrl}/deliveries/available`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<DeliveryOrder[]>(url, { headers }).pipe(
      map((rawData) => this.cleanOrdersFromService(rawData)),
      tap((data) => console.log('Retrieved delivery orders', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get all historical deliveries for the current user
   */
  public getHistoricalDeliveries(): Observable<DeliveryOrder[]> {
    const url = `${environment.backendUrl}/deliveries`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<DeliveryOrder[]>(url, { headers }).pipe(
      map((rawData) => this.cleanOrdersFromService(rawData)),
      tap((data) => console.log('Retrieved historical delivery orders', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get the delivery order details
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   */
  public getDelivery(id: string): Observable<DeliveryOrder> {
    const url = `${environment.backendUrl}/deliveries/${id}`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<DeliveryOrder>(url, { headers }).pipe(
      map((rawData) => this.cleanOrderFromService(rawData)),
      tap((data) => console.log('Retrieved delivery order', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Secure an order for delivery pickup
   * Uses the user context to determine which deliverer the order will be assigned to
   * @param id Order ID
   */
  public secureDelivery(id: string): Observable<boolean> {
    const url = `${environment.backendUrl}/deliveries/${id}/secure`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.post(url, null, { headers, observe: 'response' }).pipe(
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
   * Update an order's delivery status
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   * @param newStatus New order status
   */
  public updateDeliveryStatus(
    id: string,
    newStatus: OrderStatus
  ): Observable<boolean> {
    const url = `${environment.backendUrl}/deliveries/${id}/status?newStatus=${newStatus}`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.post(url, null, { headers, observe: 'response' }).pipe(
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
}
