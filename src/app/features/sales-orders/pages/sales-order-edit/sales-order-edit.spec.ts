import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderEditComponent } from './sales-order-edit';

describe('SalesOrderEdit', () => {
  let component: SalesOrderEditComponent;
  let fixture: ComponentFixture<SalesOrderEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOrderEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
