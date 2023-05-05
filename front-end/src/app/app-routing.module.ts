import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAdditionsComponent } from './components/admin-additions/admin-additions.component';
import { AdminCustomizeProductComponent } from './components/admin-customize-product/admin-customize-product.component';
import { AdminProductsComponent } from './components/admin-products/admin-products.component';
import { CustomerProductsComponent } from './components/customer-products/customer-products.component';
import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import {
  DeliveryOrdersComponent,
  DeliveryOrdersType,
} from './components/delivery-orders/delivery-orders.component';
import { DeliveryStatusComponent } from './components/delivery-status/delivery-status.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { PendingOrderStatusComponent } from './components/pending-order-status/pending-order-status.component';
import {
  PendingOrdersComponent,
  PendingOrdersType,
} from './components/pending-orders/pending-orders.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

import { inject } from '@angular/core';
import { EmptyComponent } from './components/empty/empty.component';
import { UserRole } from './model/models';
import { UserService } from './shared/services/user.service';

function authGuard(...requiredRoles: UserRole[]): () => boolean {
  if (requiredRoles.length == 0) {
    return () => true;
  }

  return () => {
    const userService = inject(UserService);
    const userRoles = userService.getCurrentUserInformation()?.roles || [];
    console.log('Checking roles', requiredRoles, userRoles);
    const allowed = requiredRoles.reduce(
      (matchesOne, roleToCheck) =>
        matchesOne || userRoles.includes(roleToCheck),
      false
    );
    console.log('Auth guard success', allowed);
    return allowed;
  };
}

const routes: Routes = [
  {
    path: 'products',
    component: CustomerProductsComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER, UserRole.ADMIN)],
  },
  {
    path: 'product',
    component: CustomizeProductComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER, UserRole.ADMIN)],
  },
  {
    path: 'cart',
    component: UserCartComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER)],
  },
  {
    path: 'order',
    component: OrderDetailsComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER, UserRole.ADMIN)],
  },
  {
    path: 'history',
    component: OrderHistoryComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER)],
  },
  {
    path: 'favorites',
    component: FavoritesComponent,
    canActivate: [authGuard(UserRole.REGULAR_USER)],
  },
  {
    path: 'delivery/available',
    component: DeliveryOrdersComponent,
    data: { type: DeliveryOrdersType.AVAILABLE },
    canActivate: [authGuard(UserRole.DELIVERER, UserRole.ADMIN)],
  },
  {
    path: 'delivery/history',
    component: DeliveryOrdersComponent,
    data: { type: DeliveryOrdersType.HISTORY },
    canActivate: [authGuard(UserRole.DELIVERER, UserRole.ADMIN)],
  },
  {
    path: 'delivery/status',
    component: DeliveryStatusComponent,
    canActivate: [authGuard(UserRole.DELIVERER, UserRole.ADMIN)],
  },
  {
    path: 'pending/available',
    component: PendingOrdersComponent,
    data: { type: PendingOrdersType.AVAILABLE },
    canActivate: [authGuard(UserRole.SHOP_OWNER, UserRole.ADMIN)],
  },
  {
    path: 'pending/history',
    component: PendingOrdersComponent,
    data: { type: PendingOrdersType.HISTORY },
    canActivate: [authGuard(UserRole.SHOP_OWNER, UserRole.ADMIN)],
  },
  {
    path: 'pending/status',
    component: PendingOrderStatusComponent,
    canActivate: [authGuard(UserRole.SHOP_OWNER, UserRole.ADMIN)],
  },
  {
    path: 'admin/additions',
    component: AdminAdditionsComponent,
    canActivate: [authGuard(UserRole.ADMIN)],
  },
  {
    path: 'admin/products',
    component: AdminProductsComponent,
    canActivate: [authGuard(UserRole.ADMIN)],
  },
  {
    path: 'admin/product',
    component: AdminCustomizeProductComponent,
    canActivate: [authGuard(UserRole.ADMIN)],
  },
  {
    path: '',
    component: EmptyComponent,
  },
  {
    path: '**',
    redirectTo: '/',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
