import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { DashboardOutlined, UserOutlined, SettingOutlined, LogoutOutlined, FileTextOutlined, DatabaseOutlined, AuditOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('dashboard');

  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    setSelectedKey(path);
  }, [location]);

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'داشبورد سراسری' },
    { key: 'users', icon: <UserOutlined />, label: 'مدیریت کاربران' },
    { key: 'structure', icon: <SettingOutlined />, label: 'مدیریت ساختار سامانه' },
    { key: 'reports', icon: <FileTextOutlined />, label: 'گزارش‌گیری کلی' },
    { key: 'backup', icon: <DatabaseOutlined />, label: 'پشتیبان‌گیری' },
    { key: 'logs', icon: <AuditOutlined />, label: 'بخش لاگ‌ها' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 48, margin: 16, color: '#fff', fontWeight: 600 }}>
          {collapsed ? 'مد' : 'مدیریت'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={(e) => navigate(`/${e.key}`)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>خوش آمدید، مدیر کل (L1)</div>
          <Button icon={<LogoutOutlined />} onClick={() => { signOut(); navigate('/login'); }}>
            خروج
          </Button>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}