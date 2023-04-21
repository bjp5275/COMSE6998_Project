import { Directive, Input } from '@angular/core';

/*
Example Usage:

  <ng-template let-value [typedTemplate]="VALUE_TYPE">
    <div>{{ value.field }}</div>
  </ng-template>

  readonly VALUE_TYPE!: CustomType;
*/

@Directive({ selector: 'ng-template[typedTemplate]' })
export class TypedTemplateDirective<TypeToken> {
  @Input('typedTemplate') typeToken!: TypeToken;

  constructor() {}

  static ngTemplateContextGuard<TypeToken>(
    dir: TypedTemplateDirective<TypeToken>,
    ctx: unknown
  ): ctx is { $implicit: TypeToken } {
    return true;
  }
}
