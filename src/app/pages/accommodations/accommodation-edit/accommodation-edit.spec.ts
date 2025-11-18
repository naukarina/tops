import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccommodationEdit } from './accommodation-edit';

describe('AccommodationEdit', () => {
  let component: AccommodationEdit;
  let fixture: ComponentFixture<AccommodationEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccommodationEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccommodationEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
