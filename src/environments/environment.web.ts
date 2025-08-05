
        export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://62af5mf41k.execute-api.eu-west-2.amazonaws.com/dev',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_6NX9etefd',
                  userPoolClientId: '43m8m76etcr3a36nsiu80svbl2',
                  identityPoolId: 'eu-west-2:9c05c1c7-f6e0-489a-af69-64edc253d46f',
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