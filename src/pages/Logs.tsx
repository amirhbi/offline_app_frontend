import React, { useEffect, useState } from 'react';
import { Card, Typography, List, Space, Button, Table, Tag, message } from 'antd';
import { FileSearchOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { request } from '../api/client';

type LogRow = {
  id: string;
  user?: string;
  action: string;
  detail?: string;
  time: string;
};

export default function Logs() {
  const [data, setData] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const rows = await request<any[]>('/logs');
      const mapped: LogRow[] = (rows || []).map((r: any) => ({
        id: r._id ?? r.id ?? String(Math.random()),
        user: r.username || '',
        action: r.action || '',
        detail: r.detail || '',
        time: r.createdAt ? new Date(r.createdAt).toLocaleString('fa-IR') : '',
      }));
      setData(mapped);
    } catch (e: any) {
      message.error(e?.message || 'خطا در دریافت لاگ‌ها');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
 
  const ActionTag = ({ action }: { action: string }) => {
    const a = String(action || '').toLowerCase();
    const meta: { label: string; color: string } =
      a === 'login' ? { label: 'ورود', color: 'green' } :
      a === 'logout' ? { label: 'خروج', color: 'cyan' } :
      a === 'user_create' ? { label: 'ایجاد کاربر', color: 'green' } :
      a === 'user_update' ? { label: 'ویرایش کاربر', color: 'gold' } :
      a === 'user_delete' ? { label: 'حذف کاربر', color: 'red' } :
      { label: action, color: 'default' };
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
          بخش لاگ‌ها
      </Typography.Title>
    

      <Table<LogRow>
        dataSource={data}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        loading={loading}
        className="mb-4"
        columns={[
          { title: 'کاربر', dataIndex: 'user' },
          { title: 'اکشن', dataIndex: 'action', render: (a: string) => <ActionTag action={a} /> },
          { title: 'جزئیات', dataIndex: 'detail' },
          { title: 'زمان', dataIndex: 'time' },
        ]}
      />

      <Space>
        <Button icon={<DownloadOutlined />} type="primary">دانلود لاگ کامل</Button>
        <Button icon={<FileSearchOutlined />} onClick={load}>نمایش کامل لاگ</Button>
        <Button icon={<DeleteOutlined />} danger>پاکسازی لاگ‌ها</Button>
      </Space>
    </Card>
  );
}
