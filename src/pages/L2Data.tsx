import React from 'react';
import { Card, Typography, List } from 'antd';

export default function L2Data() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">مدیریت داده‌ها</Typography.Title>
      <Typography.Paragraph>
        دسترسی و ویرایش داده‌های بخشی مطابق سیاست‌های تعیین‌شده توسط L1.
      </Typography.Paragraph>
      <List
        dataSource={[
          'نمایش لیست رکوردهای مرتبط با بخش',
          'ویرایش‌های محدود طبق دسترسی‌های تعریف‌شده',
          'ثبت تغییرات و گزارش‌های مربوطه',
        ]}
        renderItem={(item) => <List.Item>• {item}</List.Item>}
      />
    </Card>
  );
}