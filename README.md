# Museum Alert Desktop

[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/humana-fragilitas/14e2adb30d420562b0ed2a91591eed8e/raw/coverage-badge.json)](https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/ci.yml)
[![License][license-badge]](LICENSE.md)

[![Linux Build][linux-build-badge]][linux-build]
[![MacOS Build][macos-build-badge]][macos-build]
[![Windows Build][windows-build-badge]][windows-build]

Cross-platform desktop application built with Angular and Electron for provisioning, configuring, and testing the **[Museum Alert Sensor (MAS)](https://github.com/humana-fragilitas/museum-alert-sketch)**, part of the **[Museum Alert](https://github.com/humana-fragilitas/museum-alert)** project.

**Important: please review the [disclaimer](#disclaimer) before using this project.**

[![alt text](./docs/images/museum_alert_desktop_app.png "Museum Alert Desktop App Screenshot - Watch Video on YouTube")](https://www.youtube.com/watch?v=2JDBWRLDWfI)

## Prerequisites

### System Requirements
- **Node.js**: version 22.19.0 or higher;
- **Python**: version 3.11;
- **Operating System**: Windows, macOS, or GNU/Linux.

### Project Dependencies
"Museum Alert Desktop" requires the following components to be deployed and configured before use:

1. **[Museum Alert API](https://github.com/humana-fragilitas/museum-alert-api)** - AWS CDK infrastructure project that provides:
   - AWS API Gateway endpoints;
   - Amazon Cognito authentication and authorization services;
   - AWS IoT Core configuration;
   - required environment configuration files.

   **After deploying the Museum Alert API Infrastructure:**
   - **find the configuration**: look for the [`AngularAppConfiguration`](https://github.com/humana-fragilitas/museum-alert-api?tab=readme-ov-file#configuration-output) output in your CDK deployment console;
   - **copy the complete configuration**: the deployment output provides a ready-to-copy `APP_CONFIG` object;
   - **update environment files**: paste the configuration into the appropriate [environment files](#environment-configuration) in `src/environments/environment.*.ts`.

2. **[Museum Alert Sensor (MAS)](https://github.com/humana-fragilitas/museum-alert-sketch)** - Hardware device with firmware that must be built and flashed to the Arduino® Nano ESP32 before using this desktop application. The sensor most notably provides:
   - configurable ultrasonic distance barrier (2cm to 4 meters) with WiFi connectivity and alert notifications via MQTT;
   - configurable BLE Eddystone-URL beacon suitable for proximity notifications.

## Getting Started

### Environment Configuration

Different environment files are available depending on which npm script is executed:

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

### Installation

This project follows the [Electron Builder's two package.json structure](https://www.electron.build/tutorials/two-package-structure), requiring separate dependency installations for the renderer and main processes.

**Step 1: Install renderer process dependencies (Angular/Web)**
```bash
npm install
```

**Step 2: Install main process dependencies (Electron/Node.js)**
```bash
cd app/
npm install
cd ..
```

### Project Structure

| Directory | Process Type | Technology Stack | Description |
|-----------|--------------|------------------|-------------|
| `src/`    | Renderer     | Angular/Web      | User interface and Web-based functionality |
| `app/`    | Main         | Node.js/Electron | System integration and native platform features |

## Available Commands

**Note**: Museum Alert Desktop is specifically designed as an Electron desktop application; while some commands include Web/browser functionality, they are primarily used internally for development features (like hot reload).

### Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm start` | Starts the full development environment with hot reload | **Recommended**: primary development command - runs both Angular dev server and Electron in parallel |
| `npm run ng:serve` | Starts only the Angular development server in Web mode | **Internal use**: provides hot reload capability for `npm start` - not recommended for standalone development |
| `npm run electron:serve` | Starts Electron pointing to the development server | **Internal use**: used internally by `npm start` - waits for Angular dev server to be ready |

### Build Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run build` | Basic build with default environment | Standard build for local testing |
| `npm run build:dev` | Build with development environment configuration | **Recommended**: development builds with dev-specific settings |
| `npm run build:prod` | Build with production environment configuration | **Recommended**: production builds for distribution |
| `npm run web:build` | Build for Web deployment (no Electron) | **Not recommended**: creates Web version but application requires Electron features |

### Electron Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run electron:local` | Builds with dev config and runs Electron locally | **Recommended**: testing the full Electron app without packaging |
| `npm run electron:build` | Builds with production config and packages the app | **Recommended**: creating distributable Electron applications for your OS |
| `npm run electron` | Runs Electron directly without building | **Not recommended**: requires manual build steps first - use `electron:local` or `electron:build` instead |

### Testing Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm test` | Runs unit tests once | Quick test validation |
| `npm run test:ci` | Runs unit tests with coverage report | CI/CD pipelines and coverage analysis |
| `npm run test:watch` | Runs unit tests in watch mode | Active development with continuous testing |
| `npm run e2e` | Runs end-to-end tests | Basic example of application testing before releases |
| `npm run e2e:show-trace` | Opens Playwright trace viewer | Debugging failed E2E tests |

### Utility Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run ng` | Angular CLI passthrough | Running Angular CLI commands directly |
| `npm run electron:serve-tsc` | Compiles TypeScript for Electron main process | Used internally by other commands |

### Common Workflows

- **Daily Development**: `npm start` (starts everything you need for Electron development);
- **Local Electron Testing**: `npm run electron:local` (test full desktop application);
- **Production Build**: `npm run electron:build` (create distributable desktop app);
- **Before Commit**: `npm test`;
- **Full Testing**: `npm run test:ci && npm run e2e`.

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

[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license]: https://github.com/humana-fragilitas/museum-alert-desktop/blob/main/LICENSE.md

[linux-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/linux-build.yml/badge.svg
[linux-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/linux-build.yml
[macos-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/macos-build.yml/badge.svg
[macos-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/macos-build.yml
[windows-build-badge]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/windows-build.yml/badge.svg
[windows-build]: https://github.com/humana-fragilitas/museum-alert-desktop/actions/workflows/windows-build.yml

