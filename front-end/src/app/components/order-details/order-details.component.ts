import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  catchError,
  combineLatest,
  concat,
  first,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  FavoriteOrder,
  Order,
  OrderItem,
  OrderRating,
  OrderStatus,
  Product,
} from 'src/app/model/models';
import { OrderService } from 'src/app/shared/services/order.service';
import { UserService } from 'src/app/shared/services/user.service';
import { HttpError, ObservableUtils } from 'src/app/shared/utility';
import {
  RateOrderItemDialog,
  RatingInput,
} from '../dialogs/rate-order-item/rate-order-item.component';
import { OrderItemAction } from '../order-item-list/order-item-list.component';

interface RouteState {
  order?: Order;
}

interface OrderDetails {
  order: Order;
  orderRatings?: OrderRating[];
}

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss'],
})
export class OrderDetailsComponent {
  readonly DELIVERED_ACTIONS: OrderItemAction[] = [
    {
      buttonText: 'Rate',
      color: 'primary',
      onClick: (product, orderItem, _index) =>
        this.rateItem(orderItem, product),
      show: (_product, orderItem, _index, rating) =>
        !rating && !this.submittedRatingsItemIds.includes(orderItem.id!),
    },
  ];

  routeState: RouteState;
  orderId: string;
  order$: Observable<Order>;
  orderRatings$: Observable<OrderRating[]>;
  pullOrderRatings$ = new BehaviorSubject(null);
  orderDetails$: Observable<OrderDetails>;
  submittedRatingsItemIds: string[] = [];
  isFavorite = false;

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
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
    const orderPolling$ = orderService.getOrder(orderId).pipe(
      ObservableUtils.pollAfterData({
        takeWhilePredicate: (value) =>
          value.orderStatus != OrderStatus.DELIVERED,
      }),
      catchError((err: HttpError) => {
        this.snackBar.open(
          `Failed to load order: ${err.errorMessage}`,
          'Dismiss'
        );
        return EMPTY;
      })
    );

    this.orderRatings$ = this.pullOrderRatings$.pipe(
      switchMap(() => orderService.getOrderRatings(orderId))
    );

    if (this.routeState.order) {
      this.order$ = concat(of(this.routeState.order), orderPolling$);
    } else {
      this.order$ = orderPolling$;
    }

    this.orderDetails$ = combineLatest([this.order$, this.orderRatings$]).pipe(
      map(([order, orderRatings]) => ({ order, orderRatings }))
    );
  }

  private _getRouteState(navigation: Navigation | null): RouteState {
    const order = navigation?.extras?.state?.['order'];
    return { order };
  }

  rateItem(orderItem: OrderItem, product: Product) {
    const ratingInput: RatingInput = {
      orderId: this.orderId,
      orderItem,
      product,
    };

    this.dialog
      .open(RateOrderItemDialog, { data: ratingInput })
      .afterClosed()
      .subscribe((success: boolean) => {
        if (success) {
          this.submittedRatingsItemIds.push(orderItem.id!);
          this.pullOrderRatings$.next(null);
        }
      });
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
