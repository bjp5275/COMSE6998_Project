import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Observable,
  concat,
  finalize,
  first,
  of,
  switchMap,
} from 'rxjs';
import { ProductAddition } from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { CustomValidators } from 'src/app/shared/utility';

@Component({
  selector: 'app-admin-additions',
  templateUrl: './admin-additions.component.html',
  styleUrls: ['./admin-additions.component.scss'],
})
export class AdminAdditionsComponent {
  additionForm = this.fb.group({
    id: '',
    name: ['', Validators.required],
    price: [
      null as number | null,
      [Validators.required, CustomValidators.price(0, true)],
    ],
    enabled: [true, Validators.required],
  });

  additions$: Observable<ProductAddition[] | null>;
  submittingChange = false;
  private pullAdditions$ = new BehaviorSubject(null);

  constructor(
    private productsService: ProductsService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.additions$ = this.pullAdditions$.pipe(
      switchMap(() =>
        concat(of(null), productsService.getProductAdditions(true))
      )
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
        id: additionForm.id || undefined,
        name: additionForm.name!,
        price: +additionForm.price!,
        enabled: additionForm.enabled || undefined,
      };

      this.saveAddition(addition);
    }
  }

  editAddition(addition: ProductAddition) {
    this.additionForm.setValue({
      id: addition.id!,
      name: addition.name,
      price: addition.price,
      enabled: addition.enabled || true,
    });

    document?.getElementById('addition-form')?.scrollIntoView(false);
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
