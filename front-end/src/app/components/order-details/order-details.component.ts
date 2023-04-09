import { Component } from '@angular/core';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { Observable, delay, of } from 'rxjs';
import { Order } from 'src/app/model/models';
import { OrderService } from 'src/app/shared/order.service';

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
  order$: Observable<Order>;

  constructor(
    private router: Router,
    private orderService: OrderService,
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
      this.order$ = orderService.getOrder(orderId);
    }
  }

  private _getRouteState(navigation: Navigation | null): RouteState {
    const order = navigation?.extras?.state?.['order'];
    return { order };
  }
}
