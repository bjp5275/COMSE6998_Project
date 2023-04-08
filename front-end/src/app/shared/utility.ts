import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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

  static fromInputStringValue(timeInputValue: string | null | undefined): Date | null {
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
}
