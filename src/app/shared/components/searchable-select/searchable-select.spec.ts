import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchableSelect } from './searchable-select';

describe('SearchableSelect', () => {
  let component: SearchableSelect;
  let fixture: ComponentFixture<SearchableSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchableSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
