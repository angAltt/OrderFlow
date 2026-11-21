import AuthGuard from '@/components/layout/AuthGuard';
import AppShell from '@/components/layout/AppShell';

// Route group for the private pages: every page inside needs a session.
export default function PrivateLayout({ children }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
