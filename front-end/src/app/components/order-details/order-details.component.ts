import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { Observable, catchError, delay, first, of } from 'rxjs';
import { FavoriteOrder, Order } from 'src/app/model/models';
import { OrderService } from 'src/app/shared/services/order.service';
import { UserService } from 'src/app/shared/services/user.service';
import { HttpError } from 'src/app/shared/utility';

interface RouteState {
  order?: Order;
}

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss'],
})
export class OrderDetailsComponent {
  routeState: RouteState;
  orderId: string;
  order$: Observable<Order | null>;
  isFavorite = false;

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    orderService: OrderService,
    router: Router,
    activatedRoute: ActivatedRoute
  ) {
    const orderId = activatedRoute.snapshot.queryParamMap.get('id');
    if (!orderId) {
      console.log('ERROR: No order ID specified! Navigating back to safety...');
      router.navigateByUrl('/');
      throw new Error('No order ID!');
    }
    this.orderId = orderId;

    this.routeState = this._getRouteState(router.getCurrentNavigation());
    if (this.routeState.order) {
      this.order$ = of(this.routeState.order).pipe(delay(1000));
    } else {
      this.order$ = orderService.getOrder(orderId).pipe(
        catchError((err: HttpError) => {
          this.snackBar.open(
            `Failed to load order: ${err.errorMessage}`,
            'Dismiss'
          );
          return of(null);
        })
      );
    }
  }

  private _getRouteState(navigation: Navigation | null): RouteState {
    const order = navigation?.extras?.state?.['order'];
    return { order };
  }

  saveAsFavorite(order: Order) {
    const favoriteOrder: FavoriteOrder = {
      name: order.id!,
      items: order.items,
    };
    this.isFavorite = true;
    this.userService
      .addFavoriteOrder(favoriteOrder)
      .pipe(first())
      .subscribe({
        next: (id) => {
          console.log('Saved favorite', id);
          this.snackBar.open('Saved as favorite', 'OK', { duration: 1000 });
        },
        error: (err) => {
          this.isFavorite = false;
          console.log('ERROR: Failed to save favorite', err);
          this.snackBar.open('Failed to save favorite', 'OK');
        },
      });
  }
}
