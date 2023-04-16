import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs';
import { CartService } from './shared/services/cart.service';
import {
  UserInformation,
  UserRole,
  UserService,
  convertUserRoleToString,
} from './shared/services/user.service';

type MenuType = 'MENU' | 'ADMIN';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly convertUserRoleToString = convertUserRoleToString;

  userInformation?: UserInformation;
  actingRole: UserRole = UserRole.REGULAR_USER;

  get menuType(): MenuType {
    switch (this.actingRole) {
      case UserRole.ADMIN:
        return 'ADMIN';
      default:
      case UserRole.REGULAR_USER:
        return 'MENU';
    }
  }

  get cartSize(): number {
    return this.cartService.size();
  }

  get cartEmpty(): boolean {
    return this.cartSize == 0;
  }

  constructor(
    private cartService: CartService,
    userService: UserService,
    snackBar: MatSnackBar
  ) {
    userService
      .getUserInformation()
      .pipe(first())
      .subscribe({
        next: (info) => (this.userInformation = info),
        error: () => {
          snackBar.open(
            'Failed to load user information. Please try again later.',
            'Close'
          );
        },
      });
  }

  logout() {
    // TODO: Implement
    console.log('Logout');
  }
}
