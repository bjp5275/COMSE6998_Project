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
import { PendingOrder } from 'src/app/model/models';
import { ShopService } from 'src/app/shared/services/shop.service';
import { HttpError, ObservableUtils } from 'src/app/shared/utility';
import { CustomOrder, OrderAction } from '../order-list/order-list.component';

export type PendingOrdersType = 'HISTORY' | 'AVAILABLE';
export const PendingOrdersType = {
  AVAILABLE: 'AVAILABLE' as PendingOrdersType,
  HISTORY: 'HISTORY' as PendingOrdersType,
};

@Component({
  selector: 'app-pending-orders',
  templateUrl: './pending-orders.component.html',
  styleUrls: ['./pending-orders.component.scss'],
})
export class PendingOrdersComponent {
  readonly ORDER_TYPE_TEMPLATE!: CustomOrder<PendingOrder>;
  readonly AVAILABLE_ORDER_ACTIONS: OrderAction<PendingOrder>[] = [
    {
      buttonText: 'Accept',
      color: 'primary',
      onClick: (_orderItems, _index, order) => {
        this.secureOrder(order.id);
      },
    },
  ];
  readonly HISTORY_ORDER_ACTIONS: OrderAction<PendingOrder>[] = [
    {
      buttonText: 'Details',
      color: 'primary',
      onClick: (_orderItems, _index, order) => {
        this.goToOrder(order.id);
      },
    },
  ];

  pendingOrderType$: Observable<PendingOrdersType>;
  pendingOrders$: Observable<CustomOrder<PendingOrder>[]>;
  securingOrder = false;

  constructor(
    private shopService: ShopService,
    private snackBar: MatSnackBar,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.pendingOrderType$ = route.data.pipe(
      map((data) => data['type'] as PendingOrdersType)
    );

    this.pendingOrders$ = this.pendingOrderType$.pipe(
      switchMap((ordersType) => {
        switch (ordersType) {
          case PendingOrdersType.AVAILABLE:
            return shopService
              .getAvailablePendingOrders()
              .pipe(ObservableUtils.pollAfterData());

          case PendingOrdersType.HISTORY:
            return shopService.getHistoricalOrdersPrepared();
          default:
            return throwError(() =>
              Error(`Unknown pending orders type: ${ordersType}`)
            );
        }
      }),
      catchError((err: HttpError) => {
        snackBar.open(`Failed to load orders: ${err.errorMessage}`, 'Dismiss');
        return of([] as PendingOrder[]);
      }),
      map((orders) => {
        const customOrders: CustomOrder<PendingOrder>[] = [];
        orders.forEach((order) =>
          customOrders.push({
            name: order.id,
            subtitle: order.deliveryTime.toLocaleString(),
            items: order.items,
            data: order,
          })
        );

        return customOrders;
      })
    );
  }

  getOrderActions(orderType: PendingOrdersType): OrderAction<PendingOrder>[] {
    switch (orderType) {
      case PendingOrdersType.AVAILABLE:
        return this.AVAILABLE_ORDER_ACTIONS;
      case PendingOrdersType.HISTORY:
        return this.HISTORY_ORDER_ACTIONS;
      default:
        return [];
    }
  }

  secureOrder(orderId: string) {
    this.securingOrder = true;
    this.shopService
      .securePendingOrder(orderId)
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
          this.goToOrderOnceSecured(orderId);
        } else {
          this.securingOrder = false;
        }
      });
  }

  goToOrderOnceSecured(orderId: string) {
    this.shopService
      .getPendingOrder(orderId)
      .pipe(
        map(() => true),
        catchError(() => of(false)),
        ObservableUtils.pollAfterData({
          pollInterval: 1000,
          takeWhilePredicate: (value, _index) => !value,
          inclusiveTakeWhile: true,
        })
      )
      .subscribe({
        complete: () => this.goToOrder(orderId),
      });
  }

  goToOrder(orderId: string) {
    this.router.navigate(['/pending/status'], {
      queryParams: { id: orderId },
    });
  }
}
