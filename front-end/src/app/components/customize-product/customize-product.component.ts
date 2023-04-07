import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, delay, first, map, startWith } from 'rxjs';
import { ProductAddition } from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/products.service';

@Component({
  selector: 'app-customize-product',
  templateUrl: './customize-product.component.html',
  styleUrls: ['./customize-product.component.scss'],
})
export class CustomizeProductComponent {
  additionEntry = this.fb.control({ value: null, disabled: true });
  selectedAdditions = this.fb.array([] as string[]);
  productForm = this.fb.group({
    coffeeType: [null, Validators.required],
    milkType: [null, Validators.required],
    additionEntry: this.additionEntry,
    additions: this.selectedAdditions,
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
        console.log('Available additions', additions);
        this.additions = additions;
        this.additionEntry.enable();
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

  onSelectAddition(event: MatAutocompleteSelectedEvent) {
    this.selectedAdditions.push(this.fb.control(event.option.value));
    this.additionEntry.setValue(null);
    event.option.deselect();
  }

  onRemoveAddition(index: number) {
    this.selectedAdditions.removeAt(index);
  }

  onSubmit(form = this.productForm.value) {
    console.log('Submitted form', form);
  }
}
