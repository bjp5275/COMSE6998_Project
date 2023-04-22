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
import { FavoritesComponent } from './components/favorites/favorites.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

const routes: Routes = [
  { path: 'products', component: CustomerProductsComponent },
  { path: 'product', component: CustomizeProductComponent },
  { path: 'cart', component: UserCartComponent },
  { path: 'order', component: OrderDetailsComponent },
  { path: 'history', component: OrderHistoryComponent },
  { path: 'favorites', component: FavoritesComponent },
  {
    path: 'delivery/available',
    component: DeliveryOrdersComponent,
    data: { type: DeliveryOrdersType.AVAILABLE },
  },
  {
    path: 'delivery/history',
    component: DeliveryOrdersComponent,
    data: { type: DeliveryOrdersType.HISTORY },
  },
  { path: 'admin/additions', component: AdminAdditionsComponent },
  { path: 'admin/products', component: AdminProductsComponent },
  { path: 'admin/product', component: AdminCustomizeProductComponent },
  { path: '**', redirectTo: '/products' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
