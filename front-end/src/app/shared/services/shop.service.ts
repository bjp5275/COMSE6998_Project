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
import { OrderStatus, PendingOrder } from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';
import { OrderService, cleanOrderItemsFromService } from './order.service';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private cleanOrderFromService(order: PendingOrder): PendingOrder {
    if (order) {
      if (order.deliveryTime) {
        order.deliveryTime = new Date(order.deliveryTime);
      }
      if (order.commission) {
        order.commission = HttpUtils.convertDecimalFromString(
          order.commission
        )!;
      }
      order.items = cleanOrderItemsFromService(order.items);
    }

    return order;
  }

  private cleanOrdersFromService(orders: PendingOrder[]): PendingOrder[] {
    if (orders) {
      orders = orders.map((order) => this.cleanOrderFromService(order));
    }

    return orders;
  }

  constructor(private orderService: OrderService, private http: HttpClient) {}

  /**
   * Get all orders available for preparation
   */
  public getAvailablePendingOrders(): Observable<PendingOrder[]> {
    const url = `${environment.backendUrl}/pending-orders/available`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<PendingOrder[]>(url, { headers }).pipe(
      map((rawData) => this.cleanOrdersFromService(rawData)),
      tap((data) => console.log('Retrieved pending orders', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get all orders prepared by the current shop
   */
  public getHistoricalOrdersPrepared(): Observable<PendingOrder[]> {
    const url = `${environment.backendUrl}/pending-orders`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<PendingOrder[]>(url, { headers }).pipe(
      map((rawData) => this.cleanOrdersFromService(rawData)),
      tap((data) => console.log('Retrieved historical pending orders', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Get the pending order details
   * User context must be the deliverer assigned to the order
   * @param id Order ID
   */
  public getPendingOrder(id: string): Observable<PendingOrder> {
    const url = `${environment.backendUrl}/pending-orders/${id}`;
    const headers = HttpUtils.getBaseHeaders();

    return this.http.get<PendingOrder>(url, { headers }).pipe(
      map((rawData) => this.cleanOrderFromService(rawData)),
      tap((data) => console.log('Retrieved pending order', data)),
      retry(HttpUtils.RETRY_ATTEMPTS),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  /**
   * Secure an order for preparation
   * Uses the user context to determine which shop the order will be assigned to
   * @param id Order ID
   */
  public securePendingOrder(id: string): Observable<boolean> {
    const url = `${environment.backendUrl}/pending-orders/${id}/secure`;
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
   * Update an in-preparation order's status
   * User context must be the shop assigned to the order
   * @param id Order ID
   * @param newStatus New order status
   */
  public updatePendingOrderStatus(
    id: string,
    newStatus: OrderStatus
  ): Observable<boolean> {
    const url = `${environment.backendUrl}/pending-orders/${id}/status?newStatus=${newStatus}`;
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
