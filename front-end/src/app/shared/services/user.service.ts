import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  delay,
  map,
  of,
  tap,
  throwError,
} from 'rxjs';

import {
  FavoriteOrder,
  Location,
  PaymentInformation,
} from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { HttpUtils } from '../utility';

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

const FAVORITE_ORDERS: FavoriteOrder[] = [];

export type UserRole = 'REGULAR_USER' | 'ADMIN' | 'DELIVERER' | 'SHOP_OWNER';
export const UserRole = {
  REGULAR_USER: 'REGULAR_USER' as UserRole,
  ADMIN: 'ADMIN' as UserRole,
  DELIVERER: 'DELIVERER' as UserRole,
  SHOP_OWNER: 'SHOP_OWNER' as UserRole
};
export function convertUserRoleToString(userRole: UserRole): string {
  switch (userRole) {
    case UserRole.REGULAR_USER:
      return 'User';
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.DELIVERER:
      return 'Deliverer';
    case UserRole.SHOP_OWNER:
      return 'Shop Owner';
    default:
      throw new Error(`Unknown user role: ${userRole}`);
  }
}

export interface UserInformation {
  id: string;
  name: string;
  username: string;
  roles: UserRole[];
}

export interface UserInformationWithSecret extends UserInformation {
  apiKey: string;
}

export function cleanUserInfo(
  info: UserInformationWithSecret
): UserInformation {
  return {
    id: info.id,
    name: info.name,
    username: info.username,
    roles: info.roles,
  };
}

export function cleanUserInfoSafe(
  info?: UserInformationWithSecret
): UserInformation | undefined {
  return info ? cleanUserInfo(info) : undefined;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  locations: Location[] = [...SAVED_LOCATIONS];
  paymentMethods: PaymentInformation[] = [...PAYMENT_METHODS];
  favoriteOrders: FavoriteOrder[] = [...FAVORITE_ORDERS];
  userInformation$ = new BehaviorSubject<UserInformationWithSecret | undefined>(
    environment.userInformation
  );

  constructor(private http: HttpClient) {
    HttpUtils._setUserService(this);
  }

  public login(username: string, apiKey: string): Observable<UserInformation> {
    if (this.userInformation$.value) {
      const info = cleanUserInfo(this.userInformation$.value);
      console.log('Already logged in', info);
      return of(info);
    }

    const url = `${environment.backendUrl}/login`;
    const body = {
      username,
    };
    const headers = this._addAuthorizationHeader(new HttpHeaders(), apiKey);

    return this.http.post<UserInformation>(url, body, { headers }).pipe(
      tap((userInfo) => {
        console.log('Login success', userInfo);
        const userInfoWithSecret: UserInformationWithSecret = {
          ...userInfo,
          apiKey,
        };
        this.userInformation$.next(userInfoWithSecret);
      }),
      catchError((error) => HttpUtils.handleError(error))
    );
  }

  public logout() {
    this.userInformation$.next(undefined);
  }

  public getUserInformation(): Observable<UserInformation | undefined> {
    return this.userInformation$
      .asObservable()
      .pipe(map((info) => cleanUserInfoSafe(info)));
  }

  public addAuthorizationHeader(headers: HttpHeaders): HttpHeaders {
    return this._addAuthorizationHeader(
      headers,
      this.userInformation$.value?.apiKey
    );
  }

  private _addAuthorizationHeader(
    headers: HttpHeaders,
    apiKey?: string
  ): HttpHeaders {
    if (apiKey && apiKey != '') {
      return headers.set(HttpUtils.AUTHORIZATION_HEADER, apiKey);
    } else {
      console.log('WARNING: No API key set');
      return headers;
    }
  }

  public getSavedLocations(): Observable<Location[]> {
    // TODO - implement
    return of(this.locations);
  }

  public addSavedLocation(location: Location): Observable<boolean> {
    // TODO - implement
    this.locations.push(location);
    return of(true).pipe(delay(500));
  }

  public getSavedPaymentMethods(): Observable<PaymentInformation[]> {
    // TODO - implement
    return of(this.paymentMethods);
  }

  public addSavedPaymentMethods(
    paymentMethod: PaymentInformation
  ): Observable<boolean> {
    // TODO - implement
    this.paymentMethods.push(paymentMethod);
    return of(true).pipe(delay(500));
  }

  public getFavoriteOrders(): Observable<FavoriteOrder[]> {
    // TODO - implement
    return of(this.favoriteOrders);
  }

  public addFavoriteOrder(order: FavoriteOrder): Observable<string> {
    // TODO - implement
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
    // TODO - implement
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
