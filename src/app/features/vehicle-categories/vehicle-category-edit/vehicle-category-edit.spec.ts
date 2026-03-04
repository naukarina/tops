import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleCategoryEdit } from './vehicle-category-edit';

describe('VehicleCategoryEdit', () => {
  let component: VehicleCategoryEdit;
  let fixture: ComponentFixture<VehicleCategoryEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleCategoryEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleCategoryEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
