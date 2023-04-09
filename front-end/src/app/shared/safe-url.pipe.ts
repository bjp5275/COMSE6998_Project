import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safeUrl',
  pure: true,
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private domSanitizer: DomSanitizer) {}

  transform(url: string, replaceSpaces = false): SafeResourceUrl {
    if (replaceSpaces) {
      url = url.replaceAll(' ', '%20');
    }

    console.log(url);
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
