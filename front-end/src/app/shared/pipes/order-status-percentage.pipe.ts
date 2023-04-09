import { Pipe, PipeTransform } from '@angular/core';
import { OrderStatus } from 'src/app/model/models';

@Pipe({
  name: 'orderStatusPercentage',
  pure: true,
})
export class OrderStatusPercentagePipe implements PipeTransform {
  convert(value: number, asDecimal: boolean): number {
    if (asDecimal) {
      return value / 100;
    } else {
      return value;
    }
  }

  transform(orderStatus?: OrderStatus, asDecimal = false): number {
    switch (orderStatus) {
      case OrderStatus.DELIVERED:
        return this.convert(100, asDecimal);
      case OrderStatus.PICKED_UP:
        return this.convert(75, asDecimal);
      case OrderStatus.MADE:
        return this.convert(50, asDecimal);
      case OrderStatus.BREWING:
        return this.convert(25, asDecimal);
      case OrderStatus.RECEIVED:
      default:
        return this.convert(0, asDecimal);
    }
  }
}
