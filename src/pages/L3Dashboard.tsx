import React from 'react';
import { Card, Typography } from 'antd';

export default function L3Dashboard() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">پنل ویرایشگر</Typography.Title>
      <Typography.Paragraph>
        این ساده‌ترین پنل کاربری است و صرفاً برای ورود اطلاعات طراحی شده است.
        وظیفه اصلی بر کردن اطلاعات فرم است.
      </Typography.Paragraph>
    </Card>
  );
}