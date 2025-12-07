import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Form, FormDocument } from './forms.schema.js';
import { CreateFormDto } from './dto/create-form.dto.js';
import { UpdateFormDto } from './dto/update-form.dto.js';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(Form.name) private readonly formModel: Model<FormDocument>,
  ) {}

  async findAll(): Promise<Form[]> {
    return this.formModel.find().sort({ updatedAt: -1 }).lean();
  }

  async findOne(id: string): Promise<Form | null> {
    return this.formModel.findById(id).lean();
  }

  async create(dto: CreateFormDto): Promise<Form> {
    const created = new this.formModel(dto);
    return created.save();
  }

  async update(id: string, dto: UpdateFormDto): Promise<Form> {
    const updated = await this.formModel
      .findByIdAndUpdate(id, { ...dto }, { new: true, runValidators: true })
      .lean();
    if (!updated) throw new NotFoundException('Form not found');
    return updated as unknown as Form;
  }

  async remove(id: string): Promise<void> {
    const res = await this.formModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Form not found');
  }
}