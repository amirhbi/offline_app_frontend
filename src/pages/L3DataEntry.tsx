import React, { useMemo } from 'react';
import { Card, Typography, Form, Select, Input, Button, Space, message } from 'antd';

export default function L3DataEntry() {
  const [form] = Form.useForm();
  const formOptions = useMemo(() => ['فرم ۲', 'فرم ۳', 'فرم ۴'], []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Simulate submit
      message.success('اطلاعات فرم ثبت شد');
      form.resetFields();
    } catch (e) { /* ignore */ }
  };

  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">ورود داده (Data Entry)</Typography.Title>
      <Typography.Paragraph>
        لطفاً فرم مجاز را انتخاب کرده و فیلدها را تکمیل کنید.
      </Typography.Paragraph>

      <Form form={form} layout="vertical">
        <Form.Item name="formName" label="انتخاب فرم" rules={[{ required: true, message: 'فرم را انتخاب کنید' }]}> 
          <Select placeholder="انتخاب فرم" options={formOptions.map((f) => ({ value: f, label: f }))} />
        </Form.Item>
        <Form.Item name="recordId" label="شناسه رکورد" rules={[{ required: true, message: 'شناسه رکورد را وارد کنید' }]}> 
          <Input placeholder="REC-001" />
        </Form.Item>
        <Form.Item name="title" label="عنوان" rules={[{ required: true, message: 'عنوان را وارد کنید' }]}> 
          <Input placeholder="عنوان رکورد" />
        </Form.Item>
        <Form.Item name="description" label="توضیحات">
          <Input.TextArea rows={4} placeholder="توضیحات تکمیلی" />
        </Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>ثبت اطلاعات</Button>
          <Button onClick={() => form.resetFields()}>پاک‌سازی</Button>
        </Space>
      </Form>
    </Card>
  );
}