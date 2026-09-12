// src/pages/dashboard/DashboardTabs.jsx
import React, { lazy, Suspense } from 'react';

// Lazy load tabs for better performance
const ContinueLearningTab = lazy(() => import('./ContinueLearningTab'));
const MyCoursesTab = lazy(() => import('./MyCoursesTab'));
const EventsTab = lazy(() => import('./EventsTab'));
const CertificatesTab = lazy(() => import('./CertificatesTab'));
const ExploreTab = lazy(() => import('./ExploreTab'));
const MyInvoicesTab = lazy(() => import('./MyInvoicesTab'));
const GstReportTab = lazy(() => import('./GstReportTab'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <div className="loading-spinner"></div>
  </div>
);

export default function DashboardTabs({ 
  activeTab, 
  ...props 
}) {
  const tabComponents = {
    continue: ContinueLearningTab,
    courses: MyCoursesTab,
    events: EventsTab,
    certs: CertificatesTab,
    invoices: MyInvoicesTab,
    gst_report: GstReportTab,
    explore: ExploreTab,
  };

  const TabComponent = tabComponents[activeTab] || ContinueLearningTab;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <TabComponent {...props} />
    </Suspense>
  );
}