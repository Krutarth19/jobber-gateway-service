import { Application } from 'express';
import { healthRoutes } from '@gateway/routes/health';

export const appRoutes = (app: Application) => {
  app.use('', healthRoutes.routes());
};
