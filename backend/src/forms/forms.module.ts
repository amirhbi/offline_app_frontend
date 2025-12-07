import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FormsController } from './forms.controller.js';
import { FormsService } from './forms.service.js';
import { Form, FormSchema } from './forms.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Form.name, schema: FormSchema }])],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}