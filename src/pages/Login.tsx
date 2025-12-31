import React, { useState } from 'react';
import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/fire_department.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, userData, role } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const onFinish = async (values: { username: string; password: string }) => {
    const res = await signIn(values.username, values.password);
    if (res.ok) {
      const userRole = res.role ?? userData?.role;
      if (userRole === 'l2') {
        navigate('/l2', { replace: true });
      } else if (userRole === 'l3') {
        navigate('/l3', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setError('نام کاربری یا رمز عبور نادرست است');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <Card className="w-[360px]">
        <img src={logo} alt="لوگو" className="mx-auto mb-4 block" width={72} height={72} />
        <Typography.Title level={5} className="text-center mb-4">
          سامانه مدیریت داده خدمات ایمنی (آفلاین)
        </Typography.Title>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="نام کاربری" rules={[{ required: true }]}> 
            <Input placeholder="نام کاربری" />
          </Form.Item>
          <Form.Item name="password" label="رمز عبور" rules={[{ required: true }]}> 
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              ورود
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
