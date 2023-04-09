import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';
import {
  OrderItem,
  Product,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';

export interface OrderItemAction {
  buttonText: string;
  color?: string;
  onClick: (product: Product, orderItem: OrderItem, index: number) => void;
}

interface ExpandedOrderItem {
  orderItem: OrderItem;
  product: Product;
}

@Component({
  selector: 'app-order-item-list[orderItems]',
  templateUrl: './order-item-list.component.html',
  styleUrls: ['./order-item-list.component.scss'],
})
export class OrderItemListComponent implements OnInit, OnChanges {
  readonly convertCoffeeTypeToString = convertCoffeeTypeToString;
  readonly convertMilkTypeToString = convertMilkTypeToString;
  readonly additionsMapping: { [k: string]: string } = {
    '=0': '0 additions',
    '=1': '1 addition',
    other: '# additions',
  };

  @Input() orderItems!: OrderItem[];
  @Input() actions?: OrderItemAction[];

  columns = 1;
  loadingProductMap = true;
  productMap$: Observable<Map<string, Product>>;

  constructor(
    productService: ProductsService,
    breakpointObserver: BreakpointObserver
  ) {
    this.productMap$ = productService.getProducts().pipe(
      map((products) => {
        const productMap = new Map<string, Product>();
        products.forEach((product) => productMap.set(product.id, product));
        return productMap;
      }),
      tap(() => (this.loadingProductMap = false)),
      shareReplay(1)
    );

    breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .subscribe((result) => {
        if (result.breakpoints[Breakpoints.Medium]) {
          this.columns = 1;
        } else if (result.breakpoints[Breakpoints.Large]) {
          this.columns = 2;
        }
      });
  }

  ngOnInit(): void {
    if (!this.orderItems) {
      throw new TypeError("'orderItems' is required");
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderItems']) {
      this.orderItems = changes['orderItems'].currentValue;
    }
    if (changes['actions']) {
      this.actions = changes['actions'].currentValue;
    }
  }

  expandOrderItems(
    orderItems: OrderItem[],
    productLookup?: Map<string, Product>
  ): ExpandedOrderItem[] {
    return orderItems.map((orderItem) => {
      const value: ExpandedOrderItem = {
        orderItem,
        product: productLookup?.get(orderItem.productId!)!,
      };
      return value;
    });
  }
}
