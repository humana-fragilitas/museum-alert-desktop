// TO DO: either default export or multiple named exports

export function formatDistance(value: number): string {

    if (value < 100) {
      return `${value} cm`;
    } else if (value > 100 && value < 200){
      return `${(value / 100).toFixed(2)} meter`;
    } else {
      return `${(value / 100).toFixed(2)} meters`;
    }

  }