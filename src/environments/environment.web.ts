export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://12015ldfo4.execute-api.eu-west-2.amazonaws.com/dev',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_7xgDz82Mo',
                  userPoolClientId: '4hoonaa6jifkie7ekp9e9nt58d',
                  identityPoolId: 'eu-west-2:7784d476-1c05-4144-8ae5-8f3e64ed7228',
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