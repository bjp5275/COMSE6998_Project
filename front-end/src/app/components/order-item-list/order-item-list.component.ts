import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Observable, filter, first, map, shareReplay, tap } from 'rxjs';
import {
  OrderItem,
  Product,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { getExpandedOrderItemTotalPrice } from 'src/app/shared/pipes/product-price.pipe';
import { ProductsService } from 'src/app/shared/services/products.service';

export interface OrderItemAction {
  buttonText: string;
  color?: string;
  /**
   * Action to take when order item is clicked
   * @param product order item's product
   * @param orderItem underlying order item
   * @param index index within input orderItems array
   * @returns Observable that completes when action is complete to allow for async processsing. Observable value should indicate if changes were made.
   */
  onClick: (
    product: Product,
    orderItem: OrderItem,
    index: number
  ) => Observable<boolean>;
}

export interface ExpandedOrderItem {
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
  @Output() totalPrice = new EventEmitter<number>();

  columns = 1;
  loadingProductMap = true;
  productMap$: Observable<Map<string, Product>>;
  private productMap?: Map<string, Product>;

  constructor(
    productService: ProductsService,
    breakpointObserver: BreakpointObserver
  ) {
    this.productMap$ = productService.getProducts().pipe(
      map((products) => {
        const productMap = new Map<string, Product>();
        products.forEach((product) => productMap.set(product.id, product));
        this.productMap = productMap;
        return productMap;
      }),
      first(),
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

    this.productMap$.subscribe(() => this.recalculateTotalPrice());
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

  onClick(
    action: OrderItemAction,
    expandedOrderItem: ExpandedOrderItem,
    index: number
  ) {
    action
      .onClick(expandedOrderItem.product, expandedOrderItem.orderItem, index)
      .pipe(
        first(),
        filter((changesMade) => changesMade)
      )
      .subscribe(() => this.recalculateTotalPrice());
  }

  recalculateTotalPrice() {
    if (!this.productMap) {
      throw new Error('ERROR: No product map defined yet');
    }

    const totalPrice = this.expandOrderItems(
      this.orderItems,
      this.productMap
    ).reduce((sum, item) => sum + getExpandedOrderItemTotalPrice(item), 0);

    this.totalPrice.emit(totalPrice);
  }
}
