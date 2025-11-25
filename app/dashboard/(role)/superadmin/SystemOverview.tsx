// app/dashboard/(role)/superadmin/SystemOverview.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Package, Archive, FileText, TrendingUp, Clock, Boxes, Users, Building, MapPin, Loader2, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SystemOverviewData {
  approvedItems: number;
  rejectedItems: number;
  lowStockItems: number;
  seededItems: number;
  clearanceItems: number;
  pendingClearanceForms: number;
  recentMovements: number;
  stockDistribution: {
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    performedBy: string;
  }>;
  userStats: Array<{
    role: string;
    count: number;
  }>;
  departmentStats: Array<{
    name: string;
    count: number;
  }>;
  locationStats: Array<{
    name: string;
    boxCount: number;
    itemCount: number;
  }>;
}

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#6b7280'];

export default function SystemOverview() {
  const [data, setData] = useState<SystemOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/system-overview');
        
        if (!response.ok) {
          throw new Error('Gagal memuat data ringkasan sistem');
        }
        
        const overviewData: SystemOverviewData = await response.json();
        setData(overviewData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours}j yang lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}h yang lalu`;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Memuat ringkasan sistem...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <XCircle className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Kesalahan memuat data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const stockDistributionData = [
    { name: 'In Storage', value: data?.stockDistribution?.inStorage || 0, color: COLORS[0] },
    { name: 'On Borrow', value: data?.stockDistribution?.onBorrow || 0, color: COLORS[1] },
    { name: 'In Clearance', value: data?.stockDistribution?.inClearance || 0, color: COLORS[2] },
    { name: 'Seeded', value: data?.stockDistribution?.seeded || 0, color: COLORS[3] },
    { name: 'Pending', value: data?.stockDistribution?.pending || 0, color: COLORS[4] },
  ].filter(item => item.value > 0);

  const totalStock = stockDistributionData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalStock > 0 ? Math.round((data.value / totalStock) * 100) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">Kuantitas: <span className="font-medium">{data.value}</span></p>
          <p className="text-sm text-gray-600">Persentase: <span className="font-medium">{percentage}%</span></p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={14}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-gray-5">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" className="gap-2">
          <Activity className="h-4 w-4" />
          Segarkan Data
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Distribution Pie Chart */}
        <Card className="shadow-md h-full">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              Distribusi Stok
            </CardTitle>
            <CardDescription>
              Distribusi item saat ini dalam berbagai kondisi
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {totalStock > 0 ? (
              <div className="flex flex-col h-full justify-between">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stockDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-auto pt-4 border-t bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Item</span>
                    <Badge variant="default" className="text-lg px-4 py-1">{totalStock.toLocaleString('id-ID')}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Boxes className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">Tidak ada data stok tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="shadow-md h-full col-span-2">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Aktivitas Terkini
            </CardTitle>
            <CardDescription>
              Aktivitas terbaru di seluruh sistem
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 h-full flex flex-col">
              {data?.recentActivities?.length ? (
                <>
                  <div className="flex-grow overflow-y-auto max-h-96">
                    {data.recentActivities.map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className="flex items-start justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 mb-2"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            index === 0 ? 'bg-green-500' : 
                            index === 1 ? 'bg-blue-500' : 
                            'bg-gray-400'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                              <span className="text-xs text-gray-500">{formatDate(activity.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1 font-medium">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">oleh {activity.performedBy || 'Sistem'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <Button variant="outline" className="w-full">Lihat Semua Aktivitas</Button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
                  <Clock className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium">Tidak ada aktivitas terkini</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}