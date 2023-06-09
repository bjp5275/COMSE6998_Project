import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Navigation, Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  first,
  map,
  merge,
  of,
  startWith,
} from 'rxjs';
import {
  CoffeeType,
  MilkType,
  Product,
  ProductAddition,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { ProductsService } from 'src/app/shared/services/products.service';
import { UserService } from 'src/app/shared/services/user.service';
import { CustomValidators, HttpError } from 'src/app/shared/utility';

interface RouteState {
  product?: Product;
}

@Component({
  selector: 'app-admin-customize-product',
  templateUrl: './admin-customize-product.component.html',
  styleUrls: ['./admin-customize-product.component.scss'],
})
export class AdminCustomizeProductComponent implements OnInit {
  readonly ALL_COFFEE_TYPES: CoffeeType[] = Object.values(CoffeeType);
  readonly convertCoffeeTypeToString = convertCoffeeTypeToString;
  readonly ALL_MILK_TYPES: MilkType[] = Object.values(MilkType);
  readonly convertMilkTypeToString = convertMilkTypeToString;
  readonly routeState: RouteState;

  get isProductUpdate(): boolean {
    return !!this.routeState.product;
  }

  get imageUrl(): string | null {
    return this.productForm.get('imageUrl')!.value;
  }

  additionEntry = this.fb.control({ value: null, disabled: true });
  selectedAdditions = this.fb.array([] as string[]);
  productForm = this.fb.group({
    name: ['', Validators.required],
    basePrice: [
      null as number | null,
      [Validators.required, CustomValidators.price(0.01, true)],
    ],
    imageUrl: ['', Validators.required],
    enabled: true,
    allowedCoffeeTypes: [
      [] as CoffeeType[],
      [Validators.required, Validators.minLength(1)],
    ],
    allowedMilkTypes: [[] as MilkType[]],
    additionEntry: this.additionEntry,
    additions: this.selectedAdditions,
  });

  filteredAdditions: Observable<ProductAddition[] | null>;
  allowedAdditions: ProductAddition[] | undefined;
  savingProduct = false;

  constructor(
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private productService: ProductsService,
    private userService: UserService
  ) {
    this.routeState = this._getRouteState(router.getCurrentNavigation());

    this.filteredAdditions = merge(
      this.additionEntry.valueChanges.pipe(
        startWith(''),
        map((addition) =>
          this._filterAdditions(addition, this.selectedAdditions.value)
        )
      ),
      this.selectedAdditions.valueChanges.pipe(
        map((selectedIds) => this._filterAdditions(null, selectedIds))
      )
    );
  }

  ngOnInit(): void {
    if (this.routeState.product) {
      const product = this.routeState.product;
      this.productForm.patchValue({ ...this.routeState.product });

      if (product.allowedAdditions) {
        product.allowedAdditions.forEach((addition) =>
          this.addAddition(addition.id!)
        );
      }
    }

    this.productService
      .getProductAdditions(true)
      .pipe(
        first(),
        catchError((err: HttpError) => {
          this.snackBar.open(
            `Failed to load product additions: ${err.errorMessage}`,
            'Dismiss'
          );
          return of([] as ProductAddition[]);
        }),
        finalize(() => this.additionEntry.enable())
      )
      .subscribe((additions) => (this.allowedAdditions = additions));
  }

  private _getRouteState(navigation: Navigation | null): RouteState {
    const product = navigation?.extras?.state?.['product'];
    return {
      product,
    };
  }

  private _filterAdditions(
    value: string | null,
    selectedAdditions: (string | null)[]
  ): ProductAddition[] | null {
    if (!this.allowedAdditions) {
      return null;
    }

    const filterValue = value?.toLowerCase() || '';

    return this.allowedAdditions.filter(
      (addition) =>
        addition.name.toLowerCase().includes(filterValue) &&
        !selectedAdditions.find((id) => addition.id == id)
    );
  }

  getAdditionName(id: string): string {
    return (
      this.allowedAdditions?.find((addition) => addition.id == id)?.name ||
      'Unknown'
    );
  }

  addAddition(id: string) {
    this.selectedAdditions.push(this.fb.control(id));
  }

  onSelectAddition(event: MatAutocompleteSelectedEvent) {
    this.addAddition(event.option.value);
    this.additionEntry.setValue(null);
    event.option.deselect();
  }

  onRemoveAddition(index: number) {
    this.selectedAdditions.removeAt(index);
  }

  getSelectedAdditions(): ProductAddition[] | undefined {
    let additions: ProductAddition[] | undefined;
    if (this.selectedAdditions.value?.length) {
      additions = [];
      this.selectedAdditions.value.forEach((additionId) => {
        const fullAddition = this.allowedAdditions!.find(
          (a) => a.id == additionId
        );
        additions!.push(fullAddition!);
      });
    }

    return additions;
  }

  onImageSelected(event: Event) {
    const target = event.target;
    let imageFile: File;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.files ||
      !target.files[0]
    ) {
      console.log('No image selected');
      return;
    } else {
      imageFile = target.files[0];
    }

    this.userService
      .uploadImage(imageFile)
      .pipe(first())
      .subscribe({
        next: (imageUrl) =>
          this.productForm.get('imageUrl')!.setValue(imageUrl),
        error: () =>
          this.snackBar.open('Failed to upload image. Please try again', 'OK'),
      });
  }

  onSubmit(form = this.productForm.value) {
    // Get coffee types
    const allowedCoffeeTypes: CoffeeType[] = form.allowedCoffeeTypes!;
    if (allowedCoffeeTypes.length == 0) {
      throw Error('ERROR: At least one coffee type must be selected');
    }

    // Get milk types
    let allowedMilkTypes: MilkType[] | undefined =
      form.allowedMilkTypes || undefined;
    if (allowedMilkTypes?.length == 0) {
      allowedMilkTypes = undefined;
    }

    // Get additions
    let allowedAdditions = this.getSelectedAdditions();

    const productValue = {
      id: this.routeState.product?.id,
      name: form.name!,
      basePrice: form.basePrice!,
      imageUrl: form.imageUrl!,
      enabled: form.enabled || true,
      allowedCoffeeTypes,
      allowedMilkTypes,
      allowedAdditions,
    };

    this.savingProduct = true;
    this.productService
      .upsertProduct(productValue as Product)
      .pipe(
        catchError(() => of(null)),
        first(),
        finalize(() => (this.savingProduct = false))
      )
      .subscribe((product) => {
        if (product) {
          this.goBack();
        } else {
          this.snackBar.open('Failed to save product. Please try again', 'OK');
        }
      });
  }

  private goBack() {
    try {
      this.location.back();
    } catch (error) {
      this.router.navigateByUrl('/');
    }
  }
}
