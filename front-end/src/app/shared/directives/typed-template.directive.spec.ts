import { TypedTemplateDirective } from './typed-template.directive';

describe('TypedTemplateDirective', () => {
  it('should create an instance', () => {
    const directive = new TypedTemplateDirective<any>();
    expect(directive).toBeTruthy();
  });
});
