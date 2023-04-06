import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from 'src/app/model/models';
import { ProductsService } from '../../shared/products.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  products$?: Observable<Product[]>;
  columns = 2;

  constructor(
    breakpointObserver: BreakpointObserver,
    private productsService: ProductsService
  ) {
    breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .subscribe((result) => {
        if (result.breakpoints[Breakpoints.XSmall]) {
          this.columns = 1;
        } else if (result.breakpoints[Breakpoints.Small]) {
          this.columns = 2;
        } else if (result.breakpoints[Breakpoints.Medium]) {
          this.columns = 3;
        } else if (result.breakpoints[Breakpoints.Large]) {
          this.columns = 4;
        } else if (result.breakpoints[Breakpoints.XLarge]) {
          this.columns = 5;
        }
      });
  }

  ngOnInit(): void {
    this.products$ = this.productsService.getProducts();
  }
}
