// app/dashboard/(role)/superadmin/SystemOverview.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, Package, Archive, FileText, TrendingUp, Clock, Database } from 'lucide-react';
import Link from 'next/link';

interface SystemOverviewProps {
  approvedItems: number;
  rejectedItems: number;
  lowStockItems: number;
  seededItems: number;
  clearanceItems: number;
  pendingClearanceForms: number;
  recentMovements: number;
}

export default function SystemOverview({
  approvedItems,
  rejectedItems,
  lowStockItems,
  seededItems,
  clearanceItems,
  pendingClearanceForms,
  recentMovements
}: SystemOverviewProps) {
  const itemStats = [
    { name: 'Approved Items', value: approvedItems, icon: CheckCircle, color: 'text-green-500' },
    { name: 'Rejected Items', value: rejectedItems, icon: XCircle, color: 'text-red-500' },
    { name: 'Low Stock Items', value: lowStockItems, icon: AlertTriangle, color: 'text-amber-500' },
  ];

  const specialStats = [
    { name: 'Seeded Items', value: seededItems, icon: Package, color: 'text-purple-500' },
    { name: 'Clearance Items', value: clearanceItems, icon: Archive, color: 'text-orange-500' },
    { name: 'Pending Clearance Forms', value: pendingClearanceForms, icon: FileText, color: 'text-blue-500' },
    { name: 'Recent Movements (7d)', value: recentMovements, icon: TrendingUp, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {itemStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {specialStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              System Health
            </CardTitle>
            <CardDescription>
              Overview of system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Database Status</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>API Response Time</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">&lt; 200ms</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Storage Utilization</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Normal</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>System Uptime</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">99.9%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system-wide activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span>System backup completed</span>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  <span>New user registration</span>
                </div>
                <span className="text-sm text-gray-500">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                  <span>Low stock alert triggered</span>
                </div>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  <span>Clearance form approved</span>
                </div>
                <span className="text-sm text-gray-500">2 days ago</span>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">View All Activity</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}