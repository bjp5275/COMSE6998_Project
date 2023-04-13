import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

const routes: Routes = [
  { path: 'products', component: ProductListComponent },
  { path: 'customize-product', component: CustomizeProductComponent },
  { path: 'cart', component: UserCartComponent },
  { path: 'order', component: OrderDetailsComponent },
  { path: 'history', component: OrderHistoryComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: '**', redirectTo: '/products' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
