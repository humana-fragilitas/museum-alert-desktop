// Copy and paste in src/app/environments/environment.*.ts
        export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://30pyi8odpi.execute-api.eu-west-2.amazonaws.com/dev/',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_rHTWtQJv4',
                  userPoolClientId: '6fnob0mojsco76gmt4gnd4ultr',
                  identityPoolId: 'eu-west-2:82cdd6eb-f806-48dd-9d71-8e0c1982f32a',
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