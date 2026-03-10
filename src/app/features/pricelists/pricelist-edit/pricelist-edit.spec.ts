import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PricelistEdit } from './pricelist-edit';

describe('PricelistEdit', () => {
  let component: PricelistEdit;
  let fixture: ComponentFixture<PricelistEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricelistEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PricelistEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
