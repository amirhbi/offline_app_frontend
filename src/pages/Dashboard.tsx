import React from 'react';
import { Typography, Card, Progress } from 'antd';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

export default function Dashboard() {
  return (
    <Card className="border border-red-300">
      <Typography.Title level={4} className="text-red-600">
          داشبورد سراسری
      </Typography.Title>
      <Typography.Paragraph>
        نمایش آمارهای کلیدی و تجمیعی از تمام زیربخش‌ها و بخش‌های سامانه.
      </Typography.Paragraph>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <Typography.Text className="block mb-2">نمودار میله‌ای (Chart.js)</Typography.Text>
          <div style={{ height: 160 }}>
            <Bar
              data={{
                labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
                datasets: [
                  { label: 'فرم‌ها', data: [12, 19, 7, 15, 9, 12], backgroundColor: '#1677ff' },
                  { label: 'گزارش‌ها', data: [8, 11, 5, 9, 7, 10], backgroundColor: '#69b1ff' },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>

        {/* Line chart */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <Typography.Text className="block mb-2">نمودار خطی (Chart.js)</Typography.Text>
          <div style={{ height: 160 }}>
            <Line
              data={{
                labels: ['هفته ۱', 'هفته ۲', 'هفته ۳', 'هفته ۴', 'هفته ۵', 'هفته ۶'],
                datasets: [
                  {
                    label: 'روند تکمیل',
                    data: [35, 42, 40, 55, 60, 68],
                    borderColor: '#52c41a',
                    backgroundColor: 'rgba(82,196,26,0.2)',
                    tension: 0.3,
                    fill: true,
                  },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>

        {/* Doughnut + progress */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <Typography.Text className="block mb-2">شاخص‌های کلیدی</Typography.Text>
          <div className="grid grid-cols-2 gap-4 items-center" style={{ height: 160 }}>
            <Doughnut
              data={{
                labels: ['تکمیل', 'باقی‌مانده'],
                datasets: [
                  { data: [68, 32], backgroundColor: ['#1677ff', '#e5e7eb'], borderWidth: 1 },
                ],
              }}
              options={{ cutout: '70%', plugins: { legend: { display: false } }, maintainAspectRatio: false }}
            />
            <div className="text-center">
              <Progress type="circle" percent={68} size={80} />
              <div className="mt-2 text-xs text-gray-600">پیشرفت کل</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}