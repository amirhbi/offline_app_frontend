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
import dayjs from "dayjs";
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileZipOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { listUsers, updateUser, UserRecord } from "../api/users";
import { useAuth } from "../auth/AuthContext";
import { API_BASE, request } from "../api/client";

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

  const onSave = async (values: any) => {
    try {
      const payload = {
        auto_backup_enabled: !!values.auto_backup_enabled,
        frequency: values.frequency,
        weekday: values.weekday,
        monthday:
          typeof values.monthday === "number" ? values.monthday : undefined,
        time:
          values.time && typeof (values.time as any).format === "function"
            ? (values.time as any).format("HH:mm")
            : values.time,
      };
      await request("/backups/schedule", { method: "POST", body: payload });
      message.success("تنظیمات زمان‌بندی ذخیره شد");
    } catch (e: any) {
      message.error(e?.message || "خطا در ذخیره زمان‌بندی");
    }
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
    sizeBytes: number;
    createdAt: string; // ISO
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes < 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < units.length - 1) {
      num /= 1024;
      i++;
    }
    const fixed = num >= 10 || i === 0 ? 0 : 1;
    return `${num.toFixed(fixed)} ${units[i]}`;
  };

 

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await request<any[]>("/backups");
      const mapped: BackupRow[] = (data || []).map((b: any) => ({
        id: b._id ?? b.id ?? String(Math.random()),
        fileName: b.fileName ?? b.name ?? "backup.zip",
        sizeBytes:
          typeof b.sizeBytes === "number"
            ? b.sizeBytes
            : typeof b.sizeFile === "number"
            ? Math.max(0, Math.round(b.sizeFile * 1024 * 1024))
            : 0,
        createdAt: b.createdAt ?? new Date().toISOString(),
      }));
      setBackups(mapped);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
    loadUsers();
    loadPermUsers();
    (async () => {
      try {
        const s = await request<any>("/backups/schedule");
        if (s) {
          form.setFieldsValue({
            auto_backup_enabled: !!s.enabled,
            frequency: s.frequency || "daily",
            weekday: s.weekday,
            monthday: s.monthday,
            time: s.time ? dayjs(`1970-01-01 ${s.time}`) : undefined,
          });
        }
      } catch {}
    })();
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

  const handleDownload = async (rec: BackupRow) => {
    try {
      const token = localStorage.getItem('app_token');
      const res = await fetch(`${API_BASE}/backups/${rec.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'خطا در دانلود فایل');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = rec.fileName || "backup.json.gz";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success(`دانلود ${rec.fileName} آغاز شد`);
    } catch (e: any) {
      message.error(e?.message || "خطا در دانلود فایل");
    }
  };
  const handleRestore = async (rec: BackupRow) => {
    try {
      message.loading("در حال بازیابی...", 0);
      const res = await request<{ ok: boolean; counts?: { users: number; forms: number; entries: number } }>(
        `/backups/${rec.id}/restore`,
        { method: "POST" }
      );
      message.destroy();
      if (res?.ok) {
        const users = res.counts?.users ?? 0;
        const forms = res.counts?.forms ?? 0;
        const entries = res.counts?.entries ?? 0;
        message.success(`بازیابی کامل شد. کاربران: ${users}، فرم‌ها: ${forms}، داده‌ها: ${entries}`);
      } else {
        message.success(`بازیابی از ${rec.fileName} انجام شد`);
      }
    } catch (e: any) {
      message.destroy();
      message.error(e?.message || "خطا در بازیابی بکاپ");
    }
  };
  const handleRestoreFromFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gz,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        message.loading("در حال بازیابی از فایل...", 0);
        const fd = new FormData();
        fd.append("file", file);
        const token = localStorage.getItem("app_token");
        const res = await fetch(`${API_BASE}/backups/restore/file`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        message.destroy();
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "خطا در بازیابی از فایل");
        }
        const json = await res.json();
        const users = json?.counts?.users ?? 0;
        const forms = json?.counts?.forms ?? 0;
        const entries = json?.counts?.entries ?? 0;
        message.success(`بازیابی کامل شد. کاربران: ${users}، فرم‌ها: ${forms}، داده‌ها: ${entries}`);
      } catch (e: any) {
        message.destroy();
        message.error(e?.message || "خطا در بازیابی از فایل");
      }
    };
    input.click();
  };
  const handleDelete = async (rec: BackupRow) => {
    try {
      await request(`/backups/${rec.id}`, { method: "DELETE" });
      message.success(`بکاپ ${rec.fileName} حذف شد`);
      await loadBackups();
    } catch (e: any) {
      message.error(e?.message || "خطا در حذف بکاپ");
    }
  };
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const handleCreateFullBackup = async () => {
    try {
      message.loading("در حال ایجاد بکاپ...", 0);
      await request("/backups", { method: "POST" });
      message.destroy();
      message.success("بکاپ با موفقیت ایجاد شد");
      await loadBackups();
    } catch (e: any) {
      message.destroy();
      message.error(e?.message || "خطا در ایجاد بکاپ");
    }
  };

  const columns = [
    { title: "نام فایل", dataIndex: "fileName", key: "fileName" },
    {
      title: "حجم فایل",
      key: "size",
      render: (_: any, rec: BackupRow) => formatBytes(rec.sizeBytes),
    },
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
          <Button type="primary" icon={<FileZipOutlined />} onClick={handleCreateFullBackup}>
            ایجاد بکاپ کامل
          </Button>
          <Button icon={<CloudUploadOutlined />} onClick={() => handleRestoreFromFile()}>
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
                initialValues={{ auto_backup_enabled: false, frequency: "daily" }}
                onFinish={onSave}
                className="mb-4"
              >
                <Form.Item
                  name="auto_backup_enabled"
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
