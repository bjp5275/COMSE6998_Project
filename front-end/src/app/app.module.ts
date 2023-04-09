import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

import { LocationPipe } from './shared/pipes/location.pipe';
import {
  OrderItemPricePipe,
  OrderItemsPricePipe,
  PricePipe,
  ProductAdditionPricePipe,
  ProductPricePipe,
} from './shared/pipes/product-price.pipe';
import { SafeUrlPipe } from './shared/pipes/safe-url.pipe';

import { CreateLocationDialog } from './components/dialogs/create-location-dialog/create-location-dialog.component';
import { CreatePaymentMethodDialog } from './components/dialogs/create-payment-method-dialog/create-payment-method-dialog.component';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrderItemListComponent } from './components/order-item-list/order-item-list.component';

@NgModule({
  declarations: [
    AppComponent,
    ProductListComponent,
    CustomizeProductComponent,
    UserCartComponent,

    LocationPipe,
    OrderItemPricePipe,
    OrderItemsPricePipe,
    PricePipe,
    ProductAdditionPricePipe,
    ProductPricePipe,
    SafeUrlPipe,

    CreateLocationDialog,
    CreatePaymentMethodDialog,
    OrderDetailsComponent,
    OrderItemListComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    ReactiveFormsModule,

    AppRoutingModule,

    MatAutocompleteModule,
    MatBadgeModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
