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
  Switch,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listForms, createForm as apiCreateForm, updateForm as apiUpdateForm, deleteForm as apiDeleteForm, UpsertFormPayload } from '../api/forms';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'lookup' | 'exist';


interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  lookupFormId?: string;
  lookupSourceField?: string;
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
  subFields?: FormField[];
  updatedAt: string;
  // Optional PDF export settings
  pdfDescription?: string;
  pdfImage?: string; // asset filename, e.g., 'fire_department.png'
  hasSubFields?: boolean;
}

const API_BASE = '/api';

export default function Structure() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isSuperAdmin = (role === 'super_admin');
  const prePath = (isSuperAdmin ? '' : '/' + role);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [form] = Form.useForm();

  const fetchForms = async () => {
    const data = await listForms();
    const mapped: FormDefinition[] = (data || []).map((f: any) => ({
      id: f._id ?? f.id,
      name: f.name,
      fields: f.fields || [],
      categories: f.categories || [],
      subFields: f.subFields || [],
      hasSubFields: f.hasSubFields || false,
      updatedAt: f.updatedAt || f.createdAt || new Date().toISOString(),
      pdfDescription: f.pdfDescription || '',
      pdfImage: f.pdfImage || '',
    }));
    setForms(mapped);
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const openCreate = () => {
    setEditingForm(null);
    form.resetFields();
    form.setFieldsValue({ name: '', fields: [], subFields: [], categories: [], pdfDescription: '', pdfImage: '', hasSubFields: false });
    setIsModalOpen(true);
  };

  const openEdit = (record: FormDefinition) => {
    setEditingForm(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      hasSubFields: record.hasSubFields || false,
      fields: record.fields.map((f) => ({
        label: f.label,
        type: f.type,
        required: !!f.required,
        optionsText: f.options?.join(', ') ?? '',
        lookupFormId: f.lookupFormId,
        lookupSourceField: f.lookupSourceField,
      })),
      subFields: (record.subFields || []).map((f) => ({
        label: f.label,
        type: f.type,
        required: !!f.required,
        optionsText: f.options?.join(', ') ?? '',
        lookupFormId: f.lookupFormId,
        lookupSourceField: f.lookupSourceField,
      })),
      categories: (record.categories || []).map((c) => ({
        name: c.name,
        fields: (c.fields || []).map((f) => ({
          label: f.label,
          type: f.type,
          required: !!f.required,
          optionsText: f.options?.join(', ') ?? '',
          lookupFormId: f.lookupFormId,
          lookupSourceField: f.lookupSourceField,
        })),
      })),
      pdfDescription: record.pdfDescription || '',
      pdfImage: record.pdfImage || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const normalizeField = (f: any) => ({
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
        lookupFormId: f.lookupFormId,
        lookupSourceField: f.lookupSourceField,
      });

      const normalizedFields: FormField[] = (values.fields || []).map(normalizeField);
      const normalizedSubFields: FormField[] = (values.subFields || []).map(normalizeField);
      const normalizedCategories: CategoryDefinition[] = (values.categories || []).map((c: any) => ({
        name: c.name,
        fields: (c.fields || []).map(normalizeField),
      }));

      const payload: UpsertFormPayload = {
        name: values.name,
        fields: normalizedFields,
        subFields: normalizedSubFields,
        categories: normalizedCategories,
        pdfDescription: values.pdfDescription || '',
        pdfImage: values.pdfImage || '',
        hasSubFields: values.hasSubFields || false,
      };

      if (editingForm) {
        await apiUpdateForm(editingForm.id, payload);
        await fetchForms();
        message.success('فرم ویرایش شد');
      } else {
        await apiCreateForm(payload);
        await fetchForms();
        message.success('فرم ایجاد شد');
      }

      setIsModalOpen(false);
      setEditingForm(null);
    } catch (e) {
      // validation errors are handled by antd
    }
  };

  const removeForm = async (id: string) => {
    try {
      await apiDeleteForm(id);
      await fetchForms();
      message.success('فرم حذف شد');
    } catch {
      message.error('حذف فرم ناموفق بود');
    }
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
          <Button onClick={() => navigate(`${prePath}/structure/data/${rec.id}`)}>نمایش داده ها</Button>
          {isSuperAdmin && (
            <>
              <Button onClick={() => openEdit(rec)}>ویرایش</Button>
              <Popconfirm title="حذف فرم؟" onConfirm={() => removeForm(rec.id)}>
                <Button danger>حذف</Button>
              </Popconfirm>
            </>
          )}
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
          {isSuperAdmin && (
            <Button type="primary" onClick={openCreate}>
              ایجاد فرم جدید
            </Button>
          )}
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

          <Form.Item name="hasSubFields" valuePropName="checked" label="استفاده از زیرفیلد برای فیلدهای اصلی">
            <Switch
              onChange={(checked) => {
                if (checked) {
                  // Explicitly clear categories if switching to sub-fields mode if desired, 
                  // or just rely on conditional rendering.
                  // form.setFieldValue('categories', []); 
                }
              }}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.hasSubFields !== cur.hasSubFields}>
            {({ getFieldValue }) => {
              const hasSubFields = getFieldValue('hasSubFields');
              return hasSubFields ? (
                <Typography.Text type="secondary" className="block mb-4">
                  در این حالت، لیست دسته‌بندی‌ها غیرفعال شده و هر فیلد اصلی می‌تواند زیرفیلدهای خود را داشته باشد.
                </Typography.Text>
              ) : null;
            }}
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
                        rules={[
                          { required: true, message: 'برچسب الزامی است' },
                          {
                            validator: async (_: any, value: string) => {
                              const list = (form.getFieldValue('fields') || []) as any[];
                              const dupCount = list.filter((f, idx) => (f?.label === value) && idx !== field.name).length;
                              if (value && dupCount > 0) {
                                return Promise.reject(new Error('برچسب فیلد نباید تکراری باشد'));
                              }
                              return Promise.resolve();
                            },
                          },
                        ]}
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
                          style={{ width: 200 }}
                          options={[
                            { value: 'text', label: 'متن' },
                            { value: 'number', label: 'عدد' },
                            { value: 'date', label: 'تاریخ' },
                            { value: 'select', label: 'انتخابی' },
                            { value: 'checkbox', label: 'چک‌باکس' },
                            { value: 'lookup', label: 'جستجو از فرم دیگر' },
                            { value: 'exist', label: 'بررسی وجود در فرم دیگر' },
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
                          if (type === 'lookup' || type === 'exist') {
                            return (
                              <>
                                <Form.Item
                                  name={[field.name, 'lookupFormId']}
                                  label="انتخاب فرم مبدا"
                                  rules={[{ required: true }]}
                                >
                                  <Select
                                    style={{ width: 220 }}
                                    options={forms.map((f) => ({ value: f.id, label: f.name }))}
                                  />
                                </Form.Item>
                                <Form.Item
                                  name={[field.name, 'lookupSourceField']}
                                  label="فیلد کد/شناسه در فرم مبدا"
                                  rules={[{ required: true }]}
                                >
                                  <Input style={{ width: 200 }} placeholder="مثلاً: کد ملی" />
                                </Form.Item>
                              </>
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


          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.hasSubFields !== cur.hasSubFields}>
            {({ getFieldValue }) => {
              const hasSubFields = getFieldValue('hasSubFields');
              if (hasSubFields) {
                return (
                  <div className="mt-8 mb-8 border border-blue-200 p-4 rounded-md bg-blue-50">
                    <Typography.Title level={5} className="text-blue-700">تعریف ستون‌های زیرفیلد (برای سطرها)</Typography.Title>
                    <Typography.Text type="secondary" className="block mb-4">
                      فیلدهایی که در این بخش تعریف می‌کنید، به عنوان ستون‌های جدول برای ورودی‌های چندردیفه استفاده خواهند شد.
                    </Typography.Text>
                    <Form.List name="subFields">
                      {(subFields, { add, remove }) => (
                        <>
                          {subFields.map((field) => (
                            <Card key={field.key} size="small" className="mb-3 border-blue-200 shadow-sm">
                              <Space align="start" wrap>
                                <Form.Item
                                  name={[field.name, 'label']}
                                  label="نام ستون"
                                  rules={[{ required: true, message: 'الزامی' }]}
                                >
                                  <Input style={{ width: 180 }} />
                                </Form.Item>
                                <Form.Item
                                  name={[field.name, 'type']}
                                  label="نوع داده"
                                  rules={[{ required: true }]}
                                >
                                  <Select
                                    style={{ width: 160 }}
                                    options={[
                                      { value: 'text', label: 'متن' },
                                      { value: 'number', label: 'عدد' },
                                      { value: 'date', label: 'تاریخ' },
                                      { value: 'select', label: 'انتخابی' },
                                      { value: 'checkbox', label: 'چک‌باکس' },
                                      { value: 'lookup', label: 'جستجو از فرم دیگر' },
                                      { value: 'exist', label: 'بررسی وجود در فرم دیگر' },
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
                                    prev?.subFields?.[field.name]?.type !==
                                    cur?.subFields?.[field.name]?.type
                                  }
                                >
                                  {() => {
                                    const type = form.getFieldValue(['subFields', field.name, 'type']);
                                    if (type === 'select') {
                                      return (
                                        <Form.Item
                                          name={[field.name, 'optionsText']}
                                          label="گزینه‌ها"
                                        >
                                          <Input style={{ width: 280 }} placeholder="گزینه۱, گزینه۲" />
                                        </Form.Item>
                                      );
                                    }
                                    if (type === 'lookup' || type === 'exist') {
                                      return (
                                        <>
                                          <Form.Item
                                            name={[field.name, 'lookupFormId']}
                                            label="انتخاب فرم مبدا"
                                            rules={[{ required: true }]}
                                          >
                                            <Select
                                              style={{ width: 220 }}
                                              options={forms.map((f) => ({ value: f.id, label: f.name }))}
                                            />
                                          </Form.Item>
                                          <Form.Item
                                            name={[field.name, 'lookupSourceField']}
                                            label="فیلد کد/شناسه در فرم مبدا"
                                            rules={[{ required: true }]}
                                          >
                                            <Input style={{ width: 200 }} placeholder="مثلاً: کد ملی" />
                                          </Form.Item>
                                        </>
                                      );
                                    }
                                    return null;
                                  }}
                                </Form.Item>

                                <Button danger onClick={() => remove(field.name)}>حذف ستون</Button>
                              </Space>
                            </Card>
                          ))}
                          <Button type="dashed" onClick={() => add({ type: 'text', required: false })} block className="border-blue-400 text-blue-600">
                            + افزودن ستون زیرفیلد
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </div>
                );
              }
              return !hasSubFields && (
                <>
                  <Typography.Title level={5} className="!mt-4">زیرشاخه‌ها (اختیاری)</Typography.Title>
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
                                            rules={[
                                              { required: true, message: 'برچسب الزامی است' },
                                              {
                                                validator: async (_: any, value: string) => {
                                                  const list = (form.getFieldValue(['categories', cat.name, 'fields']) || []) as any[];
                                                  const dupCount = list.filter((f, idx) => (f?.label === value) && idx !== field.name).length;
                                                  if (value && dupCount > 0) {
                                                    return Promise.reject(new Error('برچسب فیلد باید یکتا باشد'));
                                                  }
                                                  return Promise.resolve();
                                                },
                                              },
                                            ]}
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
                                                { value: 'lookup', label: 'جستجو از فرم دیگر' },
                                                { value: 'exist', label: 'بررسی وجود در فرم دیگر' },
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
                                              if (type === 'lookup' || type === 'exist') {
                                                return (
                                                  <>
                                                    <Form.Item
                                                      name={[field.name, 'lookupFormId']}
                                                      label="انتخاب فرم مبدا"
                                                      rules={[{ required: true }]}
                                                    >
                                                      <Select
                                                        style={{ width: 220 }}
                                                        options={forms.map((f) => ({ value: f.id, label: f.name }))}
                                                      />
                                                    </Form.Item>
                                                    <Form.Item
                                                      name={[field.name, 'lookupSourceField']}
                                                      label="فیلد کد/شناسه در فرم مبدا"
                                                      rules={[{ required: true }]}
                                                    >
                                                      <Input style={{ width: 200 }} placeholder="مثلاً: کد ملی" />
                                                    </Form.Item>
                                                  </>
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
                </>
              )
            }}
          </Form.Item>

          {/* PDF export description and image selection */}
          <Typography.Title level={5} className="!mt-8">تنظیمات خروجی PDF</Typography.Title>
          <Form.Item name="pdfDescription" label="توضیح خروجی PDF">
            <Input.TextArea rows={3} placeholder="متن توضیحاتی که بالای خروجی PDF نمایش داده می‌شود" />
          </Form.Item>
          <Form.Item name="pdfImage" label="تصویر پس از توضیح">
            <Select
              style={{ width: 320 }}
              placeholder="انتخاب تصویر برای نمایش پس از توضیح"
              allowClear
              options={[
                { value: '', label: 'بدون تصویر' },
                { value: 'fire_department.png', label: 'لوگوی سازمان (fire_department.png)' },
                { value: 'react.svg', label: 'React Logo (react.svg)' },
              ]}
            />
          </Form.Item>
        </Form >
      </Modal >
    </Card >
  );
}
