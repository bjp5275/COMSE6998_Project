import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable, delay, first, map, startWith } from 'rxjs';
import { ProductAddition } from '../model/models';
import { ProductsService } from '../shared/products.service';

@Component({
  selector: 'app-customize-product',
  templateUrl: './customize-product.component.html',
  styleUrls: ['./customize-product.component.scss'],
})
export class CustomizeProductComponent {
  productForm = this.fb.group({
    coffeeType: [null, Validators.required],
    milkType: [null, Validators.required],
    additionEntry: [{ value: null, disabled: true }],
    additions: this.fb.array([]),
  });
  filteredAdditions: Observable<ProductAddition[] | null>;
  additions: ProductAddition[] | null = null;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService
  ) {
    this.filteredAdditions = this.productForm
      .get('additionEntry')!
      .valueChanges.pipe(
        startWith(''),
        map((addition) => {
          if (this.additions) {
            return addition
              ? this._filterAdditions(addition)
              : this.additions.slice();
          } else {
            return null;
          }
        })
      );

    this.productsService
      .getProductAdditions()
      .pipe(delay(5000), first())
      .subscribe((additions) => {
        this.additions = additions;
        this.productForm.get('additionEntry')!.enable();
      });
  }

  private _filterAdditions(value: string): ProductAddition[] | null {
    const filterValue = value.toLowerCase();

    if (!this.additions) {
      return null;
    }

    return this.additions.filter((addition) =>
      addition.name.toLowerCase().includes(filterValue)
    );
  }
}
