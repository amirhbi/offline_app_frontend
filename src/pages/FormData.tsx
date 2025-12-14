import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Table, Space, Button, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getForm, FormRecord } from '../api/forms';
import { listFormEntries, FormEntryRecord } from '../api/formEntries';

export default function FormData() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [formDef, setFormDef] = useState<FormRecord | null>(null);
  const [entries, setEntries] = useState<FormEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [def, list] = await Promise.all([getForm(formId), listFormEntries(formId)]);
      setFormDef(def);
      setEntries(list);
    } catch (e: any) {
      message.error(e?.message || 'خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [formId]);

  const columns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;
    // Base fields
    for (const f of formDef.fields || []) {
      cols.push({ title: f.label, dataIndex: ['data', f.label], key: f.label });
    }
    // Category fields (flattened with prefix)
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) {
        const key = `${c.name} - ${f.label}`;
        cols.push({ title: key, dataIndex: ['data', key], key });
      }
    }
    // Created at
    cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
    return cols;
  }, [formDef]);

  const exportCsv = () => {
    if (!formDef) return;
    const headers = columns.map((c: any) => c.title);
    const rows = entries.map((e) => columns.map((c: any) => {
      const path = c.dataIndex;
      if (Array.isArray(path)) {
        // nested access for ['data', key]
        let cur: any = e;
        for (const p of path) cur = (cur ?? {})[p];
        return cur ?? '';
      }
      return (e as any)[path] ?? '';
    }));
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => {
        const s = String(v ?? '');
        const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"');
        return needsQuote ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formDef.name}-entries.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border border-red-300">
      <Space style={{ width: '100%', justifyContent: 'space-between' }} className="mb-4">
        <Typography.Title level={4} className="!mb-0 text-red-600">داده‌های فرم</Typography.Title>
        <Space>
          <Button onClick={() => navigate('/structure')}>بازگشت</Button>
          <Button onClick={load}>بازخوانی</Button>
          <Button type="primary" onClick={exportCsv}>دانلود CSV</Button>
        </Space>
      </Space>
      <Typography.Paragraph className="mt-0">
        نمایش رکوردهای ثبت‌شده برای فرم: {formDef?.name || '—'}
      </Typography.Paragraph>

      <Table
        rowKey="id"
        dataSource={entries}
        columns={columns as any}
        loading={loading}
        pagination={{ pageSize: 12 }}
        scroll={{ x: true }}
      />
    </Card>
  );
}