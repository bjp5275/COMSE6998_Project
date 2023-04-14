import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, finalize, first, switchMap } from 'rxjs';
import { ProductAddition } from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';

@Component({
  selector: 'app-admin-additions',
  templateUrl: './admin-additions.component.html',
  styleUrls: ['./admin-additions.component.scss'],
})
export class AdminAdditionsComponent {
  additionForm = this.fb.group({
    name: ['', Validators.required],
    price: [
      '',
      [
        Validators.required,
        Validators.min(0),
        Validators.pattern(/^[0-9]+\.[0-9]{1,2}$/),
      ],
    ],
    enabled: [true, Validators.required],
  });

  additions$: Observable<ProductAddition[]>;
  submittingChange = false;
  private pullAdditions$ = new BehaviorSubject(null);

  constructor(
    private productsService: ProductsService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.additions$ = this.pullAdditions$.pipe(
      switchMap(() => productsService.getProductAdditions(true))
    );
  }

  enableAddition(addition: ProductAddition) {
    addition.enabled = true;
    this.saveAddition(addition);
  }

  disableAddition(addition: ProductAddition) {
    addition.enabled = false;
    this.saveAddition(addition);
  }

  onSubmitAddition(additionForm = this.additionForm.value) {
    if (this.additionForm.valid) {
      const addition: ProductAddition = {
        name: additionForm.name!,
        price: +additionForm.price!,
        enabled: additionForm.enabled || undefined,
      };

      this.saveAddition(addition);
    }
  }

  private saveAddition(addition: ProductAddition) {
    this.submittingChange = true;
    this.productsService
      .upsertProductAddition(addition)
      .pipe(
        first(),
        finalize(() => (this.submittingChange = false))
      )
      .subscribe((addition) => {
        if (addition) {
          this.pullAdditions$.next(null);
        } else {
          this.snackBar.open('Failed to save addition. Please try again', 'OK');
        }
      });
  }
}
