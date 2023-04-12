import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { Order } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { OrderService } from 'src/app/shared/services/order.service';
import { CustomOrder, OrderAction } from '../order-list/order-list.component';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent {
  readonly ORDER_ACTIONS: OrderAction<Order>[] = [
    {
      buttonText: 'Details',
      onClick: (_orderItems, _index, order) => {
        this.router.navigate(['/order'], {
          queryParams: { id: order.id! },
          state: { order: order },
        });
      },
    },
    {
      buttonText: 'Reorder',
      color: 'primary',
      onClick: (orderItems, _index, _order) => {
        orderItems.forEach((item) => this.cartService.addItem(item));
        this.router.navigate(['/cart']);
      },
    },
  ];

  orders$: Observable<CustomOrder<Order>[]>;

  constructor(
    orderService: OrderService,
    private cartService: CartService,
    private router: Router
  ) {
    this.orders$ = orderService.getOrderHistory().pipe(
      map((orders) => {
        const customOrders: CustomOrder<Order>[] = [];
        orders.forEach((order) =>
          customOrders.push({
            name: order.deliveryTime.toLocaleString(),
            subtitle: order.id,
            items: order.items,
            data: order,
          })
        );

        return customOrders;
      })
    );
  }
}