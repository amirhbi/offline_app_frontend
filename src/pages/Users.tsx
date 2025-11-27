import React from 'react';
import { Table, Typography } from 'antd';

export default function Users() {
  const data = [
    { key: 1, name: 'Alice', role: 'Admin' },
    { key: 2, name: 'Bob', role: 'Editor' },
    { key: 3, name: 'Charlie', role: 'Viewer' },
  ];

  return (
    <div>
      <Typography.Title level={3}>کاربران</Typography.Title>
      <Table
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'نام', dataIndex: 'name' },
          { title: 'نقش', dataIndex: 'role' },
        ]}
      />
    </div>
  );
}