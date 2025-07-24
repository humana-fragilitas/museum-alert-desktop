import { BehaviorSubject, Observable } from 'rxjs';

import { Injectable } from '@angular/core';

import { MqttService } from '@services/mqtt/mqtt.service';
import { MqttCommandType, DeviceConfiguration, BaseMqttMessage } from '@models/.';


@Injectable({
  providedIn: 'root'
})
export class DeviceConfigurationService {

  private readonly properties = new BehaviorSubject<Nullable<DeviceConfiguration>>(null);
  private readonly isBusy = new BehaviorSubject<boolean>(false);
  
  public readonly properties$: Observable<Nullable<DeviceConfiguration>> = this.properties.asObservable();
  public readonly isBusy$: Observable<boolean> = this.isBusy.asObservable();

  constructor(private readonly mqttService: MqttService) {

    console.log('[DeviceConfigurationService]: instance created');

  }

  async loadSettings(maxRetries: number = 3, baseDelay: number = 1000): Promise<DeviceConfiguration> {
    
    this.isBusy.next(true);
    
    let attempt = 0;
    
    const attemptLoad = async (): Promise<DeviceConfiguration> => {

      try {
        const configuration = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
          MqttCommandType.GET_CONFIGURATION
        );
        this.properties.next(configuration.data);
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
      this.isBusy.next(false);
    }

  }

  async saveSettings(configuration: DeviceConfiguration): Promise<DeviceConfiguration> {

    this.isBusy.next(true);

    try {
      const result = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
        MqttCommandType.SET_CONFIGURATION,
        { ...configuration }
      );
      this.properties.next(result.data);
      return result.data;
    } catch(error) {
      console.error('[DeviceConfigurationService]: failed to save settings:', error);
      throw error;
    } finally {
      this.isBusy.next(false);
    }

  }

  get settings(): Nullable<DeviceConfiguration> {
    return this.properties.value;
  }

}
