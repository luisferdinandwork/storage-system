import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { items, borrowRequests, users } from '@/lib/db/schema';
import { eq, and, count, isNull, or } from 'drizzle-orm'; // Import 'or' from drizzle-orm
import { Package, FileText, Users, TrendingUp } from 'lucide-react';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // Get counts for dashboard
  const totalItems = await db.select({ count: count() }).from(items);
  const totalUsers = await db.select({ count: count() }).from(users);
  
  // Fix: Count both pending_manager and pending_storage statuses
  const pendingRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(or(
      eq(borrowRequests.status, 'pending_manager'),
      eq(borrowRequests.status, 'pending_storage')
    ));
  
  const activeBorrows = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.status, 'approved'),
      isNull(borrowRequests)
    ));

  const stats = [
    {
      name: 'Total Items',
      value: totalItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
    },
    {
      name: 'Total Users',
      value: totalUsers[0].count.toString(),
      icon: Users,
      color: 'text-blue-500',
    },
    {
      name: 'Pending Requests',
      value: pendingRequests[0].count.toString(),
      icon: FileText,
      color: 'text-amber-500',
    },
    {
      name: 'Active Borrows',
      value: activeBorrows[0].count.toString(),
      icon: TrendingUp,
      color: 'text-green-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest borrow requests and item updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Activity feed will be implemented here.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Overview of system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">System status will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}