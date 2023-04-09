import { Pipe, PipeTransform } from '@angular/core';
import { OrderItem, Product, ProductAddition } from 'src/app/model/models';

export function getProductAdditionsCost(additions?: ProductAddition[]): number {
  return additions?.reduce((sum, addition) => sum + addition.price, 0) || 0;
}

export function getProductTotalPrice(
  product: Product,
  additions?: ProductAddition[]
): number {
  return product.basePrice + getProductAdditionsCost(additions);
}

export function getOrderItemTotalPrice(orderItem: OrderItem): number {
  return orderItem.basePrice + getProductAdditionsCost(orderItem.additions);
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
  transform(
    product: Product,
    additions?: ProductAddition[],
    includeDollarSign = true
  ): string {
    return formatPrice(getProductTotalPrice(product, additions));
  }
}

@Pipe({
  name: 'orderItemPrice',
  pure: true,
})
export class OrderItemPricePipe implements PipeTransform {
  constructor() {}

  transform(orderItem: OrderItem): string {
    return formatPrice(getOrderItemTotalPrice(orderItem));
  }
}

@Pipe({
  name: 'orderItemsPrice',
  pure: false,
})
export class OrderItemsPricePipe implements PipeTransform {
  constructor() {}

  transform(orderItems: OrderItem[], includeDollarSign = false): string {
    const totalPrice = orderItems?.reduce(
      (sum, item) => sum + getOrderItemTotalPrice(item),
      0
    );
    return formatPrice(totalPrice, includeDollarSign);
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
