export const APP_CONFIG = {
  production: false,
  environment: 'DEV',
  aws: {
    apiGateway: 'https://cke9w82l1d.execute-api.eu-west-2.amazonaws.com/dev',
    region: 'eu-west-2',
    algorithm: 'AWS4-HMAC-SHA256',
    IoTCore: {
      endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
      service: 'iotdevicegateway'
    },
    amplify: {
      Auth: {
        Cognito: {
          userPoolId: 'eu-west-2_rAUy5ZjhG',
          userPoolClientId: '20lc2to7s5sh005df3v4ijq2fc',
          identityPoolId: 'eu-west-2:0693bac4-c732-4498-901d-71161068d883',
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