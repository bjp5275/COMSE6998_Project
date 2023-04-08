import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { Location } from 'src/app/model/models';

const SAVED_LOCATIONS: Location[] = [
  {
    name: 'Home',
    streetAddress: '123 Main Street',
    city: 'Sesame City',
    state: 'AB',
    zip: '12345',
  },
  {
    streetAddress: '456 Second Avenue',
    city: 'Gotham',
    state: 'CD',
    zip: '54321',
  },
];

@Injectable({
  providedIn: 'root',
})
export class UserService {
  locations: Location[] = [...SAVED_LOCATIONS];

  constructor() {}

  public getSavedLocations(): Observable<Location[]> {
    return of(this.locations);
  }

  public addSavedLocation(location: Location): Observable<boolean> {
    this.locations.push(location);
    return of(true).pipe(delay(500));
  }
}
