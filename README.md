# Museum Alert Desktop

[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/humana-fragilitas/14e2adb30d420562b0ed2a91591eed8e/raw/coverage-badge.json)](https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/ci.yml)
[![License][license-badge]](LICENSE.md)

[![Linux Build][linux-build-badge]][linux-build]
[![MacOS Build][macos-build-badge]][macos-build]
[![Windows Build][windows-build-badge]][windows-build]

Cross-platform Angular Electron desktop application suitable for configuring and testing the "Museum Alert Sensor (MAS)", part of the ["Museum Alert"](https://github.com/humana-fragilitas/museum-alert) project.

![alt text](./docs/images/museum_alert_desktop_app.png "Museum Alert Desktop App Screenshot")
## Prerequisites

This application depends on the infrastructure and artifacts created by ["Museum Alert API"](https://github.com/humana-fragilitas/museum-alert) AWS CDK project and the ["Museum Alert Sensor"](https://github.com/humana-fragilitas/museum-alert-sketch) device.

Users interested in using this project should build these dependencies first in the specified order.

⚠️ **Please read the [disclaimer](#disclaimer) before using this project.**

## Getting Started

This project has two dependencies trees, following [Electron Builder two package.json structure](https://www.electron.build/tutorials/two-package-structure):

- Electron renderer process:

``` bash
npm install
```

- Electron main process:

``` bash
cd app/
npm install
```

Renderer and main processes files are structured as follows:

| Folder | Description                                      |
|--------|--------------------------------------------------|
| src    | Electron renderer process folder (Web / Angular) |
| app    | Electron main process folder (NodeJS)            |

## To build for development

- **in a terminal window** -> npm start

Voila! You can use your Angular + Electron app in a local development environment with hot reload!

## Environment Configuration

This project uses different environment files depending on which npm script is executed:

| NPM Script | Angular Config | Environment File Used |
|------------|----------------|----------------------|
| `npm start` | `-c web` (via `ng:serve`) | `environment.web.ts` |
| `npm run build` | default (no `-c` flag) | `environment.ts` |
| `npm run build:dev` | `-c dev` | `environment.dev.ts` |
| `npm run build:prod` | `-c production` | `environment.prod.ts` |
| `npm run web:build` | `-c web-production` | `environment.web.prod.ts` |
| `npm run electron:local` | `-c dev` (via `build:dev`) | `environment.dev.ts` |
| `npm run electron:build` | `-c production` (via `build:prod`) | `environment.prod.ts` |
| `npm run e2e` | `-c production` (via `build:prod`) | `environment.prod.ts` |

**Summary:**
- **Development (npm start)**: Uses `environment.web.ts`
- **Default build**: Uses `environment.ts` 
- **Dev builds**: Use `environment.dev.ts`
- **Production builds**: Use `environment.prod.ts`
- **Web production**: Uses `environment.web.prod.ts`

## Included Commands

| Command                  | Description                                                                                           |
|--------------------------|-------------------------------------------------------------------------------------------------------|
| `npm run ng:serve`       | Execute the app in the web browser (DEV mode)                                                         |
| `npm run web:build`      | Build the app that can be used directly in the web browser. Your built files are in the /dist folder. |
| `npm run electron:local` | Builds your application and start electron locally                                                    |
| `npm run electron:build` | Builds your application and creates an app consumable based on your operating system                  |

**Your application is optimised. Only /dist folder and NodeJS dependencies are included in the final bundle.**

## You want to use a specific lib (like rxjs) in electron main thread ?

YES! You can do it! Just by importing your library in npm dependencies section of `app/package.json` with `npm install --save XXXXX`. \
It will be loaded by electron during build phase and added to your final bundle. \
Then use your library by importing it in `app/main.ts` file. Quite simple, isn't it?

## E2E Testing

E2E Test scripts can be found in `e2e` folder.

| Command       | Description               |
|---------------|---------------------------|
| `npm run e2e` | Execute end to end tests  |

## Disclaimer

### Important Notice

This open source project, including all its submodules, documentation, and associated code (collectively, the "Project"), is provided for educational and experimental purposes only.

### No Warranty

THE PROJECT IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. THE AUTHOR MAKES NO WARRANTIES ABOUT THE ACCURACY, RELIABILITY, COMPLETENESS, OR TIMELINESS OF THE PROJECT OR ITS COMPONENTS.

### Limitation of Liability

IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE PROJECT OR THE USE OR OTHER DEALINGS IN THE PROJECT. THIS INCLUDES, BUT IS NOT LIMITED TO:

- **AWS Costs**: any charges incurred from AWS services deployed using the provided CDK templates;
- **Hardware Damage**: damage to Arduino boards, sensors, or other electronic components;
- **Data Loss**: loss of data or configuration settings;
- **Service Interruptions**: downtime or interruptions to connected services;
- **Security Issues**: any security vulnerabilities or breaches;
- **Indirect Damages**: lost profits, business interruption, or consequential damages of any kind.

### User Responsibility

By using this Project, you acknowledge and agree that:

1. **you use the Project entirely at your own risk**;
2. **you are responsible for understanding AWS pricing** and monitoring your usage to avoid unexpected charges;
3. **you should implement appropriate security measures** for any production deployments;
4. **you are responsible for compliance** with all applicable laws and regulations in your jurisdiction;
5. **you should test thoroughly** in development environments before any production use;
6. **you are responsible for backing up** any important data or configurations.

### AWS Specific Notice

This project may create AWS resources that incur charges; users are solely responsible for:
- understanding AWS pricing models;
- monitoring their AWS usage and costs;
- properly terminating or deleting resources when no longer needed;
- reviewing and understanding all CloudFormation templates before deployment.

### Third-Party Components

This Project may include or reference third-party libraries, services, or components. The author is not responsible for the functionality, security, or licensing of these third-party components. Users should review and comply with all applicable third-party licenses and terms of service.

### Modification and Distribution

Users may modify and distribute this Project under the terms of the applicable open source license. However, any modifications or distributions must include this disclaimer, and the author bears no responsibility for modified versions of the Project.

### Professional Advice

This Project is not intended to replace professional consultation. For production systems or critical applications, please consult with qualified professionals in the relevant fields.

### Acknowledgments

By downloading, cloning, forking, or otherwise using this Project, you acknowledge that you have read, understood, and agree to be bound by this disclaimer.

The [museum-alert-desktop](https://github.com/humana-fragilitas/museum-alert-desktop) project has been derived from Maxime Gris's [angular-electron](https://github.com/maximegris/angular-electron) starter project (see the license for further information).

---

**Last Updated**: July 2025.

[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license]: https://github.com/humana-fragilitas/museum-alert-desktop/blob/main/LICENSE.md

[linux-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/linux-build.yml/badge.svg
[linux-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/linux-build.yml
[macos-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/macos-build.yml/badge.svg
[macos-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/macos-build.yml
[windows-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/windows-build.yml/badge.svg
[windows-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/windows-build.yml

