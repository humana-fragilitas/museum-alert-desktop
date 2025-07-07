import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';

// TO DO: keep the event bus?

/**
 * Possible improvements:
 *
 * type EventPayloadMap = {
 *  [EventType.Type1]: string;
 *  [EventType.Type2]: number;
 *  [EventType.Type3]: { x: number; y: number };
 * };
 *
 * type TypedEvent = {
 *  [K in keyof EventPayloadMap]: {
 *   type: K;
 *   payload: EventPayloadMap[K];
 *  }
 * }[keyof EventPayloadMap];
 *
 * [...]
 *
 * private eventBus = new BehaviorSubject<Nullable<TypedEvent>>(null);
 */

enum EventType {

  // types here
  

}

interface Event<T = any> {
  type: EventType;
  payload?: T;
}

@Injectable({
  providedIn: 'root'
})
export class EventBusService {

  private eventBus = new BehaviorSubject<Nullable<Event>>(null);

  /**
   * Publish an event with optional payload.
   * @param event The event name
   * @param payload Optional data to send with the event
   */
  publish(event: Event): void {
    console.log(`EventBus: published event: '${JSON.stringify(event)}'`);
    this.eventBus.next(event);
  }

  /**
   * Listen for events by name.
   * @param event The event type to listen for
   * @returns Observable of event payload
   */
  on<T>(event: EventType): Observable<T> {
    return this.eventBus.asObservable().pipe(
      filter(e => !!e && e.type === event), // Filter only matching events
      // Type assertion to ensure correct type
      filter((e): e is { type: EventType; payload: T } => e !== null),
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
