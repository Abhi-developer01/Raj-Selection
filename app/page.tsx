'use client';

import { useState } from 'react';
import AppShell, { type AppPage } from '@/components/AppShell';
import DashboardPage from '@/components/pages/DashboardPage';
import WholesalersPage from '@/components/pages/WholesalersPage';
import PurchasesPage from '@/components/pages/PurchasesPage';
import ReturnsPage from '@/components/pages/ReturnsPage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');

  const handleNavigate = (page: string, detail?: string) => {
    setCurrentPage(page as AppPage);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'wholesalers':
        return <WholesalersPage onNavigate={handleNavigate} />;
      case 'purchases':
        return <PurchasesPage />;
      case 'returns':
        return <ReturnsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Dashboard';
      case 'wholesalers': return 'Wholesalers';
      case 'purchases': return 'Purchases';
      case 'returns': return 'Returns';
      default: return 'Dashboard';
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={handleNavigate}
      pageTitle={getPageTitle()}
    >
      {renderPage()}
    </AppShell>
  );
}
