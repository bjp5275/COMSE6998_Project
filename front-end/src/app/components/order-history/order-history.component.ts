import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, catchError, first, map, of, shareReplay } from 'rxjs';
import {
  Order,
  OrderItem,
  Product,
  ProductAddition,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';
import { OrderService } from 'src/app/shared/services/order.service';
import { ProductsService } from 'src/app/shared/services/products.service';
import { HttpError } from 'src/app/shared/utility';
import { CustomOrder, OrderAction } from '../order-list/order-list.component';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent {
  readonly ORDER_ACTIONS: OrderAction<Order>[] = [
    {
      buttonText: 'Details',
      onClick: (_orderItems, _index, order) => {
        this.router.navigate(['/order'], {
          queryParams: { id: order.id! },
          state: { order: order },
        });
      },
    },
    {
      buttonText: 'Reorder',
      color: 'primary',
      onClick: (orderItems, _index, _order) => {
        this.reorder(orderItems);
      },
    },
  ];

  orders$: Observable<CustomOrder<Order>[]>;
  products$: Observable<Product[] | null>;
  reordering = false;

  constructor(
    orderService: OrderService,
    private cartService: CartService,
    private productService: ProductsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.orders$ = orderService.getOrderHistory().pipe(
      catchError((err: HttpError) => {
        snackBar.open(
          `Failed to load order history: ${err.errorMessage}`,
          'Dismiss'
        );
        return of([] as Order[]);
      }),
      map((orders) => {
        const customOrders: CustomOrder<Order>[] = [];
        orders.forEach((order) =>
          customOrders.push({
            name: order.deliveryTime.toLocaleString(),
            subtitle: order.id,
            items: order.items,
            data: order,
          })
        );

        return customOrders;
      })
    );

    // Get products in anticipation of a reorder and prime the observable for the value
    this.products$ = this.productService.getProducts().pipe(
      catchError(() => of(null)),
      first(),
      shareReplay()
    );
    this.products$.subscribe((products) => {
      if (!products) {
        console.log('Failed to load products');
      }
    });
  }

  validateOrderItem(
    orderItem: OrderItem,
    index: number,
    productMap: Map<string, Product>,
    productAdditionsMap: Map<string, Map<string, ProductAddition>>,
    errors: string[]
  ): OrderItem | null {
    const product = productMap.get(orderItem.productId);
    if (!product) {
      errors.push(`Order item ${index + 1} is not available`);
      return null;
    }

    const newOrderItem = this.productService.convertToOrderItem(product);
    if (!product.allowedCoffeeTypes.includes(orderItem.coffeeType)) {
      const defaultedCoffeeType = product.allowedCoffeeTypes[0];
      errors.push(
        `${product.name} is not available with ${convertCoffeeTypeToString(
          orderItem.coffeeType
        )} - defaulting to ${convertCoffeeTypeToString(defaultedCoffeeType)}`
      );

      orderItem.coffeeType = defaultedCoffeeType;
    }
    newOrderItem.coffeeType = orderItem.coffeeType;

    const milkType = orderItem.milkType;
    const allowedMilkTypes = product.allowedMilkTypes;
    if (
      (!milkType && allowedMilkTypes?.length) ||
      (milkType && allowedMilkTypes && !allowedMilkTypes.includes(milkType))
    ) {
      const defaultedMilkType = allowedMilkTypes[0];
      errors.push(
        `${
          product.name
        } requires a valid milk selection - defaulting to ${convertMilkTypeToString(
          defaultedMilkType
        )}`
      );
      orderItem.milkType = defaultedMilkType;
    } else if (milkType && !allowedMilkTypes?.length) {
      errors.push(`${product.name} no longer has a milk selection`);
      orderItem.milkType = undefined;
    }
    newOrderItem.milkType = orderItem.milkType;

    if (orderItem.additions?.length) {
      const validatedAdditions: ProductAddition[] = [];
      const allowedAdditions = productAdditionsMap.get(product.id)!;

      orderItem.additions.forEach((addition) => {
        const validAddition = allowedAdditions.get(addition.id!);
        if (validAddition) {
          validatedAdditions.push(validAddition);
        } else {
          errors.push(`${product.name} no longer allows ${addition.name}.`);
        }
      });

      newOrderItem.additions = validatedAdditions;
    }

    return newOrderItem;
  }

  validateOrderItems(
    orderItems: OrderItem[],
    products: Product[]
  ): OrderItem[] {
    const productMap = new Map<string, Product>();
    const productAdditionsMap = new Map<string, Map<string, ProductAddition>>();
    products.forEach((product) => {
      productMap.set(product.id, product);
      const additionMap = new Map<string, ProductAddition>();
      productAdditionsMap.set(product.id, additionMap);
      product.allowedAdditions?.forEach((addition) =>
        additionMap.set(addition.id!, addition)
      );
    });

    const errors: string[] = [];
    const validatedOrderItems: OrderItem[] = [];
    orderItems
      .map((orderItem, index) =>
        this.validateOrderItem(
          orderItem,
          index,
          productMap,
          productAdditionsMap,
          errors
        )
      )
      .filter((item) => item !== null)
      .forEach((validOrderItem) => validatedOrderItems.push(validOrderItem!));

    if (errors.length) {
      const issueMessage = `Issues: \n  -${errors.join('\n  -')}`;
      this.snackBar.open(issueMessage, 'OK', {
        duration: 8000,
        panelClass: ['multiline-snackbar'],
      });
    }

    return validatedOrderItems;
  }

  reorder(orderItems: OrderItem[]) {
    this.reordering = true;

    // Validate order items are still available
    this.products$.subscribe({
      next: (products) => {
        if (!products) {
          this.snackBar.open(
            'Unable to validate products - please try again',
            'OK'
          );
        } else {
          const validatedOrderItems = this.validateOrderItems(
            orderItems,
            products
          );
          if (validatedOrderItems.length) {
            validatedOrderItems.forEach((item) =>
              this.cartService.addItem(item)
            );
            this.router.navigate(['/cart']);
          } else {
            this.snackBar.open(
              'All products in order are no longer available',
              'OK'
            );
          }
        }
      },
      complete: () => (this.reordering = false),
    });
  }
}
