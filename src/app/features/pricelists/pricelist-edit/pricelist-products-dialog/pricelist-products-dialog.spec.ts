import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PricelistProductsDialog } from './pricelist-products-dialog';

describe('PricelistProductsDialog', () => {
  let component: PricelistProductsDialog;
  let fixture: ComponentFixture<PricelistProductsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricelistProductsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PricelistProductsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
