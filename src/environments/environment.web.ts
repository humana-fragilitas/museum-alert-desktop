        // Copy and paste in src/app/environments/environment.*.ts
        export const APP_CONFIG = {
          production: false,
          environment: 'DEV',
          aws: {
            apiGateway: 'https://157orq78ak.execute-api.eu-west-2.amazonaws.com/dev',
            region: 'eu-west-2',
            algorithm: 'AWS4-HMAC-SHA256',
            IoTCore: {
              endpoint: 'avo0w7o1tlck1-ats.iot.eu-west-2.amazonaws.com',
              service: 'iotdevicegateway'
            },
            amplify: {
              Auth: {
                Cognito: {
                  userPoolId: 'eu-west-2_ip8Ic8yEj',
                  userPoolClientId: '4fg3uneoltc3e3ecj96qeuchhc',
                  identityPoolId: 'eu-west-2:792590fa-8cbf-4eab-af4c-8d0f6139e603',
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