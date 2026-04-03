import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background">
      <Header />
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
