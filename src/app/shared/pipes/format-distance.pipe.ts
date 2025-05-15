import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatDistance',
    standalone: false
})
@Injectable({ providedIn: 'root' })
export class FormatDistancePipe implements PipeTransform {

  transform(value: number): string {

    if (isNaN(value) || value === null) {
      return '';
    }
    if (value < 100) {
      return `${value} cm`;
    } else if (value > 100 && value < 200) {
      return `${(value / 100).toFixed(2)} meter`;
    } else {
      return `${(value / 100).toFixed(2)} meters`;
    }

  }

}
