import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  first,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { FavoriteOrder, OrderItem, Product } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { OrderService } from 'src/app/shared/services/order.service';
import { ProductsService } from 'src/app/shared/services/products.service';
import { UserService } from 'src/app/shared/services/user.service';
import { EditFavoriteDialog } from '../dialogs/edit-favorite/edit-favorite.component';
import { CustomOrder, OrderAction } from '../order-list/order-list.component';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
})
export class FavoritesComponent {
  readonly ORDER_ACTIONS: OrderAction<FavoriteOrder>[] = [
    {
      buttonText: 'Rename',
      onClick: (_orderItems, _index, favorite) => {
        this.editFavoriteName(favorite);
      },
    },
    {
      buttonText: 'Add to Cart',
      color: 'primary',
      onClick: (orderItems, _index, _favorite) => {
        this.reorder(orderItems);
      },
    },
  ];

  orders$: Observable<CustomOrder<FavoriteOrder>[]>;
  products$: Observable<Product[] | null>;
  private pullOrders$ = new BehaviorSubject(null);
  reordering = false;

  constructor(
    userService: UserService,
    productService: ProductsService,
    private cartService: CartService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.orders$ = this.pullOrders$.pipe(
      switchMap(() =>
        userService.getFavoriteOrders().pipe(
          map((orders) => {
            const customOrders: CustomOrder<FavoriteOrder>[] = [];
            orders.forEach((order) =>
              customOrders.push({
                name: order.name,
                items: order.items,
                data: order,
              })
            );

            return customOrders;
          })
        )
      )
    );

    // Get products in anticipation of a reorder and prime the observable for the value
    this.products$ = productService.getProducts().pipe(
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

  editFavoriteName(favorite: FavoriteOrder) {
    this.dialog
      .open(EditFavoriteDialog, { data: favorite })
      .afterClosed()
      .subscribe((newName: string) => {
        if (newName) {
          favorite.name = newName;
          this.pullOrders$.next(null);
        }
      });
  }
}
