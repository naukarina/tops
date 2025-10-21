import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterDialog } from './filter-dialog';

describe('FilterDialog', () => {
  let component: FilterDialog;
  let fixture: ComponentFixture<FilterDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
