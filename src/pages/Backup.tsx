import React from 'react';
import { Card, Typography, List, Space, Button, Form, Select, Switch, TimePicker, InputNumber, message, Tabs } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined, FileZipOutlined } from '@ant-design/icons';

export default function Backup() {
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();
  const onSave = (values: any) => {
    message.success('تنظیمات زمان‌بندی ذخیره شد');
  };
  const onSavePerm = (values: any) => {
    message.success('دسترسی پشتیبان‌گیری برای کاربر به‌روز شد');
  };
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
        تب ۵: پشتیبان‌گیری
      </Typography.Title>

      <Tabs
        defaultActiveKey="actions"
        items={[
          {
            key: 'actions',
            label: 'عملیات پشتیبان‌گیری',
            children: (
              <Space>
                <Button type="primary" icon={<FileZipOutlined />}>ایجاد بکاپ کامل</Button>
                <Button icon={<CloudUploadOutlined />}>بازیابی از فایل</Button>
                <Button icon={<CloudDownloadOutlined />}>دانلود بکاپ کامل</Button>
              </Space>
            ),
          },
          {
            key: 'schedule',
            label: 'زمان‌بندی خودکار',
            children: (
              <Form
                form={form}
                layout="vertical"
                initialValues={{ enabled: false, frequency: 'daily' }}
                onFinish={onSave}
                className="mb-4"
              >
                <Form.Item name="enabled" label="فعال‌سازی زمان‌بندی خودکار" valuePropName="checked">
                  <Switch />
                </Form.Item>

                <Form.Item name="frequency" label="بازه زمانی" rules={[{ required: true, message: 'بازه زمانی را انتخاب کنید' }]}> 
                  <Select
                    options={[
                      { value: 'daily', label: 'روزانه' },
                      { value: 'weekly', label: 'هفتگی' },
                      { value: 'monthly', label: 'ماهانه' },
                    ]}
                    placeholder="انتخاب بازه زمانی"
                  />
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.frequency !== cur.frequency}>
                  {({ getFieldValue }) => {
                    const freq = getFieldValue('frequency');
                    return (
                      <>
                        {freq === 'weekly' && (
                          <Form.Item name="weekday" label="روز هفته" rules={[{ required: true, message: 'روز هفته را انتخاب کنید' }]}> 
                            <Select
                              options={[
                                { value: 'sat', label: 'شنبه' },
                                { value: 'sun', label: 'یکشنبه' },
                                { value: 'mon', label: 'دوشنبه' },
                                { value: 'tue', label: 'سه‌شنبه' },
                                { value: 'wed', label: 'چهارشنبه' },
                                { value: 'thu', label: 'پنجشنبه' },
                                { value: 'fri', label: 'جمعه' },
                              ]}
                              placeholder="انتخاب روز هفته"
                            />
                          </Form.Item>
                        )}

                        {freq === 'monthly' && (
                          <Form.Item name="monthday" label="روز ماه" rules={[{ required: true, message: 'روز ماه را وارد کنید' }]}> 
                            <InputNumber min={1} max={31} style={{ width: '100%' }} placeholder="۱ تا ۳۱" />
                          </Form.Item>
                        )}

                        <Form.Item name="time" label="زمان اجرا" rules={[{ required: true, message: 'زمان اجرا را انتخاب کنید' }]}> 
                          <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="انتخاب زمان" />
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">ذخیره تنظیمات</Button>
                    <Button htmlType="button" onClick={() => form.resetFields()}>بازنشانی</Button>
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'permissions',
            label: 'مدیریت دسترسی L2',
            children: (
              <Form
                form={permForm}
                layout="vertical"
                initialValues={{ enabled: true, user: 'مدیر_بخش_اطفاء' }}
                onFinish={onSavePerm}
                className="mb-4"
              >
                <Form.Item name="user" label="انتخاب کاربر L2" rules={[{ required: true, message: 'کاربر را انتخاب کنید' }]}> 
                  <Select
                    placeholder="انتخاب کاربر"
                    options={[
                      { value: 'مدیر_بخش_اطفاء', label: 'مدیر_بخش_اطفاء' },
                      { value: 'مدیر_بخش_اعلام', label: 'مدیر_بخش_اعلام' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="enabled" label="اعطای دسترسی پشتیبان‌گیری" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">ذخیره دسترسی</Button>
                    <Button htmlType="button" onClick={() => permForm.resetFields()}>بازنشانی</Button>
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </Card>
  );
}