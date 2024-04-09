import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HausModule } from './haus/haus.module';

@Module({
  imports: [HausModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
