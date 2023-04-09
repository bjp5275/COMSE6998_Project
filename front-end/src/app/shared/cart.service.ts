import { Injectable } from '@angular/core';
import { OrderItem } from 'src/app/model/models';
import { Equals } from './utility';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  cartItems: OrderItem[] = [
    {
      "productId": "espresso",
      "coffeeType": "REGULAR"
    },
    {
      "productId": "cafe-americano",
      "coffeeType": "REGULAR",
      "milkType": "REGULAR"
    },
    {
      "productId": "cafe-americano",
      "coffeeType": "REGULAR",
      "milkType": "OAT",
      "additions": [
        {
          "id": "pumpkin-spice-syrup",
          "name": "Pumpkin Spice Syrup",
          "price": 0.75,
          "enabled": false
        }
      ]
    },
    {
      "productId": "caramel-macchiato",
      "coffeeType": "REGULAR"
    },
    {
      "productId": "caramel-macchiato",
      "coffeeType": "REGULAR",
      "additions": [
        {
          "id": "pumpkin-spice-syrup",
          "name": "Pumpkin Spice Syrup",
          "price": 0.75,
          "enabled": false
        }
      ]
    },
    {
      "productId": "espresso",
      "coffeeType": "REGULAR"
    }
  ];

  public getOrderItems(): OrderItem[] {
    return this.cartItems;
  }

  public addItem(item: OrderItem) {
    this.cartItems.push(item);
  }

  public updateItem(oldItem: OrderItem, newItem: OrderItem) {
    Object.keys(oldItem);

    const index = this.cartItems.findIndex((item) =>
      Equals.shallow(item, oldItem)
    );
    if (index < 0) {
      throw new Error("ERROR: Couldn't find item to update!");
    }

    this.cartItems[index] = newItem;
  }

  public removeItem(index: number) {
    if (0 <= index && index < this.cartItems.length) {
      this.cartItems.splice(index, 1);
    }
  }

  public size(): number {
    return this.cartItems.length;
  }
}
