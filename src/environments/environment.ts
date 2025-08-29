export const APP_CONFIG = {
  production: false,
  environment: 'DEV',
  aws: {
    apiGateway: 'https://7pc0fjhe41.execute-api.eu-west-2.amazonaws.com/dev',
    region: 'eu-west-2',
    algorithm: 'AWS4-HMAC-SHA256',
    IoTCore: {
      endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
      service: 'iotdevicegateway'
    },
    amplify: {
      Auth: {
        Cognito: {
          userPoolId: 'eu-west-2_XvWC7eAVT',
          userPoolClientId: '795qisbbrjmjuf7snin8c5ff5k',
          identityPoolId: 'eu-west-2:99d28df1-8458-4e36-b23c-27bee9032e95',
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