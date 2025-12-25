import React, { useEffect, useMemo, useState } from 'react';
import { Table, Typography, Card, Button, Space, Tag, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createUser, deleteUser, listUsers, updateUser, UserRecord } from '../api/users';
import { listForms, FormRecord } from '../api/forms';

type L3UserRow = UserRecord;

export default function L3Users() {
  const [users, setUsers] = useState<L3UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<L3UserRow | null>(null);
  const [createForm] = Form.useForm<L3UserRow>();
  const [editForm] = Form.useForm<L3UserRow>();

  const [formsList, setFormsList] = useState<FormRecord[]>([]);
  const formNameById = useMemo<Record<string, string>>(
    () => Object.fromEntries(formsList.map((f) => [f.id, f.name])),
    [formsList]
  );
  const truncateText = (s: string, max = 20) => (s && s.length > max ? s.slice(0, max) + '...' : s);
  const reportOptions = useMemo(() => ['گزارش فرم ۲', 'گزارش فرم ۳', 'گزارش فرم ۴'], []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listUsers('L3');
        setUsers(data);
      } catch (err: any) {
        message.error(err?.message || 'خطا در دریافت کاربران L3');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        username: values.username,
        role: 'L3' as const,
        forms: values.forms || [],
        forms_view: values.forms_view || [],
        reports: values.reports || [],
        logs: [],
      };
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      setCreateOpen(false);
      createForm.resetFields();
      message.success('کاربر L3 جدید ایجاد شد');
    } catch (err: any) {
      message.error(err?.message || 'ایجاد کاربر L3 ناموفق بود');
    }
  };

  const startEdit = (record: L3UserRow) => {
    setEditingUser(record);
    setEditOpen(true);
    const mappedFormIds = (record.forms || []).map((v) => {
      const byId = formsList.find((f) => f.id === v);
      if (byId) return v;
      const byName = formsList.find((f) => f.name === v);
      return byName ? byName.id : v;
    });
    editForm.setFieldsValue({
      username: record.username,
      forms: mappedFormIds,
      forms_view: record.forms_view || [],
      reports: record.reports,
    });
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingUser) return;
      const updated = await updateUser(editingUser.id, {
        username: values.username,
        forms: values.forms || [],
        forms_view: values.forms_view || [],
        reports: values.reports || [],
      });
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditOpen(false);
      setEditingUser(null);
      message.success('ویرایش کاربر L3 انجام شد');
    } catch (err: any) {
      message.error(err?.message || 'ویرایش کاربر L3 ناموفق بود');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      message.success('کاربر L3 حذف شد');
    } catch (err: any) {
      message.error(err?.message || 'حذف کاربر L3 ناموفق بود');
    }
  };

  return (
    <Card className="border border-red-300">
      <Space style={{ width: '100%', justifyContent: 'space-between' }} className="mb-4">
        <Typography.Title level={4} className="!mb-0 text-red-600">
          مدیریت کاربران (L3)
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>ایجاد کاربر L3 جدید</Button>
      </Space>
      <Typography.Paragraph className="mt-0">
        ایجاد، ویرایش و حذف حساب‌های کاربری اپراتورهای سطح ۳ (L3).
      </Typography.Paragraph>
      <Table<L3UserRow>
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
        columns={[
          { title: 'نام کاربری L3', dataIndex: 'username' },
          { title: 'سطح', dataIndex: 'role' },
          {
            title: 'دسترسی فرم‌ها',
            dataIndex: 'forms',
            render: (forms: string[]) => (
              <Space wrap>
                {(forms || []).map((f) => (
                  <Tag key={f} color="blue">{truncateText(formNameById[f] || f)}</Tag>
                ))}
              </Space>
            ),
          },
          {
            title: 'دسترسی مشاهده فرم‌ها',
            dataIndex: 'forms_view',
            render: (forms: string[]) => (
              <Space wrap>
                {(forms || []).map((f) => (
                  <Tag key={f} color="cyan">
                    {truncateText(formNameById[f] || f)}
                  </Tag>
                ))}
              </Space>
            ),
          },
          {
            title: 'دسترسی گزارش‌ها',
            dataIndex: 'reports',
            render: (reports: string[]) => (
              <Space wrap>
                {reports.map((r) => (
                  <Tag key={r} color="green">{truncateText(r)}</Tag>
                ))}
              </Space>
            ),
          },
          {
            title: 'عملیات',
            render: (_: any, record: L3UserRow) => (
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
        title="ایجاد کاربر L3 جدید"
        okText="ایجاد"
        cancelText="انصراف"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: 'نام کاربری را وارد کنید' }]}>
            <Input placeholder="operator_branch_X" />
          </Form.Item>
          <Form.Item name="forms" label="دسترسی فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="forms_view" label="دسترسی مشاهده فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="reports" label="دسترسی گزارش‌ها">
            <Select mode="multiple" placeholder="انتخاب گزارش‌ها" options={reportOptions.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="ویرایش دسترسی کاربر L3"
        okText="ذخیره"
        cancelText="انصراف"
        onCancel={() => { setEditOpen(false); setEditingUser(null); }}
        onOk={handleEdit}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true, message: 'نام کاربری را وارد کنید' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="forms" label="دسترسی فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="forms_view" label="دسترسی مشاهده فرم‌ها">
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formsList.map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
          <Form.Item name="reports" label="دسترسی گزارش‌ها">
            <Select mode="multiple" placeholder="انتخاب گزارش‌ها" options={reportOptions.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}