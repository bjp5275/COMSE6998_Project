import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CartService } from './shared/services/cart.service';
import {
  UserInformation,
  UserRole,
  UserService,
  convertUserRoleToString,
} from './shared/services/user.service';

type MenuType = 'MENU';
type MenuItem = MenuLink | MenuCategory;
interface _MenuItem {
  type: string;
  show?: () => boolean;
}

interface MenuCategory extends _MenuItem {
  type: 'CATEGORY';
  title: string;
  includeDivider: boolean;
  links?: MenuLink[];
}

interface MenuLink extends _MenuItem {
  type: 'LINK';
  routerLink: string;
  icon: string;
  name: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly convertUserRoleToString = convertUserRoleToString;
  readonly MENU_LINK_TYPE_TEMPLATE!: MenuLink;
  readonly MENU_CATEGORY_TYPE_TEMPLATE!: MenuCategory;
  readonly MENU_ITEMS_TYPE_TEMPLATE!: MenuItem[];
  readonly mainMenuItems: MenuItem[] = [
    {
      type: 'LINK',
      routerLink: '/products',
      icon: 'coffee',
      name: 'Products',
    },
    {
      type: 'LINK',
      routerLink: '/cart',
      icon: 'shopping_cart',
      name: 'Cart',
    },
    {
      type: 'CATEGORY',
      includeDivider: true,
      title: 'Deliverer Console',
      show: () => this.actingRole == UserRole.DELIVERER,
      links: [
        {
          type: 'LINK',
          routerLink: '/delivery/available',
          icon: 'local_shipping',
          name: 'Available Deliveries',
        },
        {
          type: 'LINK',
          routerLink: '/delivery/history',
          icon: 'history',
          name: 'Delivery History',
        },
      ],
    },
    {
      type: 'CATEGORY',
      includeDivider: true,
      title: 'Administrative Console',
      show: () => this.actingRole == UserRole.ADMIN,
      links: [
        {
          type: 'LINK',
          routerLink: '/admin/products',
          icon: 'coffee',
          name: 'Products',
        },
        {
          type: 'LINK',
          routerLink: '/admin/additions',
          icon: 'add_box',
          name: 'Additions',
        },
      ],
    },
  ];
  readonly secondaryMenuItems: MenuItem[] = [
    {
      type: 'LINK',
      routerLink: '/favorites',
      icon: 'favorite',
      name: 'Favorites',
    },
    {
      type: 'LINK',
      routerLink: '/history',
      icon: 'history',
      name: 'Order History',
    },
  ];

  userInformation?: UserInformation;
  actingRole: UserRole = UserRole.REGULAR_USER;

  get apiKey(): string | undefined {
    if (environment.apiKey && environment.apiKey.length > 0) {
      return environment.apiKey;
    } else {
      return undefined;
    }
  }
  set apiKey(key: string | undefined) {
    environment.apiKey = key || '';
  }

  get menuType(): MenuType {
    switch (this.actingRole) {
      default:
      case UserRole.ADMIN:
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
