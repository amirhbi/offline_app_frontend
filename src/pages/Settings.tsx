import React from 'react';
import { Typography, Switch, Space } from 'antd';

export default function Settings() {
  return (
    <div>
      <Typography.Title level={3}>تنظیمات</Typography.Title>
      <Space direction="vertical">
        <div>
          <span>فعال‌سازی اعلان‌ها </span>
          <Switch />
        </div>
        <div>
          <span>به‌روزرسانی خودکار </span>
          <Switch defaultChecked />
        </div>
      </Space>
    </div>
  );
}