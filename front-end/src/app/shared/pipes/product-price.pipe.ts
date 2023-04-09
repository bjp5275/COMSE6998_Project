import { Pipe, PipeTransform } from '@angular/core';
import { ExpandedOrderItem } from 'src/app/components/order-item-list/order-item-list.component';
import { Product, ProductAddition } from 'src/app/model/models';

export function getProductTotalPrice(
  product: Product,
  additions?: ProductAddition[]
): number {
  return (
    product.basePrice +
    (additions?.reduce((sum, addition) => sum + addition.price, 0) || 0)
  );
}

export function getExpandedOrderItemTotalPrice(
  expandedOrderItem: ExpandedOrderItem
): number {
  return getProductTotalPrice(
    expandedOrderItem.product,
    expandedOrderItem.orderItem.additions
  );
}

export function formatPrice(price: number, includeDollarSign = true): string {
  if (includeDollarSign) {
    return `$${price.toFixed(2)}`;
  } else {
    return price.toFixed(2);
  }
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
    return formatPrice(getExpandedOrderItemTotalPrice(expandedOrderItem));
  }
}

@Pipe({
  name: 'price',
  pure: true,
})
export class PricePipe implements PipeTransform {
  constructor() {}

  transform(price: number, includeDollarSign = true): string {
    return formatPrice(price, includeDollarSign);
  }
}
