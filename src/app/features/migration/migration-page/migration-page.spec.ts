import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MigrationPage } from './migration-page';

describe('MigrationPage', () => {
  let component: MigrationPage;
  let fixture: ComponentFixture<MigrationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrationPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MigrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
