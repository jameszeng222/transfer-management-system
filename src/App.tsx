import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import TransferList from '@/pages/TransferList';
import TransferCreate from '@/pages/TransferCreate';
import TransferDetail from '@/pages/TransferDetail';
import TransferImport from '@/pages/TransferImport';
import TransitOverview from '@/pages/TransitOverview';
import TransitList from '@/pages/TransitList';
import TransitAbnormal from '@/pages/TransitAbnormal';
import Tracking from '@/pages/Tracking';
import SlaRules from '@/pages/SlaRules';
import FreightOverview from '@/pages/FreightOverview';
import Reconciliation from '@/pages/Reconciliation';
import SettingWarehouse from '@/pages/SettingWarehouse';
import SettingCarrier from '@/pages/SettingCarrier';
import SettingTeam from '@/pages/SettingTeam';
import SettingUser from '@/pages/SettingUser';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transfers" element={<TransferList />} />
          <Route path="/transfers/create" element={<TransferCreate />} />
          <Route path="/transfers/:id" element={<TransferDetail />} />
          <Route path="/transfers/import" element={<TransferImport />} />
          <Route path="/transit/overview" element={<TransitOverview />} />
          <Route path="/transit/list" element={<TransitList />} />
          <Route path="/transit/abnormal" element={<TransitAbnormal />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/tracking/sla" element={<SlaRules />} />
          <Route path="/freight/overview" element={<FreightOverview />} />
          <Route path="/freight/reconciliation" element={<Reconciliation />} />
          <Route path="/settings/warehouses" element={<SettingWarehouse />} />
          <Route path="/settings/carriers" element={<SettingCarrier />} />
          <Route path="/settings/teams" element={<SettingTeam />} />
          <Route path="/settings/users" element={<SettingUser />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
