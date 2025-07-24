import { BehaviorSubject, Observable } from 'rxjs';
import { Injectable, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MqttService } from '@services/mqtt/mqtt.service';
import { MqttCommandType, DeviceConfiguration, BaseMqttMessage } from '@models/.';

@Injectable({
  providedIn: 'root'
})
export class DeviceConfigurationService {
  
  // Convert BehaviorSubjects to signals
  private readonly propertiesSignal = signal<Nullable<DeviceConfiguration>>(null);
  private readonly isBusySignal = signal<boolean>(false);

  // Maintain backward compatibility with observables
  public readonly properties$: Observable<Nullable<DeviceConfiguration>> = toObservable(this.propertiesSignal);
  public readonly isBusy$: Observable<boolean> = toObservable(this.isBusySignal);

  readonly properties = this.propertiesSignal.asReadonly();
  readonly isBusy = this.isBusySignal.asReadonly();

  // Computed signal to replace the getter
  public readonly settings = computed(() => this.propertiesSignal());

  constructor(private readonly mqttService: MqttService) {
    console.log('[DeviceConfigurationService]: instance created');
  }

  async loadSettings(maxRetries: number = 3, baseDelay: number = 1000): Promise<DeviceConfiguration> {
    this.isBusySignal.set(true); // Use signal instead of BehaviorSubject
    let attempt = 0;

    const attemptLoad = async (): Promise<DeviceConfiguration> => {
      try {
        const configuration = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
          MqttCommandType.GET_CONFIGURATION
        );
        this.propertiesSignal.set(configuration.data); // Use signal instead of BehaviorSubject
        console.log('[DeviceConfigurationService]: received device configuration:', configuration);
        return configuration.data;
      } catch (error) {
        attempt++;
        console.error(`[DeviceConfigurationService]: error getting device configuration (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt >= maxRetries) {
          throw error; // Re-throw after max retries
        }

        // Exponential backoff: wait longer between each retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[DeviceConfigurationService]: retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptLoad(); // Recursive retry
      }
    };

    try {
      return await attemptLoad();
    } catch (error) {
      console.error('[DeviceConfigurationService]: failed to load settings after all retries:', error);
      throw error;
    } finally {
      this.isBusySignal.set(false); // Use signal instead of BehaviorSubject
    }
  }

  async saveSettings(configuration: DeviceConfiguration): Promise<DeviceConfiguration> {
    this.isBusySignal.set(true); // Use signal instead of BehaviorSubject
    
    try {
      const result = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
        MqttCommandType.SET_CONFIGURATION,
        { ...configuration }
      );
      this.propertiesSignal.set(result.data); // Use signal instead of BehaviorSubject
      return result.data;
    } catch(error) {
      console.error('[DeviceConfigurationService]: failed to save settings:', error);
      throw error;
    } finally {
      this.isBusySignal.set(false); // Use signal instead of BehaviorSubject
    }
  }

}