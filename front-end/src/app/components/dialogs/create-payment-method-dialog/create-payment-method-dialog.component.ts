import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { PaymentInformation } from 'src/app/model/models';

@Component({
  selector: 'create-payment-method-dialog',
  templateUrl: './create-payment-method-dialog.html',
  styleUrls: ['./create-payment-method-dialog.scss'],
})
export class CreatePaymentMethodDialog {
  paymentInformationForm = this.fb.group({
    nameOnCard: this.fb.control('', Validators.required),
    cardNumber: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{16}$/),
      Validators.minLength(16),
      Validators.maxLength(16),
    ]),
    cvv: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[0-9]{3,4}$/),
      Validators.minLength(3),
      Validators.maxLength(4),
    ]),
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<
      CreatePaymentMethodDialog,
      PaymentInformation
    >
  ) {}

  submitForm(): void {
    if (this.paymentInformationForm.valid) {
      const formValue = this.paymentInformationForm.value;
      this.dialogRef.close({
        nameOnCard: formValue.nameOnCard!,
        cardNumber: formValue.cardNumber!.toString(),
        cvv: formValue.cvv!.toString(),
      });
    }
  }
}
