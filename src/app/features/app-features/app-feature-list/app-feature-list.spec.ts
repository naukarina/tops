import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppFeatureList } from './app-feature-list';

describe('AppFeatureList', () => {
  let component: AppFeatureList;
  let fixture: ComponentFixture<AppFeatureList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFeatureList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppFeatureList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
