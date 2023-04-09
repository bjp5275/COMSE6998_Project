import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Navigation, Router } from '@angular/router';
import { Observable, map, startWith } from 'rxjs';
import {
  OrderItem,
  Product,
  ProductAddition,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
  isCoffeeType,
  isMilkTypeOrUndefined,
} from 'src/app/model/models';
import { CartService } from 'src/app/shared/services/cart.service';

interface RouteState {
  product?: Product;
  orderItem?: OrderItem;
}

@Component({
  selector: 'app-customize-product',
  templateUrl: './customize-product.component.html',
  styleUrls: ['./customize-product.component.scss'],
})
export class CustomizeProductComponent {
  readonly convertCoffeeTypeToString = convertCoffeeTypeToString;
  readonly convertMilkTypeToString = convertMilkTypeToString;
  readonly routeState: RouteState;

  get isProductUpdate(): boolean {
    return !!this.routeState.orderItem;
  }

  product: Product;
  additionEntry = this.fb.control({ value: null, disabled: true });
  selectedAdditions = this.fb.array([] as string[]);
  productForm = this.fb.group({
    coffeeType: ['', Validators.required],
    milkType: ['', Validators.required],
    additionEntry: this.additionEntry,
    additions: this.selectedAdditions,
  });

  filteredAdditions: Observable<ProductAddition[] | null>;
  allowedAdditions: ProductAddition[] | null = null;

  constructor(
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private cartService: CartService
  ) {
    this.routeState = this._getRouteState(router.getCurrentNavigation());
    if (!this.routeState.product) {
      console.log(
        'ERROR: No product info to customize! Navigating back to safety...'
      );
      this.goBack();
      throw new Error('No product info to customize!');
    } else {
      this.product = this.routeState.product;
      this.allowedAdditions = this.routeState.product.allowedAdditions || [];
      this.additionEntry.enable();
    }

    if (this.routeState.orderItem) {
      this.productForm
        .get('coffeeType')!
        .setValue(this.routeState.orderItem.coffeeType);
      if (this.routeState.orderItem.additions) {
        this.routeState.orderItem.additions.forEach((addition) =>
          this.addAddition(addition.id!)
        );
      }
      if (this.routeState.orderItem.milkType) {
        this.productForm
          .get('milkType')!
          .setValue(this.routeState.orderItem.milkType);
      }
    } else {
      if (this.product.allowedCoffeeTypes.length == 1) {
        this.productForm
          .get('coffeeType')!
          .setValue(this.product.allowedCoffeeTypes[0]);
      }
      if (this.product.allowedMilkTypes?.length == 1) {
        this.productForm
          .get('milkType')!
          .setValue(this.product.allowedMilkTypes[0]);
      }
    }

    if (!this.product.allowedMilkTypes?.length) {
      this.productForm.get('milkType')!.disable();
    }

    this.filteredAdditions = this.additionEntry.valueChanges.pipe(
      startWith(''),
      map((addition) => {
        if (this.allowedAdditions) {
          return addition
            ? this._filterAdditions(addition)
            : this.allowedAdditions.slice();
        } else {
          return null;
        }
      })
    );
  }

  private _getRouteState(navigation: Navigation | null): RouteState {
    const product = navigation?.extras?.state?.['product'];
    const orderItem = navigation?.extras?.state?.['orderItem'];
    return {
      product,
      orderItem,
    };
  }

  private _filterAdditions(value: string): ProductAddition[] | null {
    const filterValue = value.toLowerCase();

    if (!this.allowedAdditions) {
      return null;
    }

    return this.allowedAdditions.filter((addition) =>
      addition.name.toLowerCase().includes(filterValue)
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
        const fullAddition = this.product.allowedAdditions!.find(
          (a) => a.id == additionId
        );
        additions!.push(fullAddition!);
      });
    }

    return additions;
  }

  onSubmit(form = this.productForm.value) {
    // Get coffee type
    const coffeeType: string = form.coffeeType!;
    if (!isCoffeeType(coffeeType)) {
      throw Error('ERROR: Unknown coffee type');
    }

    // Get milk type
    const milkType: string | undefined = form.milkType || undefined;
    if (!isMilkTypeOrUndefined(milkType)) {
      throw Error('ERROR: Unknown milk type');
    }

    // Get additions
    let additions = this.getSelectedAdditions();

    const newOrderItem: OrderItem = {
      productId: this.product.id,
      basePrice: this.product.basePrice,
      coffeeType,
      milkType,
      additions,
    };

    if (this.isProductUpdate) {
      this.cartService.updateItem(this.routeState.orderItem!, newOrderItem);
    } else {
      this.cartService.addItem(newOrderItem);
    }

    this.goBack();
  }

  private goBack() {
    try {
      this.location.back();
    } catch (error) {
      this.router.navigateByUrl('/');
    }
  }
}
