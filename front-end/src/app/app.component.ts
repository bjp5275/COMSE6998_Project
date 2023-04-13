import { Component } from '@angular/core';
import { CartService } from './shared/services/cart.service';

type MenuType = 'MENU' | 'ADMIN';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  showMenu?: MenuType = 'MENU';

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
