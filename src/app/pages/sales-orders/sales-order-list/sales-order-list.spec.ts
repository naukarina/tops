import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderList } from './sales-order-list';

describe('SalesOrderList', () => {
  let component: SalesOrderList;
  let fixture: ComponentFixture<SalesOrderList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrderList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
