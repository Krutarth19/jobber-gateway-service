import http from 'http';

import { Logger } from 'winston';
import { winstonLogger, IErrorResponse, CustomError } from '@Krutarth19/jobber-shared';
import { Application, json, NextFunction, Request, Response, urlencoded } from 'express';
import cookieSession from 'cookie-session';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import { StatusCodes } from 'http-status-codes';
import { elasticSearch } from '@gateway/elasticSearch';
import { config } from '@gateway/config';
import { appRoutes } from '@gateway/routes';

const SERVER_PORT = 4000;

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'apiGatewayServer', 'debug');

export class GatewayServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.startElasticSearch();
    this.errorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application): void {
    app.set('trust proxy', 1);
    app.use(
      cookieSession({
        name: 'jobber-session',
        keys: [`${config.SECRET_KEY_ONE}`, `${config.SECRET_KEY_TWO}`], // Make sure keys are not undefined
        maxAge: 27 * 7 * 3600000,
        secure: config.NODE_ENV !== 'development' // update with value from config
        // sameSite: none
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        methods: ['POST', 'GET', 'DELETE', 'PUT', 'OPTIONS']
      })
    );
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({ limit: '200mb' }));
    app.use(urlencoded({ limit: '200mb', extended: true }));
  }

  private routesMiddleware(app: Application): void {
    appRoutes(app);
  }

  private startElasticSearch(): void {
    elasticSearch.checkConnection();
  }

  private errorHandler(app: Application): void {
    app.use('*', (req: Request, res: Response, next: NextFunction) => {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      log.log('error', `${fullUrl} endpoint does not exists`, '');
      res.status(StatusCodes.NOT_FOUND).json({ message: 'The endpoint call does not exists.' });
      next();
    });

    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
      log.log('error', `GatewayService ${error.comingFrom}:`, error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json(error.serializeErrors());
      }
      next();
    });
  }

  private startServer(app: Application): void {
    try {
      const httpServer: http.Server = new http.Server(app);
      this.startHttpServer(httpServer);
    } catch (error) {
      log.log('error', 'GatewayService startServer() error method:', error);
    }
  }

  private startHttpServer(httpServer: http.Server): void {
    try {
      httpServer.listen(SERVER_PORT, () => {
        log.info(`Gateway server running on port ${SERVER_PORT}`);
      });
      log.info(`Gateway server has started with process id ${process.pid}`);
    } catch (error) {
      log.log('error', 'GatewayService startServer() error method:', error);
    }
  }
}
