import { Injectable } from '@angular/core';
import { MqttCommandType, MqttService } from '../mqtt/mqtt.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { DeviceConfiguration } from '../mqtt/mqtt.service';


@Injectable({
  providedIn: 'root'
})
export class DeviceConfigurationService {

  private readonly _settings$ = new BehaviorSubject<DeviceConfiguration | null>(null);
  public readonly settings$: Observable<DeviceConfiguration | null> = this._settings$.asObservable();

  private readonly _isBusy$ = new BehaviorSubject<boolean>(false);
  public readonly isBusy$: Observable<boolean> = this._isBusy$.asObservable();

  constructor(private readonly mqttService: MqttService) {

    console.log('DeviceConfigurationService created!');

  }

  async loadSettings(maxRetries: number = 3, baseDelay: number = 1000): Promise<DeviceConfiguration | void> {
    this._isBusy$.next(true);
    
    let attempt = 0;
    
    const attemptLoad = async (): Promise<DeviceConfiguration | void> => {
      try {
        const configuration: any = await this.mqttService.sendCommand(MqttCommandType.GET_CONFIGURATION);
        this._settings$.next(configuration.data);
        console.log('Received device configuration:', configuration);
        return configuration.data;
      } catch (error) {
        attempt++;
        console.error(`Error getting device configuration (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt >= maxRetries) {
          throw error; // Re-throw after max retries
        }
        
        // Exponential backoff: wait longer between each retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptLoad(); // Recursive retry
      }
    };
    
    try {
      return await attemptLoad();
    } catch (error) {
      console.error('Failed to load settings after all retries:', error);
      throw error;
    } finally {
      this._isBusy$.next(false);
    }
  }

  async saveSettings(configuration: DeviceConfiguration): Promise<DeviceConfiguration | void> {

    this._isBusy$.next(true);

    return this.mqttService
      .sendCommand(
        MqttCommandType.SET_CONFIGURATION,
        {
          ...configuration
        })
      .then((configuration) => {
        this._settings$.next(configuration.data);
        console.log('Configuration updated:', configuration);
      })
      .catch(() => {
        console.error('Error updating configuration');
      })
      .finally(() => this._isBusy$.next(false));

  }

  get settings(): DeviceConfiguration | null {
    return this._settings$.value;
  }

}
