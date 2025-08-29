// Copy and paste in src/app/environments/environment.*.ts
export const APP_CONFIG = {
  production: false,
  environment: 'DEV',
  aws: {
    apiGateway: 'https://i2r1i9e19l.execute-api.eu-west-2.amazonaws.com/dev/',
    region: 'eu-west-2',
    algorithm: 'AWS4-HMAC-SHA256',
    IoTCore: {
      endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
      service: 'iotdevicegateway'
    },
    amplify: {
      Auth: {
        Cognito: {
          userPoolId: 'eu-west-2_TMNUmPnBD',
          userPoolClientId: '72m1d4ouiqio3ijjvfcrfcqavn',
          identityPoolId: 'eu-west-2:ad6c1538-9a81-4a4b-8462-c8758edba2b9',
          mandatorySignIn: true,
          authenticationFlowType: 'USER_SRP_AUTH'
        }
      }
    }
  },
  settings: {
    MQTT_RESPONSE_TIMEOUT: 10000,
    USB_RESPONSE_TIMEOUT: 10000,
  }
};