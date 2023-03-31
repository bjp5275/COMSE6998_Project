import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomizeProductComponent } from './customize-product.component';

describe('CustomizeProductComponent', () => {
  let component: CustomizeProductComponent;
  let fixture: ComponentFixture<CustomizeProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomizeProductComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomizeProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
