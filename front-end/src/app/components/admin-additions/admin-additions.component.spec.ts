import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAdditionsComponent } from './admin-additions.component';

describe('AdminAdditionsComponent', () => {
  let component: AdminAdditionsComponent;
  let fixture: ComponentFixture<AdminAdditionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminAdditionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAdditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
