// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // Redirect to role-specific dashboard
  const userRole = session.user.role;
  
  switch (userRole) {
    case 'superadmin':
      redirect('/dashboard/superadmin');
    case 'manager':
      redirect('/dashboard/manager');
    case 'item-master':
      redirect('/dashboard/item-master');
    case 'storage-master':
      redirect('/dashboard/storage-master');
    case 'storage-master-manager':
      redirect('/dashboard/storage-master-manager');
    default: // 'user' role
      redirect('/dashboard/user');
  }
}