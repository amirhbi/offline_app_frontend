import React, { useMemo, useState } from 'react';
import { Table, Typography, Card, Button, Space, Tag, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

type L3UserRow = {
  key: number;
  username: string;
  role: string;
  forms: string[];
  reports: string[];
};

export default function L3Users() {
  const [users, setUsers] = useState<L3UserRow[]>([
    { key: 1, username: 'اپراتور_اعلام_۱', role: 'L3', forms: ['فرم ۲'], reports: ['گزارش فرم ۲'] },
    { key: 2, username: 'اپراتور_اطفاء_۱', role: 'L3', forms: ['فرم ۳'], reports: ['گزارش فرم ۳'] },
  ]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<L3UserRow | null>(null);
  const [createForm] = Form.useForm<L3UserRow>();
  const [editForm] = Form.useForm<L3UserRow>();

  const formOptions = useMemo(() => ['فرم ۲', 'فرم ۳', 'فرم ۴'], []);
  const reportOptions = useMemo(() => ['گزارش فرم ۲', 'گزارش فرم ۳', 'گزارش فرم ۴'], []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const nextKey = (users.reduce((m, u) => Math.max(m, u.key), 0) || 0) + 1;
      const newUser: L3UserRow = { key: nextKey, username: values.username, role: 'L3', forms: values.forms || [], reports: values.reports || [] };
      setUsers((prev) => [...prev, newUser]);
      setCreateOpen(false);
      createForm.resetFields();
      message.success('کاربر L3 جدید ایجاد شد');
    } catch (err) { /* ignore */ }
  };

  const startEdit = (record: L3UserRow) => {
    setEditingUser(record);
    setEditOpen(true);
    editForm.setFieldsValue({ username: record.username, forms: record.forms, reports: record.reports });
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingUser) return;
      setUsers((prev) => prev.map((u) => (u.key === editingUser.key ? { ...u, username: values.username, forms: values.forms || [], reports: values.reports || [] } : u)));
      setEditOpen(false);
      setEditingUser(null);
      message.success('ویرایش کاربر L3 انجام شد');
    } catch (err) { /* ignore */ }
  };

  const handleDelete = (key: number) => {
    setUsers((prev) => prev.filter((u) => u.key !== key));
    message.success('کاربر L3 حذف شد');
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
        rowKey="key"
        pagination={false}
        columns={[
          { title: 'نام کاربری L3', dataIndex: 'username' },
          { title: 'سطح', dataIndex: 'role' },
          {
            title: 'دسترسی فرم‌ها',
            dataIndex: 'forms',
            render: (forms: string[]) => (
              <Space wrap>
                {forms.map((f) => (
                  <Tag key={f} color="blue">{f}</Tag>
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
                  <Tag key={r} color="green">{r}</Tag>
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
                  onConfirm={() => handleDelete(record.key)}
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
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formOptions.map((f) => ({ value: f, label: f }))} />
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
            <Select mode="multiple" placeholder="انتخاب فرم‌ها" options={formOptions.map((f) => ({ value: f, label: f }))} />
          </Form.Item>
          <Form.Item name="reports" label="دسترسی گزارش‌ها">
            <Select mode="multiple" placeholder="انتخاب گزارش‌ها" options={reportOptions.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}