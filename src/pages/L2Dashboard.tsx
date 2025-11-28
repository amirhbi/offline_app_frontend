import React from 'react';
import { Card, Typography } from 'antd';

export default function L2Dashboard() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
        پنل مدیر بخشی
      </Typography.Title>
      <Typography.Paragraph>
        دسترسی‌ها محدود به جداول و فرم‌هایی است که L1 تعیین کرده است.
        در زیر، محتوای هر یک از تب‌های منوی بخشی نمایش داده می‌شود.
      </Typography.Paragraph>
    </Card>
  );
}