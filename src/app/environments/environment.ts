// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.


/**
 * 
 * 
 * 
 * // (required) only for Federated Authentication - Amazon Cognito Identity Pool ID
    identityPoolId: 'XX-XXXX-X:XXXXXXXX-XXXX-1234-abcd-1234567890ab',

    // (required)- Amazon Cognito Region
    region: 'XX-XXXX-X',

    // (optional) - Amazon Cognito Federated Identity Pool Region
    // Required only if it's different from Amazon Cognito Region
    identityPoolRegion: 'XX-XXXX-X',

    // (optional) - Amazon Cognito User Pool ID
    userPoolId: 'XX-XXXX-X_abcd1234',

    // (optional) - Amazon Cognito Web Client ID (26-char alphanumeric string, App client secret needs to be disabled)
    userPoolWebClientId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3',

    // (optional) - Enforce user authentication prior to accessing AWS resources or not
    mandatorySignIn: false,
 */

export const environment = {
  production: false,
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

// userPoolWebClientId

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
