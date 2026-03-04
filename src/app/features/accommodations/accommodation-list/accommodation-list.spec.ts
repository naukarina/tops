import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccommodationList } from './accommodation-list';

describe('AccommodationList', () => {
  let component: AccommodationList;
  let fixture: ComponentFixture<AccommodationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccommodationList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccommodationList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
