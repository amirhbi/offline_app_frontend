import React from 'react';
import { Card, Typography, List, Space, Select, Button } from 'antd';

export default function L2Export() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">خروجی گیری</Typography.Title>
      <Typography.Paragraph>
        دریافت خروجی‌های استاندارد برای داده‌های بخشی.
      </Typography.Paragraph>
      <List
        className="mb-2"
        dataSource={[
          'انتخاب فرمت: PDF یا Excel',
          'انتخاب سطر و ستون دلخواه',
          'سربرگ و قالب‌بندی سفارشی',
        ]}
        renderItem={(item) => <List.Item>• {item}</List.Item>}
      />
      <Space>
        <Select style={{ minWidth: 160 }} defaultValue="excel" options={[{ value: 'excel', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]} />
        <Button type="primary">دانلود خروجی</Button>
      </Space>
    </Card>
  );
}