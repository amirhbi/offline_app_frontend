import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

@Module({})
export class ConfigModule {
  constructor() {
    dotenv.config();
  }
}