import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs';
import { CartService } from './shared/services/cart.service';
import {
  UserInformation,
  UserRole,
  UserService,
} from './shared/services/user.service';

type MenuItem = MenuLink | MenuCategory;
interface _MenuItem {
  type: string;
  show?: () => boolean;
}

interface MenuCategory extends _MenuItem {
  type: 'CATEGORY';
  title: string;
  includeDivider?: boolean;
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
  readonly MENU_LINK_TYPE_TEMPLATE!: MenuLink;
  readonly MENU_CATEGORY_TYPE_TEMPLATE!: MenuCategory;
  readonly MENU_ITEMS_TYPE_TEMPLATE!: MenuItem[];
  readonly mainMenuItems: MenuItem[] = [
    {
      type: 'CATEGORY',
      title: 'User Menu',
      links: [
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
      ],
    },
    {
      type: 'CATEGORY',
      includeDivider: true,
      title: 'Deliverer Console',
      show: () => this.userHasRole(UserRole.DELIVERER),
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
      title: 'Shop Owner Console',
      show: () => this.userHasRole(UserRole.SHOP_OWNER),
      links: [
        {
          type: 'LINK',
          routerLink: '/pending/available',
          icon: 'receipt_long',
          name: 'Available Orders',
        },
        {
          type: 'LINK',
          routerLink: '/pending/history',
          icon: 'coffee_maker',
          name: 'Order History',
        },
      ],
    },
    {
      type: 'CATEGORY',
      includeDivider: true,
      title: 'Administrative Console',
      show: () => this.userHasRole(UserRole.ADMIN),
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
  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  get cartSize(): number {
    return this.cartService.size();
  }

  get cartEmpty(): boolean {
    return this.cartSize == 0;
  }

  constructor(
    private cartService: CartService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    userService.getUserInformation().subscribe({
      next: (info) => (this.userInformation = info),
    });
  }

  userHasRole(role: UserRole): boolean {
    return (
      (this.userInformation &&
        this.userInformation.roles &&
        this.userInformation.roles.includes(role)) ||
      false
    );
  }

  login(loginInfo = this.loginForm.value) {
    if (loginInfo.username && loginInfo.password) {
      this.userService
        .login(loginInfo.username, loginInfo.password)
        .pipe(first())
        .subscribe({
          next: (info) => {
            this.userInformation = info;
          },
          error: () => {
            this.snackBar.open('Invalid login credentials', 'OK');
          },
        });
    } else {
      console.log('ERROR: Invalid login details');
    }
  }

  logout() {
    this.userService.logout();
  }
}
