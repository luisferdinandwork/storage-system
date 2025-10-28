import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SidebarWrapper } from '@/components/dashboard/sidebar-wrapper';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  // Get user details including role
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  
  if (!user.length) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SidebarWrapper userRole={user[0].role} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}