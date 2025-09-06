import { Injectable, signal, computed } from '@angular/core';

import { MqttService } from '@services/mqtt/mqtt.service';
import { MqttCommandType,
         DeviceConfiguration,
         BaseMqttMessage } from '@models';


@Injectable({
  providedIn: 'root'
})
export class DeviceConfigurationService {
  
  private readonly propertiesSignal = signal<Nullable<DeviceConfiguration>>(null);
  private readonly isBusySignal = signal<boolean>(false);

  readonly isBusy = this.isBusySignal.asReadonly();
  readonly settings = this.propertiesSignal.asReadonly();

  constructor(private readonly mqttService: MqttService) {
    console.log('[DeviceConfigurationService]: instance created');
  }

  async loadSettings(maxRetries: number = 3, baseDelay: number = 1000): Promise<DeviceConfiguration> {
    this.isBusySignal.set(true);
    let attempt = 0;

    const attemptLoad = async (): Promise<DeviceConfiguration> => {
      try {
        const configuration = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
          MqttCommandType.GET_CONFIGURATION
        );
        this.propertiesSignal.set(configuration.data);
        console.log('[DeviceConfigurationService]: received device configuration:', configuration);
        return configuration.data;
      } catch (error) {
        attempt++;
        console.error(`[DeviceConfigurationService]: error getting device configuration `+
                      `(attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt >= maxRetries) {
          // Re-throw after max retries
          throw error;
        }

        // Exponential backoff: wait longer between each retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[DeviceConfigurationService]: retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptLoad();
      }
    };

    try {
      return await attemptLoad();
    } catch (error) {
      console.error('[DeviceConfigurationService]: failed to load settings after all retries:', error);
      throw error;
    } finally {
      this.isBusySignal.set(false);
    }

  }

  async saveSettings(configuration: DeviceConfiguration): Promise<DeviceConfiguration> {

    this.isBusySignal.set(true);
    
    try {
      const result = await this.mqttService.sendCommand<BaseMqttMessage<DeviceConfiguration>>(
        MqttCommandType.SET_CONFIGURATION,
        { ...configuration }
      );
      this.propertiesSignal.set(result.data);
      return result.data;
    } catch(error) {
      console.error('[DeviceConfigurationService]: failed to save settings:', error);
      throw error;
    } finally {
      this.isBusySignal.set(false);
    }

  }

}