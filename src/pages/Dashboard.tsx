import React from 'react';
import { Typography } from 'antd';

export default function Dashboard() {
  return (
    <div>
      <Typography.Title level={3}>داشبورد</Typography.Title>
      <Typography.Paragraph>
        به داشبورد مدیریتی خوش آمدید. از منوی کناری برای پیمایش استفاده کنید.
      </Typography.Paragraph>
    </div>
  );
}