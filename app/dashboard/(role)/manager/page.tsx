// app/dashboard/(role)/manager/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { items, users, borrowRequests, departments } from '@/lib/db/schema';
import { eq, count, and, or } from 'drizzle-orm';
import { Package, FileText, Users, TrendingUp, Building } from 'lucide-react';
import PendingApprovals from './PendingApprovals';

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'manager') {
    redirect('/auth/signin');
  }

  // Get manager's department
  const managerData = await db
    .select({ departmentId: users.departmentId })
    .from(users)
    .where(eq(users.id, session.user.id));
    
  const departmentId = managerData[0]?.departmentId;
  
  if (!departmentId) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manager Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">You are not assigned to any department.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get all users in the manager's department
  const departmentUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.departmentId, departmentId));
    
  const departmentUserIds = departmentUsers.map(user => user.id);

  // Department-specific stats
  const totalDepartmentUsers = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.departmentId, departmentId));
    
  // Pending requests from the department (status: pending_manager)
  const pendingRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.status, 'pending_manager'),
      // Check if the request is from a user in the manager's department
      or(
        // Directly check if the user is in the department
        eq(borrowRequests.userId, session.user.id),
        // For other users in the department, we need to join with users table
        // Since we can't join in count, we'll use a subquery approach
        // This is a simplified approach - in production you might need a more complex query
        // For now, we'll fetch all pending requests and filter on the client side
      )
    ));
    
  // Get all pending requests from the department
  const allPendingRequests = await db
    .select({
      id: borrowRequests.id,
      userId: borrowRequests.userId,
    })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'pending_manager'));
    
  // Filter to only include requests from users in the department
  const departmentPendingRequests = allPendingRequests.filter(req => 
    departmentUserIds.includes(req.userId)
  );
    
  // Active borrows from the department (status: active)
  const allActiveBorrows = await db
    .select({
      id: borrowRequests.id,
      userId: borrowRequests.userId,
    })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, 'active'));
    
  // Filter to only include requests from users in the department
  const departmentActiveBorrows = allActiveBorrows.filter(req => 
    departmentUserIds.includes(req.userId)
  );

  const stats = [
    {
      name: 'Department Users',
      value: totalDepartmentUsers[0].count.toString(),
      icon: Users,
      color: 'text-blue-500',
    },
    {
      name: 'Pending Requests',
      value: departmentPendingRequests.length.toString(),
      icon: FileText,
      color: 'text-amber-500',
    },
    {
      name: 'Active Borrows',
      value: departmentActiveBorrows.length.toString(),
      icon: TrendingUp,
      color: 'text-green-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Manager Dashboard</h1>
      
      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

      {/* Pending Approvals Section - Client Component */}
      <PendingApprovals departmentUserIds={departmentUserIds} />
    </div>
  );
}