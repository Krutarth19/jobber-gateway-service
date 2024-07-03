import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export class Health {
  public health(req: Request, res: Response): void {
    res.status(StatusCodes.OK).send('Gateway Service is healthy and OK.');
  }
}
