import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api/client';
import { Shell } from './components/Shell';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StageQueueView } from './views/StageQueueView';
import { AdminConfigView } from './views/AdminConfigView';
import { NewRequisitionModal } from './views/NewRequisitionModal';
import { StageActionModal, getPaymentFormUrl } from './views/StageActionModal';
import { exportRequisitionsCsv } from './utils/csvExport';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Keep data fresh in memory for 60 seconds
      refetchOnWindowFocus: false, // Prevent redundant API spam when switching browser windows
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function MainApp() {
  const [user, setUser] = useState(api.user);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeFilter, setActiveFilter] = useState(null); // { stage: 'approval', status: 'PENDING' }

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [stageActionState, setStageActionState] = useState({
    isOpen: false,
    requisition: null,
    stageType: null,
  });

  const qc = useQueryClient();

  useEffect(() => {
    const unsub = api.subscribe((auth) => {
      setUser(auth.user);
      if (!auth.user) {
        // Clear all query cache on logout to prevent data leaking
        qc.clear();
      }
    });
    return unsub;
  }, [qc]);

  // Fetch Requisitions with TanStack Query (keyed by user id and role)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['requisitions', user?.id, user?.role],
    queryFn: () => api.getRequisitions(),
    enabled: !!user,
  });

  // Handle SSE live delta updates by invalidating TanStack Query cache
  const handleLiveSyncEvent = () => {
    qc.invalidateQueries({ queryKey: ['requisitions'] });
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleOpenStageAction = (requisition, stageType) => {
    if (stageType === 'PAYMENT') {
      const paymentFormUrl = getPaymentFormUrl(requisition);
      if (paymentFormUrl) {
        window.open(paymentFormUrl, '_blank', 'noopener,noreferrer');
      }
    }
    setStageActionState({
      isOpen: true,
      requisition,
      stageType,
    });
  };

  const requisitions = data?.data || [];
  const counters = data?.counters || null;

  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <Shell
      user={user}
      onLogout={handleLogout}
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setCurrentTab(tab);
        setActiveFilter(null);
      }}
      onOpenNewRequisition={() => setIsNewModalOpen(true)}
      onExportCsv={currentTab === 'admin' ? undefined : () => exportRequisitionsCsv(
        requisitions,
        `Requisitions_${currentTab}`,
        '',
        currentTab === 'dashboard'
          ? { view: 'dashboard' }
          : { view: 'stage', stageType: currentTab === 'history' ? 'ALL' : currentTab.toUpperCase() }
      )}
      counters={counters}
    >
      {/* Tab Content */}
      {currentTab === 'dashboard' && (
        <DashboardView
          requisitions={requisitions}
          counters={counters}
          activeFilter={activeFilter}
          onSelectFilter={(filter) => setActiveFilter(filter)}
          onOpenStageAction={handleOpenStageAction}
          onOpenNewRequisition={() => setIsNewModalOpen(true)}
          onOpenSettings={() => setCurrentTab('admin')}
          onSelectTab={(tab) => setCurrentTab(tab)}
          user={user}
        />
      )}

      {currentTab === 'approval' && (
        <StageQueueView
          stageType="APPROVAL"
          title="Management Approval Queue"
          description="  "
          requisitions={requisitions}
          onOpenStageAction={handleOpenStageAction}
          user={user}
        />
      )}

      {currentTab === 'posting' && (
        <StageQueueView
          stageType="POSTING"
          title="Accounting Posting Queue"
          description="  "
          requisitions={requisitions}
          onOpenStageAction={handleOpenStageAction}
          user={user}
        />
      )}

      {currentTab === 'payment' && (
        <StageQueueView
          stageType="PAYMENT"
          title="Payment Processing Queue"
          description="  "
          requisitions={requisitions}
          onOpenStageAction={handleOpenStageAction}
          user={user}
        />
      )}

      {currentTab === 'audit' && (
        <StageQueueView
          stageType="AUDIT"
          title="Payment Audit Queue"
          description="  "
          requisitions={requisitions}
          onOpenStageAction={handleOpenStageAction}
          user={user}
        />
      )}

      {currentTab === 'history' && (
        <StageQueueView
          stageType="ALL"
          title="Requisition History & Complete Archive"
          description="  "
          requisitions={requisitions}
          onOpenStageAction={handleOpenStageAction}
          user={user}
        />
      )}

      {currentTab === 'admin' && <AdminConfigView user={user} />}

      {/* New Requisition Modal */}
      <NewRequisitionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['requisitions'] });
        }}
      />

      {/* Stage Action Modal */}
      <StageActionModal
        isOpen={stageActionState.isOpen}
        onClose={() => setStageActionState({ isOpen: false, requisition: null, stageType: null })}
        requisition={stageActionState.requisition}
        stageType={stageActionState.stageType}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['requisitions'] });
        }}
        user={user}
      />
    </Shell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
