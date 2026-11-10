import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// The wrappers in App define their elements as they load, so before Angular hydrates.
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
