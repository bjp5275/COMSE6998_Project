import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminProductsComponent } from './components/admin-products/admin-products.component';
import { CustomerProductsComponent } from './components/customer-products/customer-products.component';
import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

const routes: Routes = [
  { path: 'products', component: CustomerProductsComponent },
  { path: 'customize-product', component: CustomizeProductComponent },
  { path: 'cart', component: UserCartComponent },
  { path: 'order', component: OrderDetailsComponent },
  { path: 'history', component: OrderHistoryComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'admin/products', component: AdminProductsComponent },
  { path: '**', redirectTo: '/products' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
