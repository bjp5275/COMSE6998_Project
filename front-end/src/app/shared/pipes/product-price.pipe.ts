import { Pipe, PipeTransform } from '@angular/core';
import { ExpandedOrderItem } from 'src/app/components/order-item-list/order-item-list.component';
import { Product, ProductAddition } from 'src/app/model/models';

export function getTotalPrice(expandedOrderItem: ExpandedOrderItem): number {
  return (
    expandedOrderItem.product.basePrice +
    (expandedOrderItem.orderItem.additions?.reduce(
      (sum, addition) => sum + addition.price,
      0
    ) || 0)
  );
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

@Pipe({
  name: 'additionPrice',
  pure: true,
})
export class ProductAdditionPricePipe implements PipeTransform {
  transform(productAddition: ProductAddition): string {
    return formatPrice(productAddition.price);
  }
}

@Pipe({
  name: 'productPrice',
  pure: true,
})
export class ProductPricePipe implements PipeTransform {
  transform(product: Product): string {
    return formatPrice(product.basePrice);
  }
}

@Pipe({
  name: 'orderItemPrice',
  pure: true,
})
export class OrderItemPricePipe implements PipeTransform {
  constructor() {}

  transform(expandedOrderItem: ExpandedOrderItem): string {
    return formatPrice(getTotalPrice(expandedOrderItem));
  }
}
