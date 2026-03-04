import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnerList } from './partner-list';

describe('PartnerList', () => {
  let component: PartnerList;
  let fixture: ComponentFixture<PartnerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnerList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
