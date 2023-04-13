import { Component } from '@angular/core';
import { CartService } from './shared/services/cart.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  showMenu = false;

  get cartSize() {
    return this.cartService.size();
  }

  get cartEmpty() {
    return this.cartSize == 0;
  }

  constructor(private cartService: CartService) {}

  logout() {
    // TODO: Implement
    console.log('Logout');
  }
}
