import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
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
  MAX_RATING,
  MIN_RATING,
  OrderItem,
  OrderRating,
  Product,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { ClassUtils, HttpError } from 'src/app/shared/utility';

export interface OrderItemAction {
  buttonText: string;
  color?: string;
  /**
   * Action to take when order item is clicked
   * @param product order item's product
   * @param orderItem underlying order item
   * @param index index within input orderItems array
   * @param rating rating for the item (if one is found)
   */
  onClick: (
    product: Product,
    orderItem: OrderItem,
    index: number,
    rating?: OrderRating
  ) => void;
  /**
   * Whether to show this action
   * @param product order item's product
   * @param orderItem underlying order item
   * @param index index within input orderItems array
   * @param rating rating for the item (if one is found)
   * @returns true if the action should be shown
   */
  show?: (
    product: Product,
    orderItem: OrderItem,
    index: number,
    rating?: OrderRating
  ) => boolean;
}

interface ExpandedOrderItem {
  orderItem: OrderItem;
  product: Product;
  rating?: OrderRating;
  rating_filledStars?: number;
  rating_emptyStars?: number;
}

interface RatingDetails {
  rating?: OrderRating;
  rating_filledStars?: number;
  rating_emptyStars?: number;
}

const MAX_RATING_STAR_COUNT = MAX_RATING - MIN_RATING + 1;

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
  @Input() listOutAdditions?: boolean = false;
  @Input() ratings?: OrderRating[];

  columns = 1;
  loadingProductMap = true;
  productMap$: Observable<Map<string, Product>>;
  ratingsMap?: Map<string, OrderRating>;

  constructor(
    productService: ProductsService,
    breakpointObserver: BreakpointObserver,
    snackBar: MatSnackBar
  ) {
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

  ngOnChanges(changes: SimpleChanges): void {
    ClassUtils.processChanges(this, changes);
    this.recalculateRatingsMap();
  }

  recalculateRatingsMap() {
    if (!this.ratings) {
      this.ratingsMap = undefined;
      return;
    }

    const ratingsMap = new Map<string, OrderRating>();
    this.ratings.forEach((rating) =>
      ratingsMap.set(rating.orderItemId, rating)
    );
    this.ratingsMap = ratingsMap;
  }

  expandOrderItems(
    orderItems: OrderItem[],
    productLookup?: Map<string, Product>,
    ratingsMap?: Map<string, OrderRating>
  ): ExpandedOrderItem[] {
    return orderItems.map((orderItem) => {
      let ratingInfo: RatingDetails = {};
      if (ratingsMap?.has(orderItem.id!)) {
        const rating = ratingsMap.get(orderItem.id!)!;
        const rating_filledStars = rating.rating - MIN_RATING + 1;
        const rating_emptyStars = MAX_RATING_STAR_COUNT - rating_filledStars;

        ratingInfo = {
          rating,
          rating_filledStars,
          rating_emptyStars,
        };
      }

      const value: ExpandedOrderItem = {
        orderItem,
        product: productLookup?.get(orderItem.productId!)!,
        ...ratingInfo,
      };
      return value;
    });
  }

  hasActiveAction(
    expandedOrderItem: ExpandedOrderItem,
    index: number,
    actions: OrderItemAction[]
  ): boolean {
    return (
      actions.find(
        (action) =>
          !action.show ||
          action.show(
            expandedOrderItem.product,
            expandedOrderItem.orderItem,
            index,
            expandedOrderItem.rating
          )
      ) != undefined
    );
  }

  onClick(
    action: OrderItemAction,
    expandedOrderItem: ExpandedOrderItem,
    index: number
  ) {
    action.onClick(
      expandedOrderItem.product,
      expandedOrderItem.orderItem,
      index
    );
  }
}
