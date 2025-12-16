import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

interface CategoryDefinition {
  name: string;
  fields: FormField[];
}

interface FormDefinition {
  id: string;
  name: string;
  fields: FormField[];
  categories?: CategoryDefinition[];
  updatedAt: string;
}

const API_BASE = '/api';

export default function Structure() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [form] = Form.useForm();

  const fetchForms = async () => {
    const res = await fetch(`${API_BASE}/forms`);
    const data = await res.json();
    const mapped: FormDefinition[] = (data || []).map((f: any) => ({
      id: f._id ?? f.id,
      name: f.name,
      fields: f.fields || [],
      categories: f.categories || [],
      updatedAt: f.updatedAt || f.createdAt || new Date().toISOString(),
    }));
    setForms(mapped);
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const openCreate = () => {
    setEditingForm(null);
    form.resetFields();
    form.setFieldsValue({ name: '', fields: [], categories: [] });
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
      categories: (record.categories || []).map((c) => ({
        name: c.name,
        fields: (c.fields || []).map((f) => ({
          label: f.label,
          type: f.type,
          required: !!f.required,
          optionsText: f.options?.join(', ') ?? '',
        })),
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

      const normalizedCategories: CategoryDefinition[] = (values.categories || []).map((c: any) => ({
        name: c.name,
        fields: (c.fields || []).map((f: any) => ({
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
        })),
      }));

      if (editingForm) {
        const res = await fetch(`${API_BASE}/forms/${editingForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, fields: normalizedFields, categories: normalizedCategories }),
        });
        if (!res.ok) throw new Error('Failed to update');
        await fetchForms();
        message.success('فرم ویرایش شد');
      } else {
        const res = await fetch(`${API_BASE}/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, fields: normalizedFields, categories: normalizedCategories }),
        });
        if (!res.ok) throw new Error('Failed to create');
        await fetchForms();
        message.success('فرم ایجاد شد');
      }

      setIsModalOpen(false);
      setEditingForm(null);
    } catch (e) {
      // validation errors are handled by antd
    }
  };

  const deleteForm = (id: string) => {
    fetch(`${API_BASE}/forms/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete');
      })
      .then(async () => {
        await fetchForms();
        message.success('فرم حذف شد');
      })
      .catch(() => message.error('حذف فرم ناموفق بود'));
  };

  const columns = [
    { title: 'نام فرم', dataIndex: 'name', key: 'name' },
    {
      title: 'تعداد فیلدها',
      key: 'count',
      render: (_: any, rec: FormDefinition) => {
        const base = rec.fields.length;
        const cat = (rec.categories || []).reduce((sum, c) => sum + (c.fields?.length || 0), 0);
        return base + cat;
      },
    },
    {
      title: 'تعداد زیرشاخه‌ها',
      key: 'catCount',
      render: (_: any, rec: FormDefinition) => (rec.categories || []).length,
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
      fixed: 'right',
      align: 'left',
      render: (_: any, rec: FormDefinition) => (
        <Space>
          <Button onClick={() => navigate(`/structure/data/${rec.id}`)}>نمایش داده ها</Button>
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
        مدیریت  داده ها
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
                        label="نوع داده"
                        rules={[{
                          required: true,
                          message: 'نوع داده را انتخاب کنید',
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

        <Typography.Title level={5} className="mt-4">زیرشاخه‌ها (اختیاری)</Typography.Title>
        <Form.List name="categories">
          {(cats, { add: addCat, remove: removeCat }) => (
            <>
              {cats.map((cat) => (
                <Card key={cat.key} size="small" className="mb-4 border border-gray-200">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space align="center" className="justify-between">
                      <Form.Item
                        name={[cat.name, 'name']}
                        label="نام زیرشاخه"
                        rules={[{ required: true, message: 'نام زیرشاخه را وارد کنید' }]}
                      >
                        <Input style={{ width: 240 }} placeholder="مثلاً: تجهیزات برقی" />
                      </Form.Item>
                      <Button danger onClick={() => removeCat(cat.name)}>حذف زیرشاخه</Button>
                    </Space>

                    <Form.List name={[cat.name, 'fields']}>
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
                                  label="نوع داده"
                                  rules={[{ required: true, message: 'نوع داده را انتخاب کنید' }]}
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
                                    prev?.categories?.[cat.name]?.fields?.[field.name]?.type !==
                                    cur?.categories?.[cat.name]?.fields?.[field.name]?.type
                                  }
                                >
                                  {() => {
                                    const type = form.getFieldValue(['categories', cat.name, 'fields', field.name, 'type']);
                                    if (type === 'select') {
                                      return (
                                        <Form.Item
                                          name={[field.name, 'optionsText']}
                                          label="گزینه‌ها (با کاما جدا کنید)"
                                        >
                                          <Input style={{ width: 280 }} placeholder="مثلاً: گزینه۱, گزینه۲, گزینه۳" />
                                        </Form.Item>
                                      );
                                    }
                                    return null;
                                  }}
                                </Form.Item>

                                <Button danger onClick={() => remove(field.name)}>حذف فیلد</Button>
                              </Space>
                            </Card>
                          ))}
                          <Button type="dashed" onClick={() => add({ type: 'text', required: false })} block>
                            افزودن فیلد در زیرشاخه
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Space>
                </Card>
              ))}
              <Button type="dashed" onClick={() => addCat({ name: '', fields: [] })} block>
                افزودن زیرشاخه
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  </Card>
  );
}