import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCustomizeProductComponent } from './admin-customize-product.component';

describe('CustomizeProductComponent', () => {
  let component: AdminCustomizeProductComponent;
  let fixture: ComponentFixture<AdminCustomizeProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminCustomizeProductComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCustomizeProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
