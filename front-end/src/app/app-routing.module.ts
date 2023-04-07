import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

const routes: Routes = [
  { path: 'product', component: ProductListComponent },
  { path: 'product-custom', component: CustomizeProductComponent },
  { path: 'cart', component: UserCartComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
