import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { Location, PaymentInformation } from 'src/app/model/models';

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

@Injectable({
  providedIn: 'root',
})
export class UserService {
  locations: Location[] = [...SAVED_LOCATIONS];
  paymentMethods: PaymentInformation[] = [...PAYMENT_METHODS];

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
}
