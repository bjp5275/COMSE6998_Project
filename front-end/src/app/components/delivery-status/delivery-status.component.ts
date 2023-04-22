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
import { DeliveryOrder, OrderStatus } from 'src/app/model/models';
import { DeliveryService } from 'src/app/shared/services/delivery.service';
import { HttpError } from 'src/app/shared/utility';

@Component({
  selector: 'app-delivery-status',
  templateUrl: './delivery-status.component.html',
  styleUrls: ['./delivery-status.component.scss'],
})
export class DeliveryStatusComponent {
  orderId: string;
  order$: Observable<DeliveryOrder | null>;
  private pullOrder$ = new BehaviorSubject(null);

  updatingOrder = false;

  constructor(
    private snackBar: MatSnackBar,
    private deliveryService: DeliveryService,
    router: Router,
    activatedRoute: ActivatedRoute
  ) {
    const orderId = activatedRoute.snapshot.queryParamMap.get('id');
    if (!orderId) {
      console.log('ERROR: No order ID specified! Navigating back to safety...');
      router.navigateByUrl('/delivery/available');
      throw new Error('No order ID!');
    }
    this.orderId = orderId;

    this.order$ = this.pullOrder$.pipe(
      switchMap(() =>
        deliveryService.getDelivery(orderId).pipe(
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

  pickUpOrder(order: DeliveryOrder) {
    this.updateStatus(order, OrderStatus.PICKED_UP);
  }

  deliverOrder(order: DeliveryOrder) {
    this.updateStatus(order, OrderStatus.DELIVERED);
  }

  private updateStatus(order: DeliveryOrder, status: OrderStatus) {
    this.updatingOrder = true;
    this.deliveryService
      .updateOrderStatus(order.id, status)
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
