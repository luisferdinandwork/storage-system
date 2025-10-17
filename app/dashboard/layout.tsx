import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
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
  const user = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);
  
  if (!user.length) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className='sticky'>
        <Sidebar userRole={user[0].role} />
      </div>
      <main className="flex-1 lg:ml-0 overflow-auto">
        <div className="mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}