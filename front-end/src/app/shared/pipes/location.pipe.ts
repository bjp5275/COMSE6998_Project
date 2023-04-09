import { Pipe, PipeTransform } from '@angular/core';
import { Location } from 'src/app/model/models';

/*
 * Expands a location to a formatted string.
 * Usage:
 *   value | locationAddress
 * Example:
 *   {{ location | locationAddress }}
 *   where location = { streetAddress: '123 Main Street', city: 'City', state: 'AB', zip: '12345'}
 *   formats to: 123 Main Street, City, AB 12345
 */
@Pipe({
  name: 'locationAddress',
  pure: true,
})
export class LocationPipe implements PipeTransform {
  transform(value?: Location | null): string {
    if (!value) {
      return '';
    }

    return `${value.streetAddress}, ${value.city}, ${value.state} ${value.zip}`;
  }
}
