import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, switchMap } from 'rxjs';
import { FavoriteOrder } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
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
        orderItems.forEach((item) => this.cartService.addItem(item));
        this.router.navigate(['/cart']);
      },
    },
  ];

  orders$: Observable<CustomOrder<FavoriteOrder>[]>;
  private pullOrders$ = new BehaviorSubject(null);

  constructor(
    userService: UserService,
    private cartService: CartService,
    private router: Router,
    private dialog: MatDialog
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
