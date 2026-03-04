import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnerEdit } from './partner-edit';

describe('PartnerEdit', () => {
  let component: PartnerEdit;
  let fixture: ComponentFixture<PartnerEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnerEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
