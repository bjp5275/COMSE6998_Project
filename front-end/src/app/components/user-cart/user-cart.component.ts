import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { first, map } from 'rxjs';
import { OrderItem, Product } from 'src/app/model/models';
import { CartService } from 'src/app/shared/cart.service';
import { ProductsService } from 'src/app/shared/products.service';

@Component({
  selector: 'app-user-cart',
  templateUrl: './user-cart.component.html',
  styleUrls: ['./user-cart.component.scss'],
})
export class UserCartComponent {
  productLookup?: Map<string, Product>;
  orderForm = this.fb.group({
    deliveryTime: [null, Validators.required],
    deliveryLocation: [null, Validators.required],
    payment: [null, Validators.required],
  });

  get products(): OrderItem[] {
    return this.cartService.getProducts();
  }

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    productService: ProductsService
  ) {
    productService
      .getProducts()
      .pipe(
        map((products) => {
          const productMap = new Map<string, Product>();
          products.forEach((product) => productMap.set(product.id, product));
          return productMap;
        }),
        first()
      )
      .subscribe((productMap) => (this.productLookup = productMap));
  }

  expandOrderItems(products: OrderItem[], productLookup?: Map<string, Product>) {
    return products.map((product) => {
      const value = {
        ...productLookup?.get(product.productId!),
        additions: product.additions,
      };
      return value;
    });
  }

  onSubmit(form = this.orderForm.value) {
    console.log('Submitted form', form);
  }
}
