import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, List, Space, Button, Table, Tag, message, Tabs } from 'antd';
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
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'forms' | 'entry' | 'export' | 'backup'>('all');
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
      a === 'form_create' ? { label: 'ایجاد فرم', color: 'green' } :
      a === 'form_update' ? { label: 'ویرایش فرم', color: 'gold' } :
      a === 'form_delete' ? { label: 'حذف فرم', color: 'red' } :
      a === 'entry_create' ? { label: 'ایجاد رکورد', color: 'green' } :
      a === 'entry_update' ? { label: 'ویرایش رکورد', color: 'gold' } :
      a === 'entry_delete' ? { label: 'حذف رکورد', color: 'red' } :
      a === 'export_xlsx' ? { label: 'دریافت خروجی XLSX', color: 'blue' } :
      a === 'export_pdf' ? { label: 'دریافت خروجی PDF', color: 'blue' } :
      a === 'export_html' ? { label: 'دریافت خروجی HTML', color: 'blue' } :
      a === 'backup_create' ? { label: 'ایجاد بکاپ', color: 'purple' } :
      a === 'backup_restore' ? { label: 'بازیابی از بکاپ', color: 'orange' } :
      a === 'backup_restore_file' ? { label: 'بازیابی از فایل', color: 'orange' } :
      a === 'backup_delete' ? { label: 'حذف بکاپ', color: 'red' } :
      { label: action, color: 'default' };
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const categoryOf = (action: string): 'user' | 'forms' | 'entry' | 'export' | 'backup' | 'other' => {
    const a = String(action || '').toLowerCase();
    if (a === 'login' || a === 'logout' || a.startsWith('user_')) return 'user';
    if (a.startsWith('form_')) return 'forms';
    if (a.startsWith('entry_')) return 'entry';
    if (a.startsWith('export_')) return 'export';
    if (a.startsWith('backup_')) return 'backup';
    return 'other';
  };
  const counts = useMemo(() => {
    const c = { all: data.length, user: 0, forms: 0, entry: 0, export: 0, backup: 0 };
    for (const r of data) {
      const cat = categoryOf(r.action);
      if (cat === 'user') c.user++;
      else if (cat === 'forms') c.forms++;
      else if (cat === 'entry') c.entry++;
      else if (cat === 'export') c.export++;
      else if (cat === 'backup') c.backup++;
    }
    return c;
  }, [data]);
  const filtered = useMemo(() => {
    if (activeTab === 'all') return data;
    return data.filter((r) => categoryOf(r.action) === activeTab);
  }, [data, activeTab]);

  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
          بخش لاگ‌ها
      </Typography.Title>
      <Tabs
        className="mb-2"
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          { key: 'all', label: `همه (${counts.all})` },
          { key: 'user', label: `کاربر (${counts.user})` },
          { key: 'forms', label: `فرم‌ها (${counts.forms})` },
          { key: 'entry', label: `رکوردها (${counts.entry})` },
          { key: 'export', label: `خروجی‌ها (${counts.export})` },
          { key: 'backup', label: `بکاپ‌ها (${counts.backup})` },
        ]}
      />

      <Table<LogRow>
        dataSource={filtered}
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
