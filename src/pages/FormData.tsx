import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Card, Typography, Table, Space, Button, message, Input, Select, DatePicker, Checkbox } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getForm, FormRecord, FormField } from '../api/forms';
import { listFormEntries, FormEntryRecord, createFormEntry } from '../api/formEntries';

export default function FormData() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [formDef, setFormDef] = useState<FormRecord | null>(null);
  const [entries, setEntries] = useState<FormEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineAdd, setInlineAdd] = useState(false);
  const [inlineValues, setInlineValues] = useState<Record<string, any>>({});

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

  const fieldMeta = useMemo(() => {
    const meta: Record<string, { type: FormRecord['fields'][number]['type']; options?: string[] }> = {};
    if (!formDef) return meta;
    for (const f of formDef.fields || []) meta[f.label] = { type: f.type, options: f.options };
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) meta[`${c.name} - ${f.label}`] = { type: f.type, options: f.options };
    }
    return meta;
  }, [formDef]);

  // Inline cell renderer and save handler must be defined before columns
  const renderInlineCell = (key: string) => {
    const meta = fieldMeta[key];
    const value = inlineValues[key];
    if (!meta) return null;
    switch (meta.type) {
      case 'text':
        return <Input value={value} onChange={(e) => setInlineValues((p) => ({ ...p, [key]: e.target.value }))} />;
      case 'number':
        return <Input type="number" value={value} onChange={(e) => setInlineValues((p) => ({ ...p, [key]: e.target.value }))} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} value={value || null} onChange={(d) => setInlineValues((p) => ({ ...p, [key]: d }))} />;
      case 'select':
        if (meta.options && meta.options.length) {
          return <Select value={value} onChange={(v) => setInlineValues((p) => ({ ...p, [key]: v }))} options={meta.options.map((o) => ({ value: o, label: o }))} />;
        }
        return <Input value={value} onChange={(e) => setInlineValues((p) => ({ ...p, [key]: e.target.value }))} />;
      case 'checkbox':
        return <Checkbox checked={!!value} onChange={(e) => setInlineValues((p) => ({ ...p, [key]: e.target.checked }))} />;
      default:
        return <Input value={value} onChange={(e) => setInlineValues((p) => ({ ...p, [key]: e.target.value }))} />;
    }
  };

  const handleDuplicate = (row: any) => {
    if (!formDef) return;
    if (inlineAdd) {
      message.warning('در حال افزودن رکورد جدید هستید');
      return;
    }
    const initial: Record<string, any> = {};
    // Base fields
    for (const f of ((formDef.fields ?? []) as FormField[])) {
      const v = row?.data?.[f.label];
      if (f.type === 'date' && v) initial[f.label] = dayjs(v);
      else if (f.type === 'checkbox') initial[f.label] = !!v;
      else initial[f.label] = v ?? '';
    }
    // Category fields
    for (const c of (formDef.categories || [])) {
      for (const f of ((c.fields ?? []) as FormField[])) {
        const key = `${c.name} - ${f.label}`;
        const v = row?.data?.[key];
        if (f.type === 'date' && v) initial[key] = dayjs(v);
        else if (f.type === 'checkbox') initial[key] = !!v;
        else initial[key] = v ?? '';
      }
    }
    setInlineValues(initial);
    setInlineAdd(true);
  };

  const handleInlineSave = async () => {
    if (!formId || !formDef) return;
    try {
      const data: Record<string, any> = {};
      for (const f of formDef.fields || []) {
        const v = inlineValues[f.label];
        if (f.type === 'date' && v) data[f.label] = v.format('YYYY-MM-DD');
        else if (f.type === 'number' && v !== undefined && v !== null && v !== '') data[f.label] = Number(v);
        else data[f.label] = v ?? '';
      }
      for (const c of formDef.categories || []) {
        for (const f of c.fields || []) {
          const key = `${c.name} - ${f.label}`;
          const v = inlineValues[key];
          if (f.type === 'date' && v) data[key] = v.format('YYYY-MM-DD');
          else if (f.type === 'number' && v !== undefined && v !== null && v !== '') data[key] = Number(v);
          else data[key] = v ?? '';
        }
      }
      await createFormEntry(formId, { data });
      message.success('رکورد جدید ثبت شد');
      setInlineAdd(false);
      setInlineValues({});
      load();
    } catch (e: any) {
      message.error(e?.message || 'ثبت داده ناموفق بود');
    }
  };

  const allColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;
    // Actions column for inline add row
    cols.push({
      title: 'عملیات',
      key: '__actions',
      render: (_: any, row: any) => row.id === '__new__' ? (
        <Space>
          <Button type="primary" onClick={handleInlineSave}>ثبت</Button>
          <Button onClick={() => { setInlineAdd(false); setInlineValues({}); }}>لغو</Button>
        </Space>
      ) : (
        <Button onClick={() => handleDuplicate(row)}>کپی</Button>
      ),
    });
    // Base fields
    for (const f of formDef.fields || []) {
      cols.push({
        title: f.label,
        dataIndex: ['data', f.label],
        key: f.label,
        render: (val: any, row: any) => row.id === '__new__'
          ? renderInlineCell(f.label)
          : val,
      });
    }
    // Category fields (flattened with prefix)
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) {
        const key = `${c.name} - ${f.label}`;
        cols.push({
          title: key,
          dataIndex: ['data', key],
          key,
          render: (val: any, row: any) => row.id === '__new__'
            ? renderInlineCell(key)
            : val,
        });
      }
    }
    // Created at
    cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
    // Prevent header title wrapping for all columns
    return cols.map((c) => ({
      ...c,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    }));
  }, [formDef, inlineValues]);

  const baseColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;
    // Actions: duplicate only
    cols.push({
      title: 'عملیات',
      key: '__actions',
      render: (_: any, row: any) => (
        <Button onClick={() => handleDuplicate(row)}>کپی</Button>
      ),
    });
    // Base fields only
    for (const f of (formDef.fields || [])) {
      cols.push({
        title: f.label,
        dataIndex: ['data', f.label],
        key: f.label,
      });
    }
    cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
    return cols.map((c) => ({ ...c, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) }));
  }, [formDef]);

  const categoryTables = useMemo(() => {
    const tables: { name: string; columns: any[] }[] = [];
    if (!formDef) return tables;
    for (const c of (formDef.categories || [])) {
      if (!c.fields || c.fields.length === 0) continue;
      const cols: any[] = [];
      // Actions: duplicate only
      cols.push({
        title: 'عملیات',
        key: '__actions',
        render: (_: any, row: any) => (
          <Button onClick={() => handleDuplicate(row)}>کپی</Button>
        ),
      });
      for (const f of (c.fields || [])) {
        const key = `${c.name} - ${f.label}`;
        cols.push({
          title: f.label,
          dataIndex: ['data', key],
          key,
        });
      }
      cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
      tables.push({ name: c.name, columns: cols.map((c2) => ({ ...c2, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) })) });
    }
    return tables;
  }, [formDef]);

  const exportCsv = () => {
    if (!formDef) return;
    const headers = allColumns.map((c: any) => c.title);
    const rows = entries.map((e) => allColumns.map((c: any) => {
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

  const startInlineAdd = () => {
    if (!formDef) return;
    const initial: Record<string, any> = {};
    for (const f of ((formDef.fields ?? []) as FormField[])) initial[f.label] = f.type === 'checkbox' ? false : '';
    for (const c of formDef.categories || []) {
      for (const f of ((c.fields ?? []) as FormField[])) initial[`${c.name} - ${f.label}`] = f.type === 'checkbox' ? false : '';
    }
    setInlineValues(initial);
    setInlineAdd(true);
  };


  return (
    <Card className="border border-red-300">
      <Space style={{ width: '100%', justifyContent: 'space-between' }} className="mb-4">
        <Typography.Title level={4} className="!mb-0 text-red-600">داده‌های فرم</Typography.Title>
        <Space>
          <Button onClick={() => navigate('/structure')}>بازگشت</Button>
          <Button onClick={load}>بازخوانی</Button>
          <Button onClick={exportCsv}>دانلود CSV</Button>
          <Button type="primary" onClick={startInlineAdd} disabled={inlineAdd}>افزودن داده جدید</Button>
        </Space>
      </Space>
      <Typography.Paragraph className="mt-0">
        نمایش رکوردهای ثبت‌شده برای فرم: {formDef?.name || '—'}
      </Typography.Paragraph>

      

      {inlineAdd && (
        <>
          <Typography.Title level={5} className="!mb-2">افزودن رکورد جدید</Typography.Title>
          <Table
            rowKey="id"
            dataSource={[{ id: '__new__', formId: formId as string, data: inlineValues }] as any}
            columns={allColumns as any}
            loading={loading}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}

      {/* Base fields table (only if there are base fields) */}
      {(formDef?.fields && formDef.fields.length > 0) && (
        <>
          <Typography.Title level={5} className="!mt-6 !mb-2">فیلدهای اصلی</Typography.Title>
          <Table
            rowKey="id"
            dataSource={entries}
            columns={baseColumns as any}
            loading={loading}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}

      {/* Category tables */}
      {categoryTables.map((cat) => (
        <div key={cat.name}>
          <Typography.Title level={5} className="!mt-6 !mb-2">{cat.name}</Typography.Title>
          <Table
            rowKey="id"
            dataSource={entries}
            columns={cat.columns as any}
            loading={loading}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      ))}
    </Card>
  );
}