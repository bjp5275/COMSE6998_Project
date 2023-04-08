import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, finalize, first, map, shareReplay, tap } from 'rxjs';
import {
  Location,
  OrderItem,
  PaymentInformation,
  Product,
  convertCoffeeTypeToString,
  convertMilkTypeToString,
} from 'src/app/model/models';
import { CartService } from 'src/app/shared/cart.service';
import { MINIMUM_ORDER_FUTURE_TIME } from 'src/app/shared/constants';
import { ProductsService } from 'src/app/shared/products.service';
import { UserService } from 'src/app/shared/user.service';
import { CustomValidators } from 'src/app/shared/utility';
import { CreateLocationDialog } from '../dialogs/create-location-dialog/create-location-dialog.component';
import { CreatePaymentMethodDialog } from '../dialogs/create-payment-method-dialog/create-payment-method-dialog.component';

@Component({
  selector: 'app-user-cart',
  templateUrl: './user-cart.component.html',
  styleUrls: ['./user-cart.component.scss'],
})
export class UserCartComponent {
  readonly FUTURE_TIME_ERROR = MINIMUM_ORDER_FUTURE_TIME.ERROR_TEXT;
  readonly convertCoffeeTypeToString = convertCoffeeTypeToString;
  readonly convertMilkTypeToString = convertMilkTypeToString;
  readonly additionsMapping: { [k: string]: string } = {
    '=0': '0 additions',
    '=1': '1 addition',
    other: '# additions',
  };

  productMap$: Observable<Map<string, Product>>;
  savedLocations$: Observable<Location[]>;
  savedPaymentMethods$: Observable<PaymentInformation[]>;
  loadingProductMap = true;
  savingLocation = false;
  savingPaymentMethod = false;
  deliveryLocationControl = this.fb.control(
    null as Location | null,
    Validators.required
  );
  paymentMethodControl = this.fb.control(
    null as PaymentInformation | null,
    Validators.required
  );
  orderForm = this.fb.group({
    deliveryTime: [
      null,
      [
        Validators.required,
        CustomValidators.futureTime(
          MINIMUM_ORDER_FUTURE_TIME.HOURS,
          MINIMUM_ORDER_FUTURE_TIME.MINUTES
        ),
      ],
    ],
    deliveryLocation: this.deliveryLocationControl,
    payment: this.paymentMethodControl,
  });

  get orderItems(): OrderItem[] {
    return this.cartService.getProducts();
  }

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    productService: ProductsService
  ) {
    this.productMap$ = productService.getProducts().pipe(
      map((products) => {
        const productMap = new Map<string, Product>();
        products.forEach((product) => productMap.set(product.id, product));
        return productMap;
      }),
      tap(() => (this.loadingProductMap = false)),
      shareReplay(1)
    );

    this.savedLocations$ = userService.getSavedLocations();
    this.savedPaymentMethods$ = userService.getSavedPaymentMethods();
  }

  expandOrderItems(
    products: OrderItem[],
    productLookup?: Map<string, Product>
  ) {
    return products.map((product) => {
      const value = {
        ...productLookup?.get(product.productId!),
        ...product,
      };
      return value;
    });
  }

  onSubmit(form = this.orderForm.value) {
    console.log('Submitted form', form);
  }

  removeFromCart(index: number) {
    this.cartService.removeItem(index);
  }

  onSelectCreateLocation(option: MatOption) {
    if (option.selected) {
      this.deliveryLocationControl.reset();
      this.deliveryLocationControl.setErrors(null);
      this.deliveryLocationControl.disable();
      this.dialog
        .open(CreateLocationDialog)
        .afterClosed()
        .subscribe((newLocation) => {
          if (newLocation) {
            this.savingLocation = true;
            this.userService
              .addSavedLocation(newLocation)
              .pipe(
                first(),
                finalize(() => {
                  this.deliveryLocationControl.enable();
                  this.savingLocation = false;
                })
              )
              .subscribe((res) => {
                if (res) {
                  this.deliveryLocationControl.setValue(newLocation);
                } else {
                  console.log('ERROR: Failed to save new location');
                  this.snackBar.open(
                    'Failed to save new location. Please try again.',
                    'Close'
                  );
                }
              });
          } else {
            this.deliveryLocationControl.enable();
          }
        });
    }
  }

  onSelectCreatePaymentMethod(option: MatOption) {
    if (option.selected) {
      this.paymentMethodControl.reset();
      this.paymentMethodControl.setErrors(null);
      this.paymentMethodControl.disable();
      this.dialog
        .open(CreatePaymentMethodDialog)
        .afterClosed()
        .subscribe((newPaymentMethod) => {
          if (newPaymentMethod) {
            this.savingPaymentMethod = true;
            this.userService
              .addSavedPaymentMethods(newPaymentMethod)
              .pipe(
                first(),
                finalize(() => {
                  this.paymentMethodControl.enable();
                  this.savingPaymentMethod = false;
                })
              )
              .subscribe((res) => {
                if (res) {
                  this.paymentMethodControl.setValue(newPaymentMethod);
                } else {
                  console.log('ERROR: Failed to save new payment method');
                  this.snackBar.open(
                    'Failed to save new payment method. Please try again.',
                    'Close'
                  );
                }
              });
          } else {
            this.paymentMethodControl.enable();
          }
        });
    }
  }
}
