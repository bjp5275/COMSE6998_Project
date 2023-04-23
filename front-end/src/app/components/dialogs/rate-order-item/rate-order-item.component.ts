import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, first, of } from 'rxjs';
import { OrderItem, OrderRating, Product } from 'src/app/model/models';
import { OrderService } from 'src/app/shared/services/order.service';

export interface RatingInput {
  orderId: string;
  orderItem: OrderItem;
  product: Product;
}

@Component({
  selector: 'rate-order-item-dialog',
  templateUrl: './rate-order-item.component.html',
  styleUrls: ['./rate-order-item.component.scss'],
})
export class RateOrderItemDialog {
  savingRating = false;
  ratingForm = this.fb.group({
    rating: [null as number | null, Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RateOrderItemDialog, boolean>,
    private orderService: OrderService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public input: RatingInput
  ) {}

  submitForm(ratingInfo = this.ratingForm.value): void {
    if (this.ratingForm.valid) {
      this.savingRating = true;
      const orderId = this.input.orderId;
      const ratingValue = ratingInfo.rating!;
      const rating: OrderRating = {
        orderId,
        orderItemId: this.input.orderItem.id!,
        rating: ratingValue,
      };

      this.orderService
        .rateOrderItem(this.input.orderId, rating)
        .pipe(
          first(),
          catchError(() => of(false)),
          finalize(() => (this.savingRating = false))
        )
        .subscribe((success) => {
          if (success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(
              'Failed to save rating. Please try again.',
              'OK'
            );
          }
        });
    }
  }
}
