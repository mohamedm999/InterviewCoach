import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as Sentry from '@sentry/node';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('sentry-test')
  testSentry() {
    // Send a log before throwing the error
    Sentry.logger.info('User triggered test error', {
      action: 'test_error_basic',
    });

    try {
      // This will throw an error
      throw new Error('This is a test error for Sentry!');
    } catch (e) {
      Sentry.captureException(e);
      return {
        message: 'Test error sent to Sentry! Check your Sentry dashboard.',
        error: e.message,
      };
    }
  }
}
