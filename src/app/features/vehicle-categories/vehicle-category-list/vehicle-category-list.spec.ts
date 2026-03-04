import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleCategoryList } from './vehicle-category-list';

describe('VehicleCategoryList', () => {
  let component: VehicleCategoryList;
  let fixture: ComponentFixture<VehicleCategoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleCategoryList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleCategoryList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
