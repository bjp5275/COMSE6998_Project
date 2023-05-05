import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AdminAdditionsComponent } from './components/admin-additions/admin-additions.component';
import { AdminCustomizeProductComponent } from './components/admin-customize-product/admin-customize-product.component';
import { AdminProductsComponent } from './components/admin-products/admin-products.component';
import { CustomerProductsComponent } from './components/customer-products/customer-products.component';
import { CustomizeProductComponent } from './components/customize-product/customize-product.component';
import { DeliveryOrdersComponent } from './components/delivery-orders/delivery-orders.component';
import { DeliveryStatusComponent } from './components/delivery-status/delivery-status.component';
import { EmptyComponent } from './components/empty/empty.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { OrderItemListComponent } from './components/order-item-list/order-item-list.component';
import { OrderListComponent } from './components/order-list/order-list.component';
import { PendingOrderStatusComponent } from './components/pending-order-status/pending-order-status.component';
import { PendingOrdersComponent } from './components/pending-orders/pending-orders.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { UserCartComponent } from './components/user-cart/user-cart.component';

import { TypedTemplateDirective } from './shared/directives/typed-template.directive';

import { LocationPipe } from './shared/pipes/location.pipe';
import { OrderStatusPercentagePipe } from './shared/pipes/order-status-percentage.pipe';
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
import { EditFavoriteDialog } from './components/dialogs/edit-favorite/edit-favorite.component';
import { RateOrderItemDialog } from './components/dialogs/rate-order-item/rate-order-item.component';

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
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    AdminAdditionsComponent,
    AdminCustomizeProductComponent,
    AdminProductsComponent,
    AppComponent,
    CustomerProductsComponent,
    CustomizeProductComponent,
    DeliveryOrdersComponent,
    DeliveryStatusComponent,
    EmptyComponent,
    FavoritesComponent,
    OrderDetailsComponent,
    OrderHistoryComponent,
    OrderItemListComponent,
    OrderListComponent,
    PendingOrdersComponent,
    PendingOrderStatusComponent,
    ProductListComponent,
    UserCartComponent,

    TypedTemplateDirective,

    LocationPipe,
    OrderItemPricePipe,
    OrderItemsPricePipe,
    OrderStatusPercentagePipe,
    PricePipe,
    ProductAdditionPricePipe,
    ProductPricePipe,
    SafeUrlPipe,

    CreateLocationDialog,
    CreatePaymentMethodDialog,
    EditFavoriteDialog,
    RateOrderItemDialog,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
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
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
