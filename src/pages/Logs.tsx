import React from 'react';
import { Card, Typography, List, Space, Button, Table, Tag } from 'antd';
import { FileSearchOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';

type LogRow = {
  key: number;
  user: string;
  action: string;
  detail: string;
  time: string;
};

export default function Logs() {
  const data: LogRow[] = [
    { key: 1, user: 'admin', action: 'ورود', detail: 'ورود موفق', time: '1403/08/12 09:20' },
    { key: 2, user: 'مدیر_اعلام', action: 'ایجاد فایل', detail: 'گزارش فرم ۳', time: '1403/08/12 10:02' },
    { key: 3, user: 'مدیر_اطفاء', action: 'ویرایش', detail: 'به‌روزرسانی فرم ۴', time: '1403/08/12 11:15' },
    { key: 4, user: 'admin', action: 'خروجی', detail: 'دانلود رندوم ریزدوم', time: '1403/08/12 12:40' },
  ];

  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
        تب ۶: بخش لاگ‌ها
      </Typography.Title>
    

      <Table<LogRow>
        dataSource={data}
        rowKey="key"
        pagination={false}
        className="mb-4"
        columns={[
          { title: 'کاربر', dataIndex: 'user' },
          { title: 'اکشن', dataIndex: 'action', render: (a: string) => <Tag>{a}</Tag> },
          { title: 'جزئیات', dataIndex: 'detail' },
          { title: 'زمان', dataIndex: 'time' },
        ]}
      />

      <Space>
        <Button icon={<DownloadOutlined />} type="primary">دانلود لاگ کامل</Button>
        <Button icon={<FileSearchOutlined />}>نمایش کامل لاگ</Button>
        <Button icon={<DeleteOutlined />} danger>پاکسازی لاگ‌ها</Button>
      </Space>
    </Card>
  );
}