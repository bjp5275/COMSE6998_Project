import { Injectable } from '@angular/core';
import { CoffeeType, MilkType, OrderItem } from 'src/app/model/models';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  cartItems: OrderItem[] = [
    {
      productId: 'cafe-americano',
      coffeeType: CoffeeType.REGULAR,
      milkType: MilkType.REGULAR,
      additions: [
        {
          id: 'caramel-syrup',
          name: 'Caramel Syrup',
          price: 0.5,
          enabled: true,
        },
        {
          id: 'chocolate-syrup',
          name: 'Chocolate Syrup',
          price: 0.25,
          enabled: true,
        },
      ],
    },
    {
      productId: 'cappuccino',
      coffeeType: CoffeeType.DECAF,
      milkType: MilkType.OAT,
    },
  ];

  public getProducts(): OrderItem[] {
    return this.cartItems;
  }

  public addItem(item: OrderItem) {
    this.cartItems.push(item);
  }

  public removeItem(index: number) {
    if (0 <= index  && index < this.cartItems.length) {
      this.cartItems.splice(index, 1);
    }
  }
}
