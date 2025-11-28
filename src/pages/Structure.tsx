import React from 'react';
import { Card, Typography, List, Select, Button, Space } from 'antd';

export default function Structure() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
         مدیریت ساختار سامانه
      </Typography.Title>
    
    
      <Typography.Text>انتخاب فرم برای ویرایش ساختار:</Typography.Text>
      <Space className="mt-2">
        <Select
          defaultValue="فرم شکایات"
          options={[
            { value: 'فرم شکایات', label: 'فرم شکایات' },
            { value: 'فرم سرویس دوره‌ای', label: 'فرم سرویس دوره‌ای' },
            { value: 'فرم گزارش خرابی', label: 'فرم گزارش خرابی' },
          ]}
          style={{ width: 220 }}
        />
        <Button type="primary">ویرایش ساختار</Button>
      </Space>
    </Card>
  );
}