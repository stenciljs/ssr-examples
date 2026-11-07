import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from '@ssr-examples/components/loader';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Define the components before Angular hydrates (see README). It's async, so wait for it.
defineCustomElements()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
