import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from 'src/app/model/models';

export interface ProductAction {
  buttonText: string;
  color?: string;
  /**
   * Action to take when product is clicked
   * @param product the product
   * @param index index within input array
   */
  onClick: (product: Product, index: number) => void;
  /**
   * Optional function to determine whether to hide button (using ngIf directive)
   * @param product the product
   * @param index index within input array
   */
  onlyIf?: (product: Product, index: number) => boolean;
}

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit, OnChanges {
  columns = 2;

  @Input() products$!: Observable<Product[]>;
  @Input() actions?: ProductAction[];

  constructor(breakpointObserver: BreakpointObserver) {
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
    if (!this.products$) {
      throw new TypeError("'products$' is required");
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['products$']) {
      this.products$ = changes['products$'].currentValue;
    }
    if (changes['actions']) {
      this.actions = changes['actions'].currentValue;
    }
  }

  onClick(action: ProductAction, product: Product, index: number) {
    action.onClick(product, index);
  }
}
