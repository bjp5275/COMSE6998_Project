import { Injectable } from '@angular/core';
import { OrderItem } from 'src/app/model/models';
import { Equals } from '../utility';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  cartItems: OrderItem[] = [];

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

  public clearCart() {
    this.cartItems = [];
  }

  public size(): number {
    return this.cartItems.length;
  }
}
