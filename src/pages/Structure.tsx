import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Popconfirm,
  message,
} from 'antd';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

interface FormDefinition {
  id: string;
  name: string;
  fields: FormField[];
  updatedAt: string;
}

const STORAGE_KEY = 'app_forms';

function loadForms(): FormDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveForms(forms: FormDefinition[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
}

export default function Structure() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    setForms(loadForms());
  }, []);

  const openCreate = () => {
    setEditingForm(null);
    form.resetFields();
    form.setFieldsValue({ name: '', fields: [] });
    setIsModalOpen(true);
  };

  const openEdit = (record: FormDefinition) => {
    setEditingForm(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      fields: record.fields.map((f) => ({
        label: f.label,
        type: f.type,
        required: !!f.required,
        optionsText: f.options?.join(', ') ?? '',
      })),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const normalizedFields: FormField[] = (values.fields || []).map((f: any) => ({
        label: f.label,
        type: f.type,
        required: !!f.required,
        options:
          f.type === 'select'
            ? (f.optionsText || '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : undefined,
      }));

      const id = editingForm?.id ?? `form_${Date.now()}`;
      const updatedAt = new Date().toISOString();
      const newForm: FormDefinition = {
        id,
        name: values.name,
        fields: normalizedFields,
        updatedAt,
      };

      const nextForms = editingForm
        ? forms.map((f) => (f.id === id ? newForm : f))
        : [newForm, ...forms];

      setForms(nextForms);
      saveForms(nextForms);
      setIsModalOpen(false);
      setEditingForm(null);
      message.success(editingForm ? 'فرم ویرایش شد' : 'فرم ایجاد شد');
    } catch (e) {
      // validation errors are handled by antd
    }
  };

  const deleteForm = (id: string) => {
    const nextForms = forms.filter((f) => f.id !== id);
    setForms(nextForms);
    saveForms(nextForms);
    message.success('فرم حذف شد');
  };

  const columns = [
    { title: 'نام فرم', dataIndex: 'name', key: 'name' },
    {
      title: 'تعداد فیلدها',
      key: 'count',
      render: (_: any, rec: FormDefinition) => rec.fields.length,
    },
    {
      title: 'آخرین تغییر',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d: string) => new Date(d).toLocaleString('fa-IR'),
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_: any, rec: FormDefinition) => (
        <Space>
          <Button onClick={() => openEdit(rec)}>ویرایش</Button>
          <Popconfirm title="حذف فرم؟" onConfirm={() => deleteForm(rec.id)}>
            <Button danger>حذف</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card className="border border-red-300">
      <div className="flex justify-between items-center mb-2">
      <Typography.Title level={4} className="text-red-600">
        مدیریت ساختار سامانه
      </Typography.Title>

      <Space className="mb-3">
        <Button type="primary" onClick={openCreate}>
          ایجاد فرم جدید
        </Button>
      </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={forms}
        columns={columns as any}
        pagination={{ pageSize: 8 }}
      />

      <Modal
        open={isModalOpen}
        title={editingForm ? 'ویرایش فرم' : 'ایجاد فرم جدید'}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingForm(null);
        }}
        onOk={handleSave}
        okText="ذخیره"
        cancelText="انصراف"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="نام فرم"
            rules={[{ required: true, message: 'نام فرم الزامی است' }]}
          >
            <Input placeholder="مثلاً: فرم شکایات" />
          </Form.Item>

          <Form.List name="fields">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card key={field.key} size="small" className="mb-3">
                    <Space align="start" wrap>
                      <Form.Item
                        name={[field.name, 'label']}
                        label="برچسب فیلد"
                        rules={[{ required: true, message: 'برچسب الزامی است' }]}
                      >
                        <Input style={{ width: 180 }} />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'type']}
                        label="نوع فیلد"
                        rules={[{
                          required: true,
                          message: 'نوع فیلد را انتخاب کنید',
                        }]}
                      >
                        <Select
                          style={{ width: 160 }}
                          options={[
                            { value: 'text', label: 'متن' },
                            { value: 'number', label: 'عدد' },
                            { value: 'date', label: 'تاریخ' },
                            { value: 'select', label: 'انتخابی' },
                            { value: 'checkbox', label: 'چک‌باکس' },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'required']}
                        valuePropName="checked"
                        label="ضروری"
                      >
                        <Checkbox />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev?.fields?.[field.name]?.type !==
                          cur?.fields?.[field.name]?.type
                        }
                      >
                        {() => {
                          const type = form.getFieldValue(['fields', field.name, 'type']);
                          if (type === 'select') {
                            return (
                              <Form.Item
                                name={[field.name, 'optionsText']}
                                label="گزینه‌ها (با کاما جدا کنید)"
                              >
                                <Input
                                  style={{ width: 280 }}
                                  placeholder="مثلاً: گزینه۱, گزینه۲, گزینه۳"
                                />
                              </Form.Item>
                            );
                          }
                          return null;
                        }}
                      </Form.Item>

                      <Button danger onClick={() => remove(field.name)}>
                        حذف فیلد
                      </Button>
                    </Space>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add({ type: 'text', required: false })}
                  block
                >
                  افزودن فیلد
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
}