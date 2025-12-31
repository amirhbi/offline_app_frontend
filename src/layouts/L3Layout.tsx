import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { DashboardOutlined, FormOutlined, CloudDownloadOutlined, LogoutOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Sider, Content } = Layout;

export default function L3Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('dashboard');

  useEffect(() => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    setSelectedKey(path);
  }, [location]);

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'پنل ویرایشگر' },
    { key: 'data-entry', icon: <FormOutlined />, label: 'ورود داده (Data Entry)' },
    { key: 'export', icon: <CloudDownloadOutlined />, label: 'خروجی گیری (در صورت دسترسی)' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 48, margin: 16, color: '#fff', fontWeight: 600 }}>
          {collapsed ? 'l3' : 'پنل l3'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={(e) => navigate(`/l3/${e.key}`)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>خوش آمدید</div>
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