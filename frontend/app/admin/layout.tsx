import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const AdminSidebar = dynamic(() => import('@/components/admin/AdminSidebar'), {
  ssr: true
});

const AdminHeader = dynamic(() => import('@/components/admin/AdminHeader'), {
  ssr: true
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Suspense fallback={<div className="h-16 bg-white border-b"></div>}>
        <AdminHeader />
      </Suspense>

      {/* Sidebar */}
      <Suspense fallback={<div className="fixed left-0 w-64 h-screen bg-white"></div>}>
        <AdminSidebar />
      </Suspense>

      {/* Main Content */}
      <main className="lg:ml-64 pt-6">
        <div className="px-6 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

