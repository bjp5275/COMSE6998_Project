import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, finalize, first } from 'rxjs';
import {
  CreateOrder,
  Location,
  OrderItem,
  PaymentInformation,
} from 'src/app/model/models';
import { MINIMUM_ORDER_FUTURE_TIME } from 'src/app/shared/constants';
import { CartService } from 'src/app/shared/services/cart.service';
import { OrderService } from 'src/app/shared/services/order.service';
import { UserService } from 'src/app/shared/services/user.service';
import { CustomValidators, DateUtility } from 'src/app/shared/utility';
import { CreateLocationDialog } from '../dialogs/create-location-dialog/create-location-dialog.component';
import { CreatePaymentMethodDialog } from '../dialogs/create-payment-method-dialog/create-payment-method-dialog.component';
import { OrderItemAction } from '../order-item-list/order-item-list.component';

@Component({
  selector: 'app-user-cart',
  templateUrl: './user-cart.component.html',
  styleUrls: ['./user-cart.component.scss'],
})
export class UserCartComponent {
  readonly FUTURE_TIME_ERROR = MINIMUM_ORDER_FUTURE_TIME.ERROR_TEXT;
  readonly ORDER_ITEM_ACTIONS: OrderItemAction[] = [
    {
      buttonText: 'Customize',
      onClick: (product, orderItem, _index) => {
        this.router.navigateByUrl('/product', {
          state: { product, orderItem },
        });
      },
    },
    {
      buttonText: 'Remove',
      color: 'warn',
      onClick: (_product, _orderItem, index) => {
        this.removeFromCart(index);
      },
    },
  ];

  savedLocations$: Observable<Location[]>;
  savedPaymentMethods$: Observable<PaymentInformation[]>;
  savingLocation = false;
  savingPaymentMethod = false;
  submittingOrder = false;

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
      null as string | null,
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
    return this.cartService.getOrderItems();
  }

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private userService: UserService,
    private orderService: OrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.savedLocations$ = userService.getSavedLocations();
    this.savedPaymentMethods$ = userService.getSavedPaymentMethods();
  }

  removeFromCart(index: number) {
    this.cartService.removeItem(index);
  }

  cartHasItems(): boolean {
    return this.cartService.size() > 0;
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

  onSubmit(form = this.orderForm.value) {
    const orderItems = [...this.cartService.getOrderItems()];
    const orderDetails: CreateOrder = {
      deliveryTime: DateUtility.fromInputStringValue(form.deliveryTime)!,
      deliveryLocation: form.deliveryLocation!,
      payment: form.payment!,
      items: orderItems,
    };

    this.submittingOrder = true;
    this.orderService
      .submitOrder(orderDetails)
      .pipe(
        first(),
        finalize(() => (this.submittingOrder = false))
      )
      .subscribe({
        next: (order) => {
          this.cartService.clearCart();
          this.router.navigate(['/order'], {
            queryParams: { id: order.id! },
            state: { order: order },
          });
        },
        error: (err) => {
          console.log('ERROR: Failed to submit order', err);
          this.snackBar.open(
            'Failed to submit order. Please try again.',
            'Close'
          );
        },
      });
  }
}
