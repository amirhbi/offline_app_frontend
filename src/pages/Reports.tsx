import React, { useMemo, useState } from 'react';
import { Card, Typography, Form, Select, Space, Button, InputNumber, Table, Tabs, List, message } from 'antd';
import 'chart.js/auto';
import { Bar } from 'react-chartjs-2';

type ReportRow = {
  key: number;
  form: string;
  name: string;
  score: number;
  date: string; // YYYY-MM-DD
  status: 'نرمال' | 'نیاز به بازبینی' | 'خطا';
};

export default function Reports() {
  const forms = useMemo(() => ['فرم ۱: ژنراتورها', 'فرم ۲: سیستم اطفا', 'فرم ۳: سیستم اعلام'], []);
  const statuses = useMemo(() => ['نرمال', 'نیاز به بازبینی', 'خطا'] as ReportRow['status'][] , []);

  const sampleData: ReportRow[] = useMemo(() => {
    const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    return Array.from({ length: 24 }, (_, i) => {
      const daysAgo = randomBetween(0, 30);
      const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const date = d.toISOString().slice(0, 10);
      const status = statuses[randomBetween(0, statuses.length - 1)];
      return {
        key: i + 1,
        form: forms[randomBetween(0, forms.length - 1)],
        name: `نمونه ${i + 1}`,
        score: randomBetween(10, 100),
        date,
        status,
      };
    });
  }, [forms, statuses]);

  const [filtered, setFiltered] = useState<ReportRow[]>(sampleData);
  const [filterForm] = Form.useForm();

  const applyFilter = (values: any) => {
    let result = [...sampleData];
    // فرم
    if (values.form && values.form !== 'all') {
      result = result.filter((r) => r.form === values.form);
    }
    // فیلد و شرط
    const field = values.field;
    const cond = values.condition;
    const val = values.value;
    if (field === 'score' && cond && typeof val === 'number') {
      if (cond === 'lt') result = result.filter((r) => r.score < val);
      if (cond === 'gt') result = result.filter((r) => r.score > val);
      if (cond === 'eq') result = result.filter((r) => r.score === val);
    }
    if (field === 'status' && cond === 'includes' && val) {
      result = result.filter((r) => r.status === val);
    }
    if (field === 'date' && typeof val === 'number' && values.timeUnit) {
      const now = Date.now();
      const delta = val * 24 * 60 * 60 * 1000;
      if (values.timeUnit === 'future') {
        const target = new Date(now + delta).toISOString().slice(0, 10);
        result = result.filter((r) => r.date <= target);
      } else if (values.timeUnit === 'past') {
        const target = new Date(now - delta).toISOString().slice(0, 10);
        result = result.filter((r) => r.date >= target);
      }
    }
    setFiltered(result);
    message.success('فیلتر اعمال شد');
  };

  const chartData = useMemo(() => {
    const counts = statuses.map((s) => filtered.filter((r) => r.status === s).length);
    return {
      labels: statuses,
      datasets: [
        {
          label: 'تعداد موارد بر اساس وضعیت',
          data: counts,
          backgroundColor: ['#52c41a', '#faad14', '#ff4d4f'],
        },
      ],
    };
  }, [filtered, statuses]);

  const columns = [
    { title: 'فرم', dataIndex: 'form', key: 'form' },
    { title: 'نام', dataIndex: 'name', key: 'name' },
    { title: 'امتیاز', dataIndex: 'score', key: 'score' },
    { title: 'تاریخ', dataIndex: 'date', key: 'date' },
    { title: 'وضعیت', dataIndex: 'status', key: 'status' },
  ];
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
       گزارش‌گیری کلی
      </Typography.Title>

      <Typography.Title level={5} className="mt-2">فیلترهای پیشرفته</Typography.Title>
      <Form
        form={filterForm}
        layout="vertical"
        initialValues={{ form: 'all', field: 'score', condition: 'lt', value: 50, timeUnit: 'future' }}
        onFinish={applyFilter}
      >
        <Space wrap>
          <Form.Item name="form" label="۱. انتخاب فرم">
            <Select style={{ minWidth: 220 }} options={[{ value: 'all', label: 'همه فرم‌ها' }, ...forms.map((f) => ({ value: f, label: f }))]} />
          </Form.Item>

          <Form.Item name="field" label="۲. فیلد">
            <Select style={{ minWidth: 220 }} options={[
              { value: 'score', label: 'امتیاز کلی' },
              { value: 'date', label: 'تاریخ انجام' },
              { value: 'status', label: 'وضعیت' },
            ]} />
          </Form.Item>

          <Form.Item name="condition" label="۳. شرط">
            <Select style={{ minWidth: 180 }} options={[
              { value: 'lt', label: 'کمتر از' },
              { value: 'gt', label: 'بیشتر از' },
              { value: 'eq', label: 'برابر' },
              { value: 'includes', label: 'شامل' },
            ]} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.field !== cur.field || prev.condition !== cur.condition}>
            {({ getFieldValue }) => {
              const field = getFieldValue('field');
              const cond = getFieldValue('condition');
              if (field === 'score' && ['lt', 'gt', 'eq'].includes(cond)) {
                return (
                  <Form.Item name="value" label="۴. مقدار">
                    <InputNumber min={0} max={100} style={{ minWidth: 160 }} />
                  </Form.Item>
                );
              }
              if (field === 'status' && cond === 'includes') {
                return (
                  <Form.Item name="value" label="۴. مقدار">
                    <Select style={{ minWidth: 200 }} options={statuses.map((s) => ({ value: s, label: s }))} />
                  </Form.Item>
                );
              }
              if (field === 'date') {
                return (
                  <Space>
                    <Form.Item name="value" label="۴. مقدار">
                      <InputNumber min={1} max={365} style={{ minWidth: 160 }} />
                    </Form.Item>
                    <Form.Item name="timeUnit" label="واحد زمانی">
                      <Select style={{ minWidth: 160 }} options={[
                        { value: 'future', label: 'روز آینده' },
                        { value: 'past', label: 'روز گذشته' },
                      ]} />
                    </Form.Item>
                  </Space>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">اعمال فیلتر</Button>
          </Form.Item>
        </Space>
      </Form>

      <Typography.Title level={5} className="mt-4">نتایج گزارش (خروجی به صورت جدول داده و نمودار)</Typography.Title>
      <Tabs
        defaultActiveKey="chart"
        items={[
          {
            key: 'chart',
            label: 'نمودار نتایج',
            children: (
              <div style={{ maxWidth: 800 }}>
                <Bar data={chartData} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height={300} />
              </div>
            ),
          },
          {
            key: 'grid',
            label: 'جدول داده‌ها',
            children: (
              <Table columns={columns} dataSource={filtered} pagination={{ pageSize: 8 }} />
            ),
          }
        ]}
      />

      <Typography.Title level={5} className="mt-4">ماژول خروجی (Export Engine)</Typography.Title>
     
      <Space>
        <Select style={{ minWidth: 160 }} defaultValue="excel" options={[{ value: 'excel', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]} />
        <Button>دانلود خروجی</Button>
      </Space>
    </Card>
  );
}