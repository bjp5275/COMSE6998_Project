import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, catchError, first, map, of, shareReplay } from 'rxjs';
import { Order, OrderItem, Product } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { OrderService } from 'src/app/shared/services/order.service';
import { ProductsService } from 'src/app/shared/services/products.service';
import { HttpError } from 'src/app/shared/utility';
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
        this.reorder(orderItems);
      },
    },
  ];

  orders$: Observable<CustomOrder<Order>[]>;
  products$: Observable<Product[] | null>;
  reordering = false;

  constructor(
    orderService: OrderService,
    private cartService: CartService,
    private productService: ProductsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.orders$ = orderService.getOrderHistory().pipe(
      catchError((err: HttpError) => {
        snackBar.open(
          `Failed to load order history: ${err.errorMessage}`,
          'Dismiss'
        );
        return of([] as Order[]);
      }),
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

    // Get products in anticipation of a reorder and prime the observable for the value
    this.products$ = this.productService.getProducts().pipe(
      catchError(() => of(null)),
      first(),
      shareReplay()
    );
    this.products$.subscribe((products) => {
      if (!products) {
        console.log('Failed to load products');
      }
    });
  }

  reorder(orderItems: OrderItem[]) {
    this.reordering = true;

    // Validate order items are still available
    this.products$.subscribe({
      next: (products) => {
        if (!products) {
          this.snackBar.open(
            'Unable to validate products - please try again',
            'OK'
          );
        } else {
          const validation = OrderService.validateOrderItems(
            orderItems,
            products
          );
          const validatedOrderItems = validation.orderItems;

          if (validation.errors?.length) {
            const issueMessage = `Issues: \n  -${validation.errors.join(
              '\n  -'
            )}`;
            this.snackBar.open(issueMessage, 'OK', {
              duration: 8000,
              panelClass: ['multiline-snackbar'],
            });
          }

          if (validatedOrderItems.length) {
            validatedOrderItems.forEach((item) =>
              this.cartService.addItem(item)
            );
            this.router.navigate(['/cart']);
          } else {
            this.snackBar.open(
              'All products in order are no longer available',
              'OK'
            );
          }
        }
      },
      complete: () => (this.reordering = false),
    });
  }
}
