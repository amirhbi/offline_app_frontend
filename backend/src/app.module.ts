import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config.module.js';
import { FormsModule } from './forms/forms.module.js';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/offline_app',
    ),
    FormsModule,
  ],
})
export class AppModule {}