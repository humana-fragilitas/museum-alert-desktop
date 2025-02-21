export const APP_CONFIG = {
  production: false,
  environment: 'WEB',
  aws: {
    apiGateway: 'https://dkeyv8nw8j.execute-api.eu-west-1.amazonaws.com/development',
    region: 'eu-west-1',
    algorithm: 'AWS4-HMAC-SHA256',
    IoTCore: {
      endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-1.amazonaws.com',
      service: 'iotdevicegateway'
    },
    amplify: {
      Auth: {
        Cognito: {
          userPoolId: 'eu-west-1_4iQI3sNjP',
          userPoolClientId: '6tq3lpqr9guoms6uru5945gbi2',
          identityPoolId: 'eu-west-1:974597c1-d749-43ec-9afa-721e9508dfa7',
          mandatorySignIn: true,
          authenticationFlowType: 'USER_SRP_AUTH'
        }
      }
    }
  }
};
