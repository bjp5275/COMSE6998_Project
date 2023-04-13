import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  CoffeeType,
  FavoriteOrder,
  Location,
  MilkType,
  PaymentInformation,
} from 'src/app/model/models';

const SAVED_LOCATIONS: Location[] = [
  {
    name: 'Home',
    streetAddress: '45 Rockefeller Plaza',
    city: 'New York',
    state: 'NY',
    zip: '10111',
  },
  {
    streetAddress: '456 Second Avenue',
    city: 'Gotham',
    state: 'CD',
    zip: '54321',
  },
];

const PAYMENT_METHODS: PaymentInformation[] = [
  {
    nameOnCard: 'Name',
    cardNumber: '1234987612349876',
    cvv: '123',
  },
];

const FAVORITE_ORDERS: FavoriteOrder[] = [
  {
    id: '0',
    name: 'My Favorite',
    items: [
      {
        id: '0',
        coffeeType: CoffeeType.REGULAR,
        milkType: MilkType.ALMOND,
        productId: 'cafe-americano',
        basePrice: 5,
        additions: [
          {
            id: 'pumpkin-spice-syrup',
            name: 'Pumpkin Spice Syrup',
            price: 0.75,
          },
        ],
      },
      {
        id: '0',
        coffeeType: CoffeeType.DECAF,
        milkType: MilkType.OAT,
        productId: 'mocha',
        basePrice: 5,
        additions: [
          {
            id: 'pumpkin-spice-syrup',
            name: 'Pumpkin Spice Syrup',
            price: 0.75,
          },
          {
            id: 'pumpkin-spice-syrup',
            name: 'Pumpkin Spice Syrup',
            price: 0.75,
          },
          {
            id: 'caramel-syrup',
            name: 'Caramel Syrup',
            price: 0.5,
          },
        ],
      },
    ],
  },
  {
    id: '1',
    name: 'Friday Favorite',
    items: [
      {
        id: '0',
        coffeeType: CoffeeType.REGULAR,
        milkType: MilkType.ALMOND,
        productId: 'cafe-americano',
        basePrice: 5,
        additions: [
          {
            id: 'pumpkin-spice-syrup',
            name: 'Pumpkin Spice Syrup',
            price: 0.75,
          },
        ],
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class UserService {
  locations: Location[] = [...SAVED_LOCATIONS];
  paymentMethods: PaymentInformation[] = [...PAYMENT_METHODS];
  favoriteOrders: FavoriteOrder[] = [...FAVORITE_ORDERS];

  constructor() {}

  public getSavedLocations(): Observable<Location[]> {
    return of(this.locations);
  }

  public addSavedLocation(location: Location): Observable<boolean> {
    this.locations.push(location);
    return of(true).pipe(delay(500));
  }

  public getSavedPaymentMethods(): Observable<PaymentInformation[]> {
    return of(this.paymentMethods);
  }

  public addSavedPaymentMethods(
    paymentMethod: PaymentInformation
  ): Observable<boolean> {
    this.paymentMethods.push(paymentMethod);
    return of(true).pipe(delay(500));
  }

  public getFavoriteOrders(): Observable<FavoriteOrder[]> {
    return of(this.favoriteOrders);
  }

  public addFavoriteOrder(order: FavoriteOrder): Observable<string> {
    const id = new Date().getTime().toString();
    this.favoriteOrders.push({
      id,
      name: order.name,
      items: order.items,
    });

    return of(id).pipe(delay(500));
  }

  public updateFavoriteOrder(
    id: string,
    updatedOrder: FavoriteOrder
  ): Observable<boolean> {
    const order = this.favoriteOrders.find((order) => order.id == id);
    if (!order) {
      return throwError(() => new Error('Favorite not found'));
    }

    if (updatedOrder.name) {
      order.name = updatedOrder.name;
    }
    if (updatedOrder.items) {
      order.items = updatedOrder.items;
    }

    return of(true).pipe(delay(500));
  }
}
