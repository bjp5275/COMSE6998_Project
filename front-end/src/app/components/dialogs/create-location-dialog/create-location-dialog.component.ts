import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Location } from 'src/app/model/models';
import { STATES } from 'src/app/shared/constants';

@Component({
  selector: 'create-location-dialog',
  templateUrl: './create-location-dialog.component.html',
  styleUrls: ['./create-location-dialog.component.scss'],
})
export class CreateLocationDialog {
  readonly states = STATES;
  locationForm = this.fb.group({
    name: this.fb.control(''),
    streetAddress: this.fb.control('', Validators.required),
    city: this.fb.control('', Validators.required),
    state: this.fb.control('', Validators.required),
    zip: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{5}$/),
    ]),
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateLocationDialog, Location>
  ) {}

  submitForm(): void {
    if (this.locationForm.valid) {
      const formValue = this.locationForm.value;
      this.dialogRef.close({
        name: formValue.name || undefined,
        streetAddress: formValue.streetAddress!,
        city: formValue.city!,
        state: formValue.state!,
        zip: formValue.zip!,
      });
    }
  }
}
