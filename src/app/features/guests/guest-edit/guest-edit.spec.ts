import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestEdit } from './guest-edit';

describe('GuestEdit', () => {
  let component: GuestEdit;
  let fixture: ComponentFixture<GuestEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuestEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
