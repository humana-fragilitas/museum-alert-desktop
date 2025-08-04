export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://c2ibxkllo6.execute-api.eu-west-2.amazonaws.com/dev',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_uuYR3hCwz',
                  userPoolClientId: '2b7i6v4rcd1dl2s26d9i70o3n9',
                  identityPoolId: 'eu-west-2:7ad87e98-f214-4494-ba86-1e217b7f5916',
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