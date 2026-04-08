import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppFeatureEdit } from './app-feature-edit';

describe('AppFeatureEdit', () => {
  let component: AppFeatureEdit;
  let fixture: ComponentFixture<AppFeatureEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFeatureEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppFeatureEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
