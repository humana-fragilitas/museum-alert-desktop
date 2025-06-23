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

  async loadSettings(): Promise<DeviceConfiguration | void> {
    
    this._isBusy$.next(true);

    return this.mqttService
      .sendCommand(MqttCommandType.GET_CONFIGURATION)
      // TO DO: wrap DeviceConfiguration in the mqtt base message
      //.then((configuration: DeviceConfiguration) => {
      .then((configuration: any) => {
        this._settings$.next(configuration.data);
        console.log('Received device configuration:', configuration);
      })
      .catch((error) => {  
        console.error('Error getting device configuration:', error);
      })
      .finally(() => this._isBusy$.next(false) );

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
