import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventBusService {

  private eventBus = new BehaviorSubject<{ event: string; payload: any } | null>(null);

  /**
   * Publish an event with optional payload.
   * @param event The event name
   * @param payload Optional data to send with the event
   */
  publish(event: string, payload?: any): void {
    console.log(`EventBus: Published event '${event}'`, payload);
    this.eventBus.next({ event, payload });
  }

  /**
   * Listen for events by name.
   * @param event The event name to listen for
   * @returns Observable of event payload
   */
  on<T>(event: string): Observable<T> {
    return this.eventBus.asObservable().pipe(
      filter(e => !!e && e.event === event), // Filter only matching events
      filter(e => e !== null),              // Filter out null initial value
      // Type assertion to ensure correct type
      filter((e): e is { event: string; payload: T } => e !== null),
      map(e => e.payload)
    );
  }

  /**
   * Clear the event bus by emitting null
   */
  clear(): void {
    this.eventBus.next(null);
  }
  
}
