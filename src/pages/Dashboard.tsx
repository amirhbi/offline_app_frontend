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
      
      
    </Card>
  );
}