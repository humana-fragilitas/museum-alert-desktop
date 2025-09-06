// See: https://github.com/humana-fragilitas/museum-alert-api?tab=readme-ov-file#configuration-output

export const APP_CONFIG = {
  production: false,
  environment: 'DEV',
  aws: {
    apiGateway: '<apiGateway>',
    region: '<region>',
    algorithm: '<algorithm>',
    IoTCore: {
      endpoint: '<endpoint>',
      service: '<service>'
    },
    amplify: {
      Auth: {
        Cognito: {
          userPoolId: '<userPoolId>',
          userPoolClientId: '<userPoolClientId>',
          identityPoolId: '<identityPoolId>',
          mandatorySignIn: true,
          authenticationFlowType: '<authenticationFlowType>'
        }
      }
    }
  },
  settings: {
    MQTT_RESPONSE_TIMEOUT: 10000,
    USB_RESPONSE_TIMEOUT: 10000,
  }
};