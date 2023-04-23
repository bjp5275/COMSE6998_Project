import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  first,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { PendingOrder, OrderStatus } from 'src/app/model/models';
import { ShopService } from 'src/app/shared/services/shop.service';
import { HttpError } from 'src/app/shared/utility';

@Component({
  selector: 'app-pending-order-status',
  templateUrl: './pending-order-status.component.html',
  styleUrls: ['./pending-order-status.component.scss'],
})
export class PendingOrderStatusComponent {
  orderId: string;
  order$: Observable<PendingOrder | null>;
  private pullOrder$ = new BehaviorSubject(null);

  updatingOrder = false;

  constructor(
    private snackBar: MatSnackBar,
    private shopService: ShopService,
    router: Router,
    activatedRoute: ActivatedRoute
  ) {
    const orderId = activatedRoute.snapshot.queryParamMap.get('id');
    if (!orderId) {
      console.log('ERROR: No order ID specified! Navigating back to safety...');
      router.navigateByUrl('/pending/available');
      throw new Error('No order ID!');
    }
    this.orderId = orderId;

    this.order$ = this.pullOrder$.pipe(
      switchMap(() =>
        shopService.getPendingOrder(orderId).pipe(
          tap(() => (this.updatingOrder = false)),
          catchError((err: HttpError) => {
            this.snackBar.open(
              `Failed to load order: ${err.errorMessage}`,
              'Dismiss'
            );
            return of(null);
          })
        )
      )
    );
  }

  orderMade(order: PendingOrder) {
    this.updateStatus(order, OrderStatus.MADE);
  }

  private updateStatus(order: PendingOrder, status: OrderStatus) {
    this.updatingOrder = true;
    this.shopService
      .updatePendingOrderStatus(order.id, status)
      .pipe(
        first(),
        catchError((err: HttpError) => {
          this.snackBar.open(
            `Failed to update order: ${err.errorMessage}`,
            'Dismiss'
          );
          return of(false);
        })
      )
      .subscribe((success) => {
        if (success) {
          this.pullOrder$.next(null);
        } else {
          this.updatingOrder = false;
        }
      });
  }
}
