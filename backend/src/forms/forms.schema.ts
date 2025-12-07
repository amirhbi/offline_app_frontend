import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FormDocument = HydratedDocument<Form>;

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

@Schema({ _id: false })
export class FormField {
  @Prop({ required: true })
  label!: string;

  @Prop({ required: true, enum: ['text', 'number', 'date', 'select', 'checkbox'] })
  type!: FieldType;

  @Prop({ default: false })
  required?: boolean;

  @Prop({ type: [String], default: undefined })
  options?: string[];
}

const FormFieldSchema = SchemaFactory.createForClass(FormField);

@Schema({ timestamps: true })
export class Form {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: [FormFieldSchema], default: [] })
  fields!: FormField[];
}

export const FormSchema = SchemaFactory.createForClass(Form);