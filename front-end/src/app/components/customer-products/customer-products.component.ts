import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { Product } from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { ProductsService } from 'src/app/shared/services/products.service';
import { HttpError } from 'src/app/shared/utility';
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
        this.router.navigateByUrl('/product', { state: { product } }),
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
    private router: Router,
    snackBar: MatSnackBar
  ) {
    this.products$ = productsService.getProducts().pipe(
      catchError((err: HttpError) => {
        snackBar.open(
          `Failed to load products: ${err.errorMessage}`,
          'Dismiss'
        );
        return of([] as Product[]);
      })
    );
  }

  addToCart(product: Product) {
    this.cartService.addItem(ProductsService.convertToOrderItem(product));
  }
}
