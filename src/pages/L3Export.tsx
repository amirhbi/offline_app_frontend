import React from 'react';
import { Card, Typography, Space, Select, Button } from 'antd';

export default function L3Export() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">خروجی گیری (در صورت دسترسی)</Typography.Title>
      <Typography.Paragraph>
        اگر برای شما فعال شده باشد، می‌توانید خروجی استاندارد داده‌های واردشده را دریافت کنید.
      </Typography.Paragraph>
      <Space>
        <Select style={{ minWidth: 160 }} defaultValue="excel" options={[{ value: 'excel', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]} />
        <Button type="primary">دانلود خروجی</Button>
      </Space>
    </Card>
  );
}