import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  first,
  of,
  switchMap,
} from 'rxjs';
import { Product } from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { HttpError } from 'src/app/shared/utility';
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
        this.router.navigateByUrl('/admin/product', {
          state: { product },
        }),
    },
  ];

  products$: Observable<Product[]>;
  private pullProducts$ = new BehaviorSubject(null);

  constructor(
    private productsService: ProductsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.products$ = this.pullProducts$.pipe(
      switchMap(() =>
        productsService.getProducts(true).pipe(
          catchError((err: HttpError) => {
            this.snackBar.open(
              `Failed to load products: ${err.errorMessage}`,
              'Dismiss'
            );
            return of([] as Product[]);
          })
        )
      )
    );
  }

  enableProduct(product: Product) {
    product.enabled = true;
    this.saveProduct(product);
  }

  disableProduct(product: Product) {
    product.enabled = false;
    this.saveProduct(product);
  }

  private saveProduct(product: Product) {
    this.productsService
      .upsertProduct(product)
      .pipe(
        catchError(() => of(null)),
        first()
      )
      .subscribe((product) => {
        if (product) {
          this.pullProducts$.next(null);
        } else {
          this.snackBar.open('Failed to save product. Please try again', 'OK');
        }
      });
  }
}
