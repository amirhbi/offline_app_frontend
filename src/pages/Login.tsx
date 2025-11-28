import React, { useState } from 'react';
import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const onFinish = async (values: { username: string; password: string }) => {
    const ok = await signIn(values.username, values.password);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setError('نام کاربری یا رمز عبور نادرست است. admin / admin123 را امتحان کنید');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <Card className="w-[360px]">
        <Typography.Title level={5} className="text-center mb-4">
          سامانه مدیریت داده خدمات ایمنی (آفلاین)
        </Typography.Title>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true }]}> 
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item name="password" label="رمز عبور" rules={[{ required: true }]}> 
            <Input.Password placeholder="admin123" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              ورود
            </Button>
          </Form.Item>
        </Form>
        <p className="text-center text-sm text-gray-500">
          (دسترسی فقط از طریق شبکه داخلی Intranet)
        </p>
      </Card>
    </div>
  );
}