'use client';

import { useState } from 'react';
import AppShell, { type AppPage } from '@/components/AppShell';
import DashboardPage from '@/components/pages/DashboardPage';
import WholesalersPage, { WholesalerDetailPage } from '@/components/pages/WholesalersPage';
import PurchasesPage from '@/components/pages/PurchasesPage';
import ReturnsPage from '@/components/pages/ReturnsPage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [currentDetail, setCurrentDetail] = useState<string | undefined>();

  const handleNavigate = (page: string, detail?: string) => {
    setCurrentPage(page as AppPage);
    setCurrentDetail(detail);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'wholesalers':
        return <WholesalersPage onNavigate={handleNavigate} />;
      case 'wholesaler-detail':
        return currentDetail ? <WholesalerDetailPage wholesalerId={currentDetail} onNavigate={handleNavigate} /> : null;
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
      case 'wholesaler-detail': return 'Wholesaler Details';
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
