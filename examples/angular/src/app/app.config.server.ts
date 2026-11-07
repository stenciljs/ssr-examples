import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    // Render on every request (the default would prerender at build time)
    provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }])),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
