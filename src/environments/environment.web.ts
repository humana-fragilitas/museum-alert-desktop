export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://tr7i0zbdka.execute-api.eu-west-2.amazonaws.com/dev',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_auxfjWAIW',
                  userPoolClientId: '1jsiqtuum0p26bou294gqosvut',
                  identityPoolId: 'eu-west-2:2119c7d2-604d-463a-810b-cdb3f81a4de1',
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