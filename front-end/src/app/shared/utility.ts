import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  MonoTypeOperatorFunction,
  Observable,
  expand,
  switchMap,
  takeWhile,
  throwError,
  timer,
} from 'rxjs';
import { UserService } from './services/user.service';

export interface HttpError {
  errorCode: number;
  errorMessage: string;
}

export interface PollAfterDataConfig<T> {
  pollInterval?: number;
  takeWhilePredicate?: (value: T, index: number) => boolean;
}

export class ObservableUtils {
  public static DEFAULT_POLLING_MS = 2500;

  /**
   * Poll for data. Only start fetching new data after a previous fetch completes plus the specified poll interval
   * @param pollInterval interval to wait after a successful fetch to poll again
   * @returns the operator function to perform polling
   */
  public static pollAfterData<T>(
    config?: PollAfterDataConfig<T>
  ): MonoTypeOperatorFunction<T> {
    const pollInterval =
      config?.pollInterval || ObservableUtils.DEFAULT_POLLING_MS;
    const takeWhilePredicate = config?.takeWhilePredicate || (() => true);

    return (source$) =>
      source$.pipe(
        expand(() => timer(pollInterval).pipe(switchMap(() => source$))),
        takeWhile(takeWhilePredicate)
      );
  }
}

export class HttpUtils {
  static AUTHORIZATION_HEADER = 'X-Api-Key';
  static RETRY_ATTEMPTS = 2;
  static userService: UserService;

  public static _setUserService(userService: UserService) {
    this.userService = userService;
  }

  public static getBaseHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.userService) {
      headers = this.userService.addAuthorizationHeader(headers);
    }

    return headers;
  }

  public static handleError(error: Error): Observable<never> {
    var errorResponse: HttpError;
    console.log('Handling error', error);

    if (error instanceof HttpErrorResponse) {
      let errorMessage: string | undefined;
      try {
        if (error.error.message) {
          errorMessage = error.error.message;
        }
      } catch (error) {
        // Skip
      }

      errorResponse = {
        errorCode: error.status,
        errorMessage:
          errorMessage ||
          error.message ||
          error.statusText ||
          error.error ||
          `Error ${error.status}`,
      };
    } else if (error instanceof Error) {
      errorResponse = {
        errorCode: 0,
        errorMessage: error.message || error.name || 'Error',
      };
    } else {
      errorResponse = {
        errorCode: -1,
        errorMessage: 'Unknown',
      };
    }

    // return an observable with a user-facing error message
    console.log('Resolved error: ', errorResponse);
    return throwError(() => errorResponse);
  }

  public static convertDecimalFromString(
    decimalString: string | number
  ): number | undefined {
    if (!decimalString) {
      return undefined;
    } else {
      return Number(decimalString);
    }
  }
}

export class Equals {
  public static deep(object1: any, object2: any): boolean {
    return this.equals(object1, object2, (val1, val2) => this.deep(val1, val2));
  }

  public static shallow(object1: any, object2: any): boolean {
    return this.equals(object1, object2, (val1, val2) => val1 == val2);
  }

  private static equals(
    object1: any,
    object2: any,
    valueComparator: (val1: any, val2: any) => boolean
  ): boolean {
    if (
      this.sameUnassigned(object1, object2, null) ||
      this.sameUnassigned(object1, object2, undefined)
    ) {
      return true;
    } else if (
      this.differentUnassigned(object1, object2, null) ||
      this.differentUnassigned(object1, object2, undefined)
    ) {
      return false;
    }

    // Check for simply equality
    if (object1 == object2) {
      return true;
    }

    // Both objects have values for sure at this point
    const entries1 = Object.entries(object1);
    const entries2 = Object.entries(object2);

    // Ensure all entries in 1 are in 2 and vice versa
    return (
      this.containsAll(entries1, entries2, valueComparator) &&
      this.containsAll(entries2, entries1, valueComparator)
    );
  }

  private static containsAll(
    entrySet1: [string, unknown][],
    entrySet2: [string, unknown][],
    valueComparator: (val1: any, val2: any) => boolean
  ): boolean {
    // Ensure all entries in 1 are in 2
    for (let entry1 in entrySet1) {
      const entry2 = entrySet2.find((entry) => entry[0] === entry1[0]);
      if (!entry2) {
        // Missing entry in object2
        return false;
      } else if (!valueComparator(entry1[1], entry2[1])) {
        // Entry values don't match
        return false;
      }
    }

    return true;
  }

  private static sameUnassigned(
    object1: any,
    object2: any,
    unassignedValue: null | undefined
  ): boolean {
    if (object1 == unassignedValue && object2 == unassignedValue) {
      return true;
    } else {
      return false;
    }
  }

  private static differentUnassigned(
    object1: any,
    object2: any,
    unassignedValue: null | undefined
  ): boolean {
    if (
      (object1 != unassignedValue && object2 == unassignedValue) ||
      (object1 == unassignedValue && object2 != unassignedValue)
    ) {
      return true;
    } else {
      return false;
    }
  }
}

export class DateUtility {
  static TIME_INPUT_FORMAT = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

  static fromInputStringValue(
    timeInputValue: string | null | undefined
  ): Date | null {
    const extractedTime = this.TIME_INPUT_FORMAT.exec(timeInputValue || '');
    if (!extractedTime || extractedTime.length != 3) {
      return null;
    }

    const hours = +extractedTime[1];
    const minutes = +extractedTime[2];
    const dateValue = new Date();
    dateValue.setHours(hours, minutes, 0, 0);
    return dateValue;
  }
}

export class CustomValidators {
  static futureTime(offsetHours?: number, offsetMinutes?: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const controlTime = DateUtility.fromInputStringValue(control.value);
      if (!controlTime) {
        return {
          invalidTimeFormat: { value: control.value, expectedFormat: 'hh:mm' },
        } as ValidationErrors;
      }

      let minimumTime = new Date();
      if (offsetHours || offsetMinutes) {
        const newHours = minimumTime.getHours() + (offsetHours || 0);
        const newMinutes = minimumTime.getMinutes() + (offsetMinutes || 0);
        minimumTime.setHours(newHours, newMinutes);
      }

      if (controlTime < minimumTime) {
        return {
          futureTime: {
            value: control.value,
            minimumTime: minimumTime.toLocaleTimeString(),
          },
        } as ValidationErrors;
      } else {
        return null;
      }
    };
  }

  static price(minimum: number, allowCents: boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.pristine) {
        return null;
      } else if (!Number.isFinite(control.value)) {
        return {
          invalidPrice: {
            value: control.value,
            notANumber: 'Must be a number',
          },
        } as ValidationErrors;
      }

      const value: number = control.value;
      if (value < minimum) {
        return {
          invalidPrice: {
            value: control.value,
            minimumValue: minimum,
          },
        } as ValidationErrors;
      }

      const cents = value - Math.trunc(value);
      if (cents != 0 && !allowCents) {
        return {
          invalidPrice: {
            value: control.value,
            noCents: 'Must not include cents',
          },
        } as ValidationErrors;
      }

      return null;
    };
  }
}
