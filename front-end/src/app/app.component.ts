import { Component } from '@angular/core';
import { CartService } from './shared/cart.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  get cartSize() {
    return this.cartService.size();
  }

  get cartEmpty() {
    return this.cartSize == 0;
  }

  constructor(private cartService: CartService) {}
}
