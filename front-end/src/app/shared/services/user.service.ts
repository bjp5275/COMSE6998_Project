import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  of,
  retry,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import {
  FavoriteOrder,
  Location,
  PaymentInformation,
  UserInformation,
} from 'src/app/model/models';
import { environment } from 'src/environments/environment';
import { Equals, HttpError, HttpUtils } from '../utility';
import { cleanOrderItemsFromService } from './order.service';

export interface UserInformationWithSecret extends UserInformation {
  apiKey: string;
}

interface UpdatedUserInformationWithSecret {
  userInformation: UserInformationWithSecret;
  updated: boolean;
  error?: HttpError;
}

export function cleanUserInfo(
  info: UserInformationWithSecret
): UserInformation {
  return {
    id: info.id,
    name: info.name,
    username: info.username,
    roles: info.roles,
    favorites: cleanFavoriteOrdersFromService(info.favorites),
    locations: info.locations,
    paymentMethods: info.paymentMethods,
  };
}

export function cleanUserInfoSafe(
  info?: UserInformationWithSecret
): UserInformation | undefined {
  return info ? cleanUserInfo(info) : undefined;
}

function cleanFavoriteOrderFromService(order: FavoriteOrder): FavoriteOrder {
  if (order) {
    order.items = cleanOrderItemsFromService(order.items);
  }

  return order;
}

function cleanFavoriteOrdersFromService(
  orders?: FavoriteOrder[]
): FavoriteOrder[] | undefined {
  if (orders) {
    orders = orders.map((order) => cleanFavoriteOrderFromService(order));
  }

  return orders;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
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
    return this.userInformation$.pipe(map((info) => cleanUserInfoSafe(info)));
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

  private updateUserInformation(
    updater: (curInfo: UserInformation) => UserInformation | null
  ): Observable<UpdatedUserInformationWithSecret> {
    const current = this.userInformation$.value;
    let updatedValue: UserInformation | null = null;
    if (!!current) {
      updatedValue = updater(cleanUserInfo(current));
    }

    if (!updatedValue) {
      return of({ userInformation: current!, updated: false });
    }

    const next: UserInformationWithSecret = {
      ...updatedValue,
      apiKey: current!.apiKey,
    };

    const url = `${environment.backendUrl}/user`;
    const headers = HttpUtils.getBaseHeaders();
    return this.http
      .post(url, updatedValue, { headers, observe: 'response' })
      .pipe(
        retry(HttpUtils.RETRY_ATTEMPTS),
        catchError((error) => of(HttpUtils.convertError(error))),
        switchMap((response) => {
          if ('ok' in response && response.ok) {
            this.userInformation$.next(next);
            return of({
              userInformation: next,
              updated: true,
            } as UpdatedUserInformationWithSecret);
          } else if ('errorCode' in response) {
            return of({
              userInformation: current,
              updated: false,
              error: response,
            } as UpdatedUserInformationWithSecret);
          } else {
            return of({
              userInformation: current,
              updated: false,
              error: { errorCode: -1, errorMessage: 'Unknown' },
            } as UpdatedUserInformationWithSecret);
          }
        })
      );
  }

  public getSavedLocations(): Observable<Location[]> {
    return this.userInformation$.pipe(map((info) => info?.locations || []));
  }

  public addSavedLocation(location: Location): Observable<boolean> {
    return this.updateUserInformation((curInfo) => {
      const locations = curInfo.locations || [];
      locations.push(location);
      return { ...curInfo, locations };
    }).pipe(map((val) => val.updated));
  }

  public getSavedPaymentMethods(): Observable<PaymentInformation[]> {
    return this.userInformation$.pipe(
      map((info) => info?.paymentMethods || [])
    );
  }

  public addSavedPaymentMethods(
    paymentMethod: PaymentInformation
  ): Observable<boolean> {
    return this.updateUserInformation((curInfo) => {
      const paymentMethods = curInfo.paymentMethods || [];
      paymentMethods.push(paymentMethod);
      return { ...curInfo, paymentMethods };
    }).pipe(map((val) => val.updated));
  }

  public getFavoriteOrders(): Observable<FavoriteOrder[]> {
    return this.userInformation$.pipe(map((info) => info?.favorites || []));
  }

  public addFavoriteOrder(order: FavoriteOrder): Observable<string> {
    return this.updateUserInformation((curInfo) => {
      const favorites = curInfo.favorites || [];
      favorites.push({
        name: order.name,
        items: order.items,
      });
      return { ...curInfo, favorites };
    }).pipe(
      map((val) => {
        if (!val.updated) {
          throw val.error;
        }

        const favorite = val.userInformation.favorites?.find(
          (val) =>
            val.name == order.name && Equals.shallow(val.items, order.items)
        );

        if (!!favorite?.id) {
          return favorite.id;
        } else {
          throw Error('No matching favorite found');
        }
      })
    );
  }

  public updateFavoriteOrder(
    id: string,
    updatedOrder: FavoriteOrder
  ): Observable<boolean> {
    return this.updateUserInformation((curInfo) => {
      if (curInfo.favorites) {
        const favorite = curInfo.favorites.find((val) => val.id == id);
        if (favorite) {
          if (updatedOrder.name) {
            favorite.name = updatedOrder.name;
          }
          if (updatedOrder.items) {
            favorite.items = updatedOrder.items;
          }

          return curInfo;
        }
      }

      return null;
    }).pipe(map((val) => val.updated));
  }

  public uploadImage(image: File): Observable<string> {
    const url = `${environment.backendUrl}/upload`;

    let headers = HttpUtils.getBaseHeaders().set('Content-Type', image.type);

    return this.http
      .put<string>(url, image, {
        observe: 'response',
        headers,
      })
      .pipe(
        tap((response) => console.log('Got image upload response', response)),
        switchMap((response) => {
          if (response.ok) {
            const headers = response.headers;
            const bucket = headers.get(HttpUtils.PHOTO_BUCKET_HEADER);
            const key = headers.get(HttpUtils.PHOTO_KEY_HEADER);

            if (bucket && key) {
              return of(`https://${bucket}.s3.amazonaws.com/${key}`);
            }
          }

          return throwError(() => response.body);
        }),
        catchError((error) => {
          console.log('Got upload error: ', error);
          return throwError(() => new Error('Failed to upload photo'));
        })
      );
  }
}
