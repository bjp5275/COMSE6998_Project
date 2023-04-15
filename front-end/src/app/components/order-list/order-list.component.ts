import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, first, map, of, shareReplay, tap } from 'rxjs';
import {
  OrderItem,
  Product,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { HttpError } from 'src/app/shared/utility';

export interface OrderAction<T> {
  buttonText: string;
  color?: string;
  /**
   * Action to take when order is clicked
   * @param orderItems underlying order's items
   * @param index index within input orders array
   * @param data input order's custom data object (if any)
   */
  onClick: (orderItems: OrderItem[], index: number, data: T) => void;
}

export interface CustomOrder<T> {
  name: string;
  subtitle?: string;
  items: OrderItem[];
  data: T;
}

interface ExpandedOrderItem {
  orderItem: OrderItem;
  product: Product;
}

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
})
export class OrderListComponent<T> implements OnInit, OnChanges {
  readonly convertCoffeeTypeToString = convertCoffeeTypeToString;
  readonly convertMilkTypeToString = convertMilkTypeToString;

  @Input() orders!: CustomOrder<T>[];
  @Input() actions?: OrderAction<T>[];

  loadingProductMap = true;
  productMap$: Observable<Map<string, Product>>;

  constructor(productService: ProductsService, snackBar: MatSnackBar) {
    this.productMap$ = productService.getProducts(true).pipe(
      catchError((err: HttpError) => {
        snackBar.open(
          `Failed to load products: ${err.errorMessage}`,
          'Dismiss'
        );
        return of([] as Product[]);
      }),
      map((products) => {
        const productMap = new Map<string, Product>();
        products.forEach((product) => productMap.set(product.id, product));
        return productMap;
      }),
      first(),
      tap(() => (this.loadingProductMap = false)),
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    if (!this.orders) {
      throw new TypeError("'orders' is required");
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orders']) {
      this.orders = changes['orders'].currentValue;
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

  onClick(action: OrderAction<T>, order: CustomOrder<T>, index: number) {
    action.onClick(order.items, index, order.data);
  }
}
