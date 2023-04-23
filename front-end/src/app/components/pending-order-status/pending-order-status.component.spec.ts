import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingOrderStatusComponent } from './pending-order-status.component';

describe('PendingOrderStatusComponent', () => {
  let component: PendingOrderStatusComponent;
  let fixture: ComponentFixture<PendingOrderStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PendingOrderStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingOrderStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
