import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  List,
  Space,
  Button,
  Form,
  Select,
  Switch,
  TimePicker,
  InputNumber,
  message,
  Tabs,
  Table,
  Popconfirm,
} from "antd";
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileZipOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { listUsers, updateUser, UserRecord } from "../api/users";
import { useAuth } from "../auth/AuthContext";

export default function Backup() {
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersOptions, setUsersOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [permUsers, setPermUsers] = useState<UserRecord[]>([]);
  const [permUsersLoading, setPermUsersLoading] = useState(false);

  const onSave = (values: any) => {
    message.success("تنظیمات زمان‌بندی ذخیره شد");
  };
  const onSavePerm = async (values: any) => {
    try {
      const userId: string = values.user;
      await updateUser(userId, { backupAllowed: true });
      message.success("دسترسی پشتیبان‌گیری برای کاربر فعال شد");
      permForm.resetFields();
      await loadPermUsers();
    } catch (e: any) {
      message.error(e?.message || "خطا در ذخیره دسترسی");
    }
  };

  type BackupRow = {
    id: string;
    fileName: string;
    sizeMB: number;
    createdAt: string; // ISO
  };

  const sampleBackups: BackupRow[] = [
    {
      id: "b1",
      fileName: "backup_full_1402-09-19.zip",
      sizeMB: 128,
      createdAt: new Date().toISOString(),
    },
    {
      id: "b2",
      fileName: "backup_inc_1402-09-18.zip",
      sizeMB: 42,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      if (res.ok) {
        const data = await res.json();
        const mapped: BackupRow[] = (data || []).map((b: any) => ({
          id: b._id ?? b.id ?? String(Math.random()),
          fileName: b.fileName ?? b.name ?? "backup.zip",
          sizeMB:
            typeof b.sizeMB === "number"
              ? b.sizeMB
              : Math.round(((b.sizeBytes ?? 0) / (1024 * 1024)) * 10) / 10,
          createdAt: b.createdAt ?? new Date().toISOString(),
        }));
        setBackups(mapped);
      } else {
        setBackups(sampleBackups);
      }
    } catch (e) {
      setBackups(sampleBackups);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
    loadUsers();
    loadPermUsers();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const users: UserRecord[] = await listUsers();
      const opts = users.map((u) => ({
        value: u.id,
        label:
          u.nickname && String(u.nickname).trim().length > 0
            ? u.nickname
            : u.username,
      }));
      setUsersOptions(opts);
    } catch (e) {
      setUsersOptions([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadPermUsers = async () => {
    setPermUsersLoading(true);
    try {
      const users: UserRecord[] = await listUsers();
      setPermUsers(users.filter((u) => !!u.backupAllowed));
    } catch (e) {
      setPermUsers([]);
    } finally {
      setPermUsersLoading(false);
    }
  };

  const handleDownload = (rec: BackupRow) => {
    message.success(`دانلود ${rec.fileName} آغاز شد`);
  };
  const handleRestore = (rec: BackupRow) => {
    message.success(`بازیابی از ${rec.fileName} آغاز شد`);
  };
  const handleDelete = async (rec: BackupRow) => {
    // If API exists, call DELETE /api/backups/:id
    message.success(`بکاپ ${rec.fileName} حذف شد`);
    setBackups((prev) => prev.filter((b) => b.id !== rec.id));
  };
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const columns = [
    { title: "نام فایل", dataIndex: "fileName", key: "fileName" },
    { title: "حجم (MB)", dataIndex: "sizeMB", key: "sizeMB" },
    {
      title: "زمان ایجاد",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleString("fa-IR"),
    },
    {
      title: "عملیات",
      key: "actions",
      render: (_: any, rec: BackupRow) => (
        <Space>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={() => handleDownload(rec)}
          >
            دانلود
          </Button>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => handleRestore(rec)}
          >
            بازیابی
          </Button>
          <Popconfirm title="حذف بکاپ؟" onConfirm={() => handleDelete(rec)}>
            <Button danger icon={<DeleteOutlined />}>
              حذف
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
        پشتیبان‌گیری
      </Typography.Title>

      <Tabs
        defaultActiveKey="actions"
        items={[
          {
            key: "actions",
            label: "عملیات پشتیبان‌گیری",
            children: (
              <div className="">
                <Space>
                  <Button type="primary" icon={<FileZipOutlined />}>
                    ایجاد بکاپ کامل
                  </Button>
                  <Button icon={<CloudUploadOutlined />}>
                    بازیابی از فایل
                  </Button>
                </Space>
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-2">
                    <Typography.Title level={5}>فهرست بکاپ‌ها</Typography.Title>
                    <Button onClick={loadBackups}>بازخوانی</Button>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={backups}
                    columns={columns as any}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "schedule",
            label: "زمان‌بندی خودکار",
            children: (
              <Form
                form={form}
                layout="vertical"
                initialValues={{ enabled: false, frequency: "daily" }}
                onFinish={onSave}
                className="mb-4"
              >
                <Form.Item
                  name="enabled"
                  label="فعال‌سازی زمان‌بندی خودکار"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="frequency"
                  label="بازه زمانی"
                  rules={[
                    { required: true, message: "بازه زمانی را انتخاب کنید" },
                  ]}
                >
                  <Select
                    options={[
                      { value: "daily", label: "روزانه" },
                      { value: "weekly", label: "هفتگی" },
                      { value: "monthly", label: "ماهانه" },
                    ]}
                    placeholder="انتخاب بازه زمانی"
                  />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prev, cur) => prev.frequency !== cur.frequency}
                >
                  {({ getFieldValue }) => {
                    const freq = getFieldValue("frequency");
                    return (
                      <>
                        {freq === "weekly" && (
                          <Form.Item
                            name="weekday"
                            label="روز هفته"
                            rules={[
                              {
                                required: true,
                                message: "روز هفته را انتخاب کنید",
                              },
                            ]}
                          >
                            <Select
                              options={[
                                { value: "sat", label: "شنبه" },
                                { value: "sun", label: "یکشنبه" },
                                { value: "mon", label: "دوشنبه" },
                                { value: "tue", label: "سه‌شنبه" },
                                { value: "wed", label: "چهارشنبه" },
                                { value: "thu", label: "پنجشنبه" },
                                { value: "fri", label: "جمعه" },
                              ]}
                              placeholder="انتخاب روز هفته"
                            />
                          </Form.Item>
                        )}

                        {freq === "monthly" && (
                          <Form.Item
                            name="monthday"
                            label="روز ماه"
                            rules={[
                              {
                                required: true,
                                message: "روز ماه را وارد کنید",
                              },
                            ]}
                          >
                            <InputNumber
                              min={1}
                              max={29}
                              style={{ width: "100%" }}
                              placeholder="۱ تا ۲۹"
                            />
                          </Form.Item>
                        )}

                        <Form.Item
                          name="time"
                          label="زمان اجرا"
                          rules={[
                            {
                              required: true,
                              message: "زمان اجرا را انتخاب کنید",
                            },
                          ]}
                        >
                          <TimePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                            placeholder="انتخاب زمان"
                          />
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      ذخیره تنظیمات
                    </Button>
                    <Button
                      htmlType="button"
                      onClick={() => form.resetFields()}
                    >
                      بازنشانی
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
          ...(isSuperAdmin
            ? [
                {
                  key: "permissions",
                  label: "مدیریت دسترسی",
                  children: (
                  <>
                  <Form
                    form={permForm}
                    layout="vertical"
                    onFinish={onSavePerm}
                className="mb-4"
              >
                <Form.Item
                  name="user"
                  label="انتخاب کاربر"
                  rules={[{ required: true, message: "کاربر را انتخاب کنید" }]}
                >
                  <Select
                    placeholder="انتخاب کاربر"
                    showSearch
                    loading={usersLoading}
                    options={usersOptions}
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      ذخیره دسترسی
                    </Button>
                    <Button
                      htmlType="button"
                      onClick={() => permForm.resetFields()}
                    >
                      بازنشانی
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <Typography.Title level={5}>کاربران دارای دسترسی پشتیبان‌گیری</Typography.Title>
                  <Button onClick={loadPermUsers}>بازخوانی</Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={permUsers}
                  loading={permUsersLoading}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: "کاربر", key: "user", render: (_: any, r: UserRecord) => r.nickname?.trim() ? r.nickname : r.username },
                    { title: "نقش", dataIndex: "role", key: "role", render: (role: string) => (role === 'l2' ? 'l2' : 'l3') },
                    { title: "عملیات", key: "actions", render: (_: any, r: UserRecord) => (
                      <Popconfirm title="حذف دسترسی این کاربر؟" onConfirm={async () => { try { await updateUser(r.id, { backupAllowed: false }); message.success("دسترسی حذف شد"); await loadPermUsers(); } catch (e: any) { message.error(e?.message || "خطا"); } } }>
                        <Button danger icon={<DeleteOutlined />}>حذف دسترسی</Button>
                      </Popconfirm>
                    ) },
                  ] as any}
                />
                  </div>
                  </>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
