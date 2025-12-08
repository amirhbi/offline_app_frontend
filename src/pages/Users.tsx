import React, { useMemo, useState, useEffect } from 'react';
import { Table, Typography, Card, Button, Space, Tag, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createUser, deleteUser, listUsers, updateUser, UserRecord } from '../api/users';
import { listForms, FormRecord } from '../api/forms';

type UserRow = UserRecord;

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [createForm] = Form.useForm<UserRow>();
  const [editForm] = Form.useForm<UserRow>();

  const [formsList, setFormsList] = useState<FormRecord[]>([]);
  const reportOptions = useMemo(() => ['گزارش فرم ۲', 'گزارش فرم ۳', 'گزارش فرم ۴'], []);
  const logsOptions = useMemo(() => ['لاگ سیستم', 'لاگ کاربری', 'لاگ پشتیبان‌گیری', 'لاگ عملیات'], []);

  // Map each form to the reports it enables
  const formReportMap = useMemo<Record<string, string[]>>(
    () => ({
      'فرم ۲': ['گزارش فرم ۲'],
      'فرم ۳': ['گزارش فرم ۳'],
      'فرم ۴': ['گزارش فرم ۴'],
    }),
    []
  );

  // Track selected forms for create/edit independently
  const [selectedCreateForms, setSelectedCreateForms] = useState<string[]>([]);
  const [selectedEditForms, setSelectedEditForms] = useState<string[]>([]);

  const formNameById = useMemo<Record<string, string>>(
    () => Object.fromEntries(formsList.map((f) => [f.id, f.name])),
    [formsList]
  );

  // Load users on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listUsers('admin');
        setUsers(data);
      } catch (err: any) {
        message.error(err?.message || 'خطا در دریافت کاربران');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load forms options from API
  useEffect(() => {
    const loadForms = async () => {
      try {
        const forms = await listForms();
        setFormsList(forms);
      } catch (err: any) {
        message.error(err?.message || 'خطا در دریافت فرم‌ها');
      }
    };
    loadForms();
  }, []);

  // Build filtered report options based on selected forms (create)
  const filteredCreateReportOptions = useMemo(() => {
    const allowed = new Set<string>();
    (selectedCreateForms || [])
      .map((id) => formNameById[id] || id)
      .forEach((name) => {
        (formReportMap[name] || []).forEach((r) => allowed.add(r));
      });
    const list = Array.from(allowed).map((r) => ({ value: r, label: r }));
    return list.length > 0 ? list : reportOptions.map((r) => ({ value: r, label: r }));
  }, [selectedCreateForms, formReportMap, formNameById, reportOptions]);

  // Build filtered report options based on selected forms (edit)
  const filteredEditReportOptions = useMemo(() => {
    const allowed = new Set<string>();
    (selectedEditForms || [])
      .map((id) => formNameById[id] || id)
      .forEach((name) => {
        (formReportMap[name] || []).forEach((r) => allowed.add(r));
      });
    const list = Array.from(allowed).map((r) => ({ value: r, label: r }));
    return list.length > 0 ? list : reportOptions.map((r) => ({ value: r, label: r }));
  }, [selectedEditForms, formReportMap, formNameById, reportOptions]);

  // Prune selected reports if they become invalid when forms change (create)
  useEffect(() => {
    const current: string[] = createForm.getFieldValue('reports') || [];
    const allowed = new Set(filteredCreateReportOptions.map((o) => o.value));
    const next = current.filter((r) => allowed.has(r));
    if (current.length !== next.length) {
      createForm.setFieldsValue({ reports: next });
    }
  }, [filteredCreateReportOptions, createForm]);

  // Prune selected reports if they become invalid when forms change (edit)
  useEffect(() => {
    const current: string[] = editForm.getFieldValue('reports') || [];
    const allowed = new Set(filteredEditReportOptions.map((o) => o.value));
    const next = current.filter((r) => allowed.has(r));
    if (current.length !== next.length) {
      editForm.setFieldsValue({ reports: next });
    }
  }, [filteredEditReportOptions, editForm]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        username: values.username,
        nickname: values.nickname || '',
        password: values.password,
        role: 'admin' as const,
        forms: values.forms || [],
        reports: values.reports || [],
        logs: values.logs || [],
      };
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      setCreateOpen(false);
      createForm.resetFields();
      message.success('کاربر جدید ایجاد شد');
    } catch (err: any) {
      message.error(err?.message || 'ایجاد کاربر ناموفق بود');
    }
  };

  const startEdit = (record: UserRow) => {
    setEditingUser(record);
    setEditOpen(true);
    const mappedFormIds = (record.forms || []).map((v) => {
      const byId = formsList.find((f) => f.id === v);
      if (byId) return v;
      const byName = formsList.find((f) => f.name === v);
      return byName ? byName.id : v;
    });
    editForm.setFieldsValue({ username: record.username, nickname: record.nickname || '', forms: mappedFormIds, reports: record.reports, logs: record.logs });
    setSelectedEditForms(mappedFormIds || []);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingUser) return;
      const updated = await updateUser(editingUser.id, {
        username: values.username,
        nickname: values.nickname || '',
        password: values.password || undefined,
        forms: values.forms || [],
        reports: values.reports || [],
        logs: values.logs || [],
      });
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditOpen(false);
      setEditingUser(null);
      message.success('ویرایش کاربر انجام شد');
    } catch (err: any) {
      message.error(err?.message || 'ویرایش کاربر ناموفق بود');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      message.success('کاربر حذف شد');
    } catch (err: any) {
      message.error(err?.message || 'حذف کاربر ناموفق بود');
    }
  };

  return (
    <Card className="border border-red-300">
      <Space style={{ width: '100%', justifyContent: 'space-between' }} className="mb-4">
        <Typography.Title level={4} className="!mb-0 text-red-600">
           مدیریت کاربران 
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>ایجاد مدیر بخشی جدید</Button>
      </Space>
      <Typography.Paragraph className="mt-0">
        ایجاد، ویرایش و حذف حساب‌های کاربری مدیران بخشی.
      </Typography.Paragraph>
      <Table<UserRow>
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
        columns={[
          { title: 'نام کاربری', dataIndex: 'username' },
          { title: 'نام نمایشی', dataIndex: 'nickname' },
          {
            title: 'دسترسی فرم‌ها',
            dataIndex: 'forms',
            render: (forms: string[]) =>
              forms && forms.length > 0 ? (
                <Space wrap>
                  {forms.map((f) => (
                    <Tag key={f} color="blue">{formNameById[f] || f}</Tag>
                  ))}
                </Space>
              ) : (
                'دسترسی داده نشده است'
              ),
          },
          {
            title: 'دسترسی گزارش‌ها',
            dataIndex: 'reports',
            render: (reports: string[]) =>
              reports && reports.length > 0 ? (
                <Space wrap>
                  {reports.map((r) => (
                    <Tag key={r} color="green">{r}</Tag>
                  ))}
                </Space>
              ) : (
                'دسترسی داده نشده است'
              ),
          },
          {
            title: 'دسترسی لاگ‌ها',
            dataIndex: 'logs',
            render: (logs: string[]) =>
              logs && logs.length > 0 ? (
                <Space wrap>
                  {logs.map((l) => (
                    <Tag key={l} color="volcano">{l}</Tag>
                  ))}
                </Space>
              ) : (
                'دسترسی داده نشده است'
              ),
          },
          {
            title: 'عملیات',
            render: (_: any, record: UserRow) => (
              <Space>
                <Button size="small" onClick={() => startEdit(record)}>ویرایش دسترسی</Button>
                <Popconfirm
                  title="حذف کاربر"
                  description="آیا از حذف این کاربر مطمئن هستید؟"
                  okText="حذف"
                  cancelText="انصراف"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button size="small" danger>حذف</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title="ایجاد مدیر بخشی جدید"
        okText="ایجاد"
        cancelText="انصراف"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form
          form={createForm}
          layout="vertical"
          onValuesChange={(_, all) => setSelectedCreateForms((all as any)?.forms || [])}
        >
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: 'نام کاربری را وارد کنید' }]}> 
            <Input placeholder="manager_branch_X" />
          </Form.Item>
          <Form.Item name="nickname" label="نام نمایشی" initialValue="" rules={[{ required: true, message: 'نام نمایشی را وارد کنید' }]}> 
            <Input placeholder="مدیر_بخش_اطفاء" />
          </Form.Item>
          <Form.Item name="password" label="رمز عبور" rules={[{ required: true, message: 'رمز عبور را وارد کنید' }]}> 
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item name="forms" label="دسترسی فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="reports" label="دسترسی گزارش‌ها">
            <Select
              mode="multiple"
              placeholder="انتخاب گزارش‌ها (براساس فرم‌های انتخاب‌شده)"
              options={filteredCreateReportOptions}
              disabled={(selectedCreateForms || []).length === 0}
            />
          </Form.Item>
          <Form.Item name="logs" label="دسترسی لاگ‌ها">
            <Select mode="multiple" placeholder="انتخاب لاگ‌ها" options={logsOptions.map((l) => ({ value: l, label: l }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="ویرایش دسترسی کاربر"
        okText="ذخیره"
        cancelText="انصراف"
        onCancel={() => { setEditOpen(false); setEditingUser(null); }}
        onOk={handleEdit}
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={(_, all) => setSelectedEditForms((all as any)?.forms || [])}
        >
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: 'نام کاربری را وارد کنید' }]}> 
            <Input />
          </Form.Item>
          <Form.Item name="nickname" label="نام نمایشی" initialValue="" rules={[{ required: true, message: 'نام نمایشی را وارد کنید' }]}> 
            <Input />
          </Form.Item>
          <Form.Item name="password" label="رمز عبور (در صورت تغییر)"> 
            <Input.Password placeholder="رمز عبور جدید" />
          </Form.Item>
          <Form.Item name="forms" label="دسترسی فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="reports" label="دسترسی گزارش‌ها">
            <Select
              mode="multiple"
              placeholder="انتخاب گزارش‌ها (براساس فرم‌های انتخاب‌شده)"
              options={filteredEditReportOptions}
              disabled={(selectedEditForms || []).length === 0}
            />
          </Form.Item>
          <Form.Item name="logs" label="دسترسی لاگ‌ها">
            <Select mode="multiple" placeholder="انتخاب لاگ‌ها" options={logsOptions.map((l) => ({ value: l, label: l }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}