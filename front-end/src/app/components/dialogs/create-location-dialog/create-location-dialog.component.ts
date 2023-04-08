import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { STATES } from 'src/app/shared/constants';

@Component({
  selector: 'create-location-dialog',
  templateUrl: './create-location-dialog.html',
  styleUrls: ['./create-location-dialog.scss'],
})
export class CreateLocationDialog {
  readonly states = STATES;
  locationForm = this.fb.group({
    name: this.fb.control(''),
    streetAddress: this.fb.control('', Validators.required),
    city: this.fb.control('', Validators.required),
    state: this.fb.control(null, Validators.required),
    zip: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{5}$/),
    ]),
  });

  constructor(private fb: FormBuilder) {}
}
