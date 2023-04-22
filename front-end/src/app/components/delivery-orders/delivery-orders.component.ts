import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  catchError,
  first,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { DeliveryOrder } from 'src/app/model/models';
import { LocationPipe } from 'src/app/shared/pipes/location.pipe';
import { DeliveryService } from 'src/app/shared/services/delivery.service';
import { HttpError, ObservableUtils } from 'src/app/shared/utility';
import { CustomOrder, OrderAction } from '../order-list/order-list.component';

export type DeliveryOrdersType = 'HISTORY' | 'AVAILABLE';
export const DeliveryOrdersType = {
  AVAILABLE: 'AVAILABLE' as DeliveryOrdersType,
  HISTORY: 'HISTORY' as DeliveryOrdersType,
};

@Component({
  selector: 'app-delivery-orders',
  templateUrl: './delivery-orders.component.html',
  styleUrls: ['./delivery-orders.component.scss'],
})
export class DeliveryOrdersComponent {
  readonly ORDER_TYPE_TEMPLATE!: CustomOrder<DeliveryOrder>;
  readonly AVAILABLE_ORDER_ACTIONS: OrderAction<DeliveryOrder>[] = [
    {
      buttonText: 'Accept',
      color: 'primary',
      onClick: (_orderItems, _index, order) => {
        this.secureOrder(order.id);
      },
    },
  ];
  readonly HISTORY_ORDER_ACTIONS: OrderAction<DeliveryOrder>[] = [
    {
      buttonText: 'Details',
      color: 'primary',
      onClick: (_orderItems, _index, order) => {
        this.goToOrder(order.id);
      },
    },
  ];

  deliveryOrderType$: Observable<DeliveryOrdersType>;
  deliveryOrders$: Observable<CustomOrder<DeliveryOrder>[]>;

  constructor(
    private deliveryService: DeliveryService,
    private snackBar: MatSnackBar,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.deliveryOrderType$ = route.data.pipe(
      map((data) => data['type'] as DeliveryOrdersType)
    );

    this.deliveryOrders$ = this.deliveryOrderType$.pipe(
      switchMap((ordersType) => {
        switch (ordersType) {
          case DeliveryOrdersType.AVAILABLE:
            return deliveryService
              .getAvailableDeliveries()
              .pipe(ObservableUtils.pollAfterData());

          case DeliveryOrdersType.HISTORY:
            return deliveryService.getHistoricalDeliveries();
          default:
            return throwError(() =>
              Error(`Unknown delivery orders type: ${ordersType}`)
            );
        }
      }),
      catchError((err: HttpError) => {
        snackBar.open(`Failed to load orders: ${err.errorMessage}`, 'Dismiss');
        return of([] as DeliveryOrder[]);
      }),
      map((orders) => {
        const customOrders: CustomOrder<DeliveryOrder>[] = [];
        orders.forEach((order) =>
          customOrders.push({
            name: order.id,
            subtitle: LocationPipe.convert(order.deliveryLocation),
            items: order.items,
            data: order,
          })
        );

        return customOrders;
      })
    );
  }

  getOrderActions(orderType: DeliveryOrdersType): OrderAction<DeliveryOrder>[] {
    switch (orderType) {
      case DeliveryOrdersType.AVAILABLE:
        return this.AVAILABLE_ORDER_ACTIONS;
      case DeliveryOrdersType.HISTORY:
        return this.HISTORY_ORDER_ACTIONS;
      default:
        return [];
    }
  }

  secureOrder(orderId: string) {
    this.deliveryService
      .secureDelivery(orderId)
      .pipe(
        first(),
        catchError((err: HttpError) => {
          this.snackBar.open(
            `Failed to secure order: ${err.errorMessage}`,
            'Dismiss'
          );
          return of(false);
        })
      )
      .subscribe((success) => {
        if (success) {
          this.goToOrder(orderId);
        }
      });
  }

  goToOrder(orderId: string) {
    this.router.navigate(['/delivery/status'], {
      queryParams: { id: orderId },
    });
  }
}
