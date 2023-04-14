import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, switchMap, tap } from 'rxjs';
import { Product } from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { ProductAction } from '../product-list/product-list.component';

@Component({
  selector: 'app-admin-products',
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss'],
})
export class AdminProductsComponent {
  readonly ACTIONS: ProductAction[] = [
    {
      buttonText: 'Enable',
      color: 'primary',
      onClick: (product, _index) => this.enableProduct(product),
      onlyIf: (product, _index) => !product.enabled,
    },
    {
      buttonText: 'Disable',
      onClick: (product, _index) => this.disableProduct(product),
      onlyIf: (product, _index) => product.enabled,
    },
    {
      buttonText: 'Customize',
      color: 'primary',
      onClick: (product, _index) =>
        this.router.navigateByUrl('/admin/customize-product', {
          state: { product },
        }),
    },
  ];

  products$: Observable<Product[]>;
  private pullProducts$ = new BehaviorSubject(null);

  constructor(
    private productsService: ProductsService,
    private router: Router
  ) {
    this.products$ = this.pullProducts$.pipe(
      switchMap(() => productsService.getProducts(true)),
      tap((products) => console.log('Pulled data', products))
    );
  }

  enableProduct(product: Product) {
    product.enabled = true;
    this.productsService.upsertProduct(product);
    this.pullProducts$.next(null);
  }

  disableProduct(product: Product) {
    product.enabled = false;
    this.productsService.upsertProduct(product);
    this.pullProducts$.next(null);
  }
}
