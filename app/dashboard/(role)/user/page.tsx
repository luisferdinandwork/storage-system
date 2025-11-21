// app/dashboard/(role)/user/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { items, users, borrowRequests, itemStock, borrowRequestItems } from '@/lib/db/schema';
import { eq, count, and, or, gte, lte, desc } from 'drizzle-orm';
import { Package, FileText, TrendingUp, Clock, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function UserDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'user') {
    redirect('/auth/signin');
  }

  // User-specific stats
  const userItems = await db
    .select({ count: count() })
    .from(items)
    .where(eq(items.createdBy, session.user.id));
    
  const pendingRequests = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.userId, session.user.id),
      or(
        eq(borrowRequests.status, 'pending_manager'),
        eq(borrowRequests.status, 'pending_storage')
      )
    ));
    
  const activeBorrows = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.userId, session.user.id),
      eq(borrowRequests.status, 'active')
    ));
    
  const completedBorrows = await db
    .select({ count: count() })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.userId, session.user.id),
      eq(borrowRequests.status, 'complete')
    ));

  const stats = [
    {
      name: 'My Items',
      value: userItems[0].count.toString(),
      icon: Package,
      color: 'text-primary-500',
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
    {
      name: 'Completed Borrows',
      value: completedBorrows[0].count.toString(),
      icon: Clock,
      color: 'text-blue-500',
    },
  ];

  // Get almost overdue borrow requests (within 3 days of end date)
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const almostOverdueRequests = await db
    .select({
      id: borrowRequests.id,
      startDate: borrowRequests.startDate,
      endDate: borrowRequests.endDate,
      status: borrowRequests.status,
      reason: borrowRequests.reason,
    })
    .from(borrowRequests)
    .where(and(
      eq(borrowRequests.userId, session.user.id),
      eq(borrowRequests.status, 'active'),
      lte(borrowRequests.endDate, threeDaysFromNow)
    ))
    .orderBy(desc(borrowRequests.endDate))
    .limit(5);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">User Dashboard</h1>
      
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

      {/* Almost Overdue Requests Card - Full Width */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Almost Overdue Requests
          </CardTitle>
          <CardDescription>
            Your active borrow requests ending within 3 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {almostOverdueRequests.length > 0 ? (
            <div className="space-y-4">
              {almostOverdueRequests.map((request) => {
                const daysLeft = Math.ceil(
                  (new Date(request.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">Request #{request.id}</h3>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{request.reason}</p>
                      </div>
                      <Badge variant={daysLeft <= 1 ? "destructive" : "outline"}>
                        {daysLeft <= 0 ? "Overdue" : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Ends: {format(new Date(request.endDate), 'MMM dd, yyyy')}</span>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/borrow-requests/${request.id}`}>View Details</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/borrow-requests/${request.id}/return`}>Return Items</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/borrow-requests?status=active">View All Active Requests</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Almost Overdue Requests</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                All your active borrow requests are in good standing. Keep up the great work!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}