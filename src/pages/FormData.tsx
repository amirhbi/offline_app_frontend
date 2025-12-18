import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Card, Typography, Table, Space, Button, message, Input, Select, Checkbox, Modal } from 'antd';
import { DatePicker as DatePickerJalali, JalaliLocaleListener } from "antd-jalali";
import { useNavigate, useParams } from 'react-router-dom';
import { getForm, FormRecord, FormField } from '../api/forms';
import { listFormEntries, FormEntryRecord, createFormEntry, updateFormEntry, deleteFormEntry } from '../api/formEntries';

export default function FormData() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [formDef, setFormDef] = useState<FormRecord | null>(null);
  const [entries, setEntries] = useState<FormEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineAdd, setInlineAdd] = useState(false);
  const [inlineValues, setInlineValues] = useState<Record<string, any>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

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
    const meta: Record<string, { type: FormRecord['fields'][number]['type']; options?: string[]; required?: boolean }> = {};
    if (!formDef) return meta;
    for (const f of formDef.fields || []) meta[f.label] = { type: f.type, options: f.options, required: f.required };
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) meta[`${c.name} - ${f.label}`] = { type: f.type, options: f.options, required: f.required };
    }
    return meta;
  }, [formDef]);

  // Helper: determine if a value should be considered meaningful/present for display/save
  const hasMeaningfulValue = (type: FormField['type'], v: any): boolean => {
    if (v === null || v === undefined) return false;
    switch (type) {
      case 'text':
      case 'select':
        return String(v).trim() !== '';
      case 'number': {
        if (typeof v === 'number') return !isNaN(v);
        if (typeof v === 'string') {
          const s = v.trim();
          if (s === '') return false;
          const n = Number(s);
          return !isNaN(n);
        }
        return false;
      }
      case 'date':
        return !!v; // Dayjs instance
      case 'checkbox':
        return typeof v === 'boolean';
      default:
        return String(v).trim() !== '';
    }
  };

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
        return <><JalaliLocaleListener /><DatePickerJalali style={{ width: '100%' }} value={value || null} onChange={(d) => setInlineValues((p) => ({ ...p, [key]: d }))} /></>;
      case 'select':
        if (meta.options && meta.options.length) {
          return (
            <Select
              className='w-40'
              value={value ?? undefined}
              onChange={(v) => setInlineValues((p) => ({ ...p, [key]: v }))}
              options={meta.options.map((o) => ({ value: o, label: o }))}
              placeholder=" انتخاب کنید"
              allowClear
            />
          );
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
        else if (f.type === 'select') initial[key] = v ?? undefined;
        else initial[key] = v ?? '';
      }
    }
    setInlineValues(initial);
    setEditingEntryId(null);
    setInlineAdd(true);
  };

  const handleEdit = (row: any) => {
    if (!formDef) return;
    if (inlineAdd) {
      message.warning('در حال افزودن/ویرایش رکورد هستید');
      return;
    }
    const initial: Record<string, any> = {};
    for (const f of ((formDef.fields ?? []) as FormField[])) {
      const v = row?.data?.[f.label];
      if (f.type === 'date' && v) initial[f.label] = dayjs(v);
      else if (f.type === 'checkbox') initial[f.label] = !!v;
      else if (f.type === 'select') initial[f.label] = v ?? undefined;
      else initial[f.label] = v ?? '';
    }
    for (const c of (formDef.categories || [])) {
      for (const f of ((c.fields ?? []) as FormField[])) {
        const key = `${c.name} - ${f.label}`;
        const v = row?.data?.[key];
        if (f.type === 'date' && v) initial[key] = dayjs(v);
        else if (f.type === 'checkbox') initial[key] = !!v;
        else if (f.type === 'select') initial[key] = v ?? undefined;
        else initial[key] = v ?? '';
      }
    }
    setInlineValues(initial);
    setEditingEntryId(row.id);
    setInlineAdd(true);
  };

  const handleDelete = (row: any) => {
    Modal.confirm({
      title: 'حذف رکورد',
      content: 'آیا از حذف این رکورد مطمئن هستید؟',
      okText: 'حذف',
      okType: 'danger',
      cancelText: 'انصراف',
      onOk: async () => {
        try {
          await deleteFormEntry(formId as string, row.id);
          message.success('رکورد حذف شد');
          load();
        } catch (e: any) {
          message.error(e?.message || 'حذف رکورد ناموفق بود');
        }
      },
    });
  };

  const handleInlineSave = async () => {
    if (!formId || !formDef) return;
    try {
      // Validate required fields before building payload
      const missingRequired: string[] = [];
      for (const f of (formDef.fields || [])) {
        const v = inlineValues[f.label];
        if (f.required && !hasMeaningfulValue(f.type, v)) missingRequired.push(f.label);
      }
      for (const c of (formDef.categories || [])) {
        for (const f of (c.fields || [])) {
          const key = `${c.name} - ${f.label}`;
          const v = inlineValues[key];
          if (f.required && !hasMeaningfulValue(f.type, v)) missingRequired.push(key);
        }
      }
      if (missingRequired.length) {
        message.error(`لطفاً فیلدهای ضروری را کامل کنید: ${missingRequired.join('، ')}`);
        return;
      }

      const data: Record<string, any> = {};
      for (const f of formDef.fields || []) {
        const v = inlineValues[f.label];
        if (!hasMeaningfulValue(f.type, v)) continue;
        if (f.type === 'date') data[f.label] = v.format('YYYY-MM-DD');
        else if (f.type === 'number') {
          const n = typeof v === 'number' ? v : Number(v);
          if (!isNaN(n)) data[f.label] = n;
        } else if (f.type === 'checkbox') {
          data[f.label] = v as boolean;
        } else {
          data[f.label] = String(v).trim();
        }
      }
      for (const c of formDef.categories || []) {
        for (const f of c.fields || []) {
          const key = `${c.name} - ${f.label}`;
          const v = inlineValues[key];
          if (!hasMeaningfulValue(f.type, v)) continue;
          if (f.type === 'date') data[key] = v.format('YYYY-MM-DD');
          else if (f.type === 'number') {
            const n = typeof v === 'number' ? v : Number(v);
            if (!isNaN(n)) data[key] = n;
          } else if (f.type === 'checkbox') {
            data[key] = v as boolean;
          } else {
            data[key] = String(v).trim();
          }
        }
      }
      if (editingEntryId) {
        await updateFormEntry(formId, editingEntryId, { data });
        message.success('ویرایش رکورد انجام شد');
      } else {
        await createFormEntry(formId, { data });
        message.success('رکورد جدید ثبت شد');
      }
      setInlineAdd(false);
      setEditingEntryId(null);
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
      fixed: 'right',
      align: 'left',
      render: (_: any, row: any) => row.id === '__new__' ? (
        <Space>
          <Button type="primary" onClick={handleInlineSave}>ثبت</Button>
          <Button onClick={() => { setInlineAdd(false); setInlineValues({}); setEditingEntryId(null); }}>لغو</Button>
        </Space>
      ) : (
        <Space>
          <Button onClick={() => handleDuplicate(row)}>کپی</Button>
          <Button onClick={() => handleEdit(row)}>ویرایش</Button>
          <Button danger onClick={() => handleDelete(row)}>حذف</Button>
        </Space>
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
          : ((fieldMeta[f.label]?.type === 'checkbox')
              ? (typeof val === 'boolean' ? (val ? '✓' : '✗') : '—')
              : val),
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
            : ((fieldMeta[key]?.type === 'checkbox')
                ? (typeof val === 'boolean' ? (val ? '✓' : '✗') : '—')
                : val),
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
    
    // Index column
    cols.push({
      title: 'ردیف',
      key: 'index',
      render: (_, row: any, index: number) => index + 1,
    });

    // Base fields only
    for (const f of (formDef.fields || [])) {
      cols.push({
        title: f.label,
        dataIndex: ['data', f.label],
        key: f.label,
        render: (val: any) => {
          const meta = fieldMeta[f.label];
          if (meta?.type === 'checkbox') {
            return typeof val === 'boolean' ? (val ? '✓' : '✗') : '—';
          }
          return val;
        },
      });
    }
    cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
    
    // Actions: duplicate, edit, delete
    cols.push({
      title: 'عملیات',
      key: '__actions',
      fixed: 'right',
      align: 'left',
      render: (_: any, row: any) => (
        <Space>
          <Button onClick={() => handleDuplicate(row)}>کپی</Button>
          <Button onClick={() => handleEdit(row)}>ویرایش</Button>
          <Button danger onClick={() => handleDelete(row)}>حذف</Button>
        </Space>
      ),
    });
    return cols.map((c) => ({ ...c, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) }));
  }, [formDef, fieldMeta]);

  const categoryTables = useMemo(() => {
    const tables: { name: string; columns: any[]; rows: FormEntryRecord[] }[] = [];
    if (!formDef) return tables;
    for (const c of (formDef.categories || [])) {
      if (!c.fields || c.fields.length === 0) continue;
      const cols: any[] = [];
      
      // Index column
      cols.push({
        title: 'ردیف',
        key: 'index',
        render: (_, row: any, index: number) => index + 1,
      });

      const keys: string[] = [];
      for (const f of (c.fields || [])) {
        const key = `${c.name} - ${f.label}`;
        keys.push(key);
        cols.push({
          title: f.label,
          dataIndex: ['data', key],
          key,
          render: (val: any) => {
            const meta = fieldMeta[key];
            if (meta?.type === 'checkbox') {
              return typeof val === 'boolean' ? (val ? '✓' : '✗') : '—';
            }
            return val;
          },
        });
      }
      cols.push({ title: 'زمان ثبت', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleString('fa-IR') : '-' });
      
      // Actions: duplicate, edit, delete
      cols.push({
        title: 'عملیات',
        key: '__actions',
        fixed: 'right',
        align: 'left',
        render: (_: any, row: any) => (
          <Space>
            <Button onClick={() => handleDuplicate(row)}>کپی</Button>
            <Button onClick={() => handleEdit(row)}>ویرایش</Button>
            <Button danger onClick={() => handleDelete(row)}>حذف</Button>
          </Space>
        ),
      });
      
      const rows = entries
        .filter((e) => keys.some((k) => {
          const meta = fieldMeta[k];
          return meta ? hasMeaningfulValue(meta.type, (e.data || {})[k]) : false;
        }))
        .slice()
        .sort((a, b) => {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return ad - bd; // oldest first, newest last
        });
      tables.push({ name: c.name, columns: cols.map((c2) => ({ ...c2, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) })), rows });
    }
    return tables;
  }, [formDef, entries, fieldMeta]);

  // Inline add columns: split into base and per-category rows
  const addBaseColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;
    
    for (const f of (formDef.fields || [])) {
      cols.push({
        title: f.label,
        dataIndex: ['data', f.label],
        key: f.label,
        render: (_val: any, row: any) => row.id === '__new__' ? renderInlineCell(f.label) : _val,
      });
    }

    // Actions
    cols.push({
      title: 'عملیات',
      key: '__actions',
      fixed: 'right',
      align: 'left',
      render: (_: any, row: any) => row.id === '__new__' ? (
        <Space>
          <Button type="primary" onClick={handleInlineSave}>ثبت</Button>
          <Button onClick={() => { setInlineAdd(false); setInlineValues({}); setEditingEntryId(null); }}>لغو</Button>
        </Space>
      ) : null,
    });

    return cols.map((c) => ({ ...c, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) }));
  }, [formDef, inlineValues]);

  const addCategoryTables = useMemo(() => {
    const tables: { name: string; columns: any[] }[] = [];
    if (!formDef) return tables;
    for (const c of (formDef.categories || [])) {
      if (!c.fields || c.fields.length === 0) continue;
      const cols: any[] = [];
      
      for (const f of (c.fields || [])) {
        const key = `${c.name} - ${f.label}`;
        cols.push({
          title: f.label,
          dataIndex: ['data', key],
          key,
          render: (_val: any, row: any) => row.id === '__new__' ? renderInlineCell(key) : _val,
        });
      }

      cols.push({
        title: 'عملیات',
        key: '__actions',
        fixed: 'right',
        align: 'left',
        render: (_: any, row: any) => row.id === '__new__' ? (
          <Space>
            <Button type="primary" onClick={handleInlineSave}>ثبت</Button>
            <Button onClick={() => { setInlineAdd(false); setInlineValues({}); setEditingEntryId(null); }}>لغو</Button>
          </Space>
        ) : null,
      });
      tables.push({ name: c.name, columns: cols.map((c2) => ({ ...c2, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) })) });
    }
    return tables;
  }, [formDef, inlineValues]);

  // Filter entries shown in the base table to only those having meaningful values in base fields
  const filteredBaseEntries = useMemo(() => {
    if (!formDef) return entries.slice().sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ad - bd;
    });
    const keys = (formDef.fields || []).map((f) => f.label);
    if (!keys.length) return [];
    return entries
      .filter((e) => keys.some((k) => {
        const meta = fieldMeta[k];
        return meta ? hasMeaningfulValue(meta.type, (e.data || {})[k]) : false;
      }))
      .slice()
      .sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ad - bd; // oldest first, newest last
      });
  }, [entries, formDef, fieldMeta]);

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
    setEditingEntryId(null);
    const initial: Record<string, any> = {};
    for (const f of ((formDef.fields ?? []) as FormField[])) {
      if (f.type === 'checkbox') initial[f.label] = undefined;
      else if (f.type === 'date') initial[f.label] = undefined;
      else if (f.type === 'select') initial[f.label] = undefined;
      else initial[f.label] = '';
    }
    for (const c of formDef.categories || []) {
      for (const f of ((c.fields ?? []) as FormField[])) {
        const key = `${c.name} - ${f.label}`;
        if (f.type === 'checkbox') initial[key] = undefined;
        else if (f.type === 'date') initial[key] = undefined;
        else if (f.type === 'select') initial[key] = undefined;
        else initial[key] = '';
      }
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
          {(formDef?.fields && formDef.fields.length > 0) && (
            <>
              <Typography.Title level={5} className="!mb-2">{editingEntryId ? 'ویرایش رکورد - فیلدهای اصلی' : 'افزودن رکورد جدید - فیلدهای اصلی'}</Typography.Title>
              <Table
                rowKey="id"
                dataSource={[{ id: '__new__', formId: formId as string, data: inlineValues }] as any}
                columns={addBaseColumns as any}
                loading={loading}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </>
          )}
          {addCategoryTables.map((cat) => (
            <div key={cat.name}>
              <Typography.Title level={5} className="!mt-4 !mb-2">{editingEntryId ? `ویرایش رکورد - ${cat.name}` : `افزودن رکورد جدید - ${cat.name}`}</Typography.Title>
              <Table
                rowKey="id"
                dataSource={[{ id: '__new__', formId: formId as string, data: inlineValues }] as any}
                columns={cat.columns as any}
                loading={loading}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </div>
          ))}
        </>
      )}

      {/* Base fields table (only if there are base fields) */}
      {(formDef?.fields && formDef.fields.length > 0) && (
        <>
          <Typography.Title level={5} className="!mt-6 !mb-2">فیلدهای اصلی</Typography.Title>
          <Table
            rowKey="id"
            dataSource={filteredBaseEntries}
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
            dataSource={cat.rows}
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