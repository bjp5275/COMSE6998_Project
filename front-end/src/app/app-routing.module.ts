import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';
import { CustomizeProductComponent } from './customize-product/customize-product.component';

const routes: Routes = [
  { path: 'product', component: ProductListComponent },
  { path: 'product-custom', component: CustomizeProductComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
