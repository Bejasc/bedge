import { Module } from '@nestjs/common';
import { DraftsController } from './drafts/drafts.controller.js';
import { DraftsService } from './drafts/drafts.service.js';

@Module({
  imports: [],
  controllers: [DraftsController],
  providers: [DraftsService],
})
export class AppModule {}
