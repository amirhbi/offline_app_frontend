import React from 'react';
import { Card, Typography, List } from 'antd';

export default function L2Reports() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">گزارش‌گیری بخشی</Typography.Title>
      <Typography.Paragraph>
        گزارش‌های ویژه این بخش با فیلترهای محدود شده بر اساس فرم‌ها و جداول مجاز.
      </Typography.Paragraph>
      <List
        dataSource={[
          'فیلتر بر اساس فرم بخشی',
          'نمودار و جدول نتایج',
          'دانلود خروجی به صورت Excel/PDF',
        ]}
        renderItem={(item) => <List.Item>• {item}</List.Item>}
      />
    </Card>
  );
}