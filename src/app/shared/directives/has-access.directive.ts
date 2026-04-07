import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService } from '../../core/auth/permission.service';
import { AccessLevel } from '../../core/models/user-profile.model';

@Directive({
  selector: '[appHasAccess]',
  standalone: true,
})
export class HasAccessDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);
  private sub?: Subscription;

  private feature!: string;
  private requiredLevel: AccessLevel = 'user';

  // Syntax: *appHasAccess="['pricelists', 'user']"
  @Input() set appHasAccess(value: [string, AccessLevel]) {
    this.feature = value[0];
    this.requiredLevel = value[1];
  }

  ngOnInit() {
    this.sub = this.permissionService
      .hasAccess(this.feature, this.requiredLevel)
      .subscribe((hasAccess) => {
        this.viewContainer.clear();
        if (hasAccess) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        }
      });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
