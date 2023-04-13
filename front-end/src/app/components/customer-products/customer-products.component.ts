import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Product } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { ProductsService } from 'src/app/shared/services/products.service';
import { ProductAction } from '../product-list/product-list.component';

@Component({
  selector: 'app-customer-products',
  templateUrl: './customer-products.component.html',
  styleUrls: ['./customer-products.component.scss'],
})
export class CustomerProductsComponent {
  readonly ACTIONS: ProductAction[] = [
    {
      buttonText: 'Customize',
      onClick: (product, _index) =>
        this.router.navigateByUrl('/customize-product', { state: { product } }),
    },
    {
      buttonText: 'Add to Cart',
      color: 'primary',
      onClick: (product, _index) => this.addToCart(product),
    },
  ];

  products$: Observable<Product[]>;

  constructor(
    private productsService: ProductsService,
    private cartService: CartService,
    private router: Router
  ) {
    this.products$ = productsService.getProducts();
  }

  addToCart(product: Product) {
    this.cartService.addItem(this.productsService.convertToOrderItem(product));
  }
}
