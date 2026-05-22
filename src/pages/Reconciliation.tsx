import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { Search, CheckCircle, CreditCard, X } from 'lucide-react';

export default function Reconciliation() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    is_reconciled: '',
    is_paid: '',
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });
        const res = await api.getTransfers(params.toString());
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  const list = data?.transfers || data?.list || [];

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((t: any) => t.id));
    }
  };

  const getReconcileStatus = (t: any) => {
    if (t.is_paid) return 'PAID';
    if (t.is_reconciled) return 'RECONCILED';
    return 'PENDING';
  };

  const reloadData = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await api.getTransfers(params.toString());
    setData(res);
  };

  const batchReconcile = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => api.reconcileTransfer(id)));
      setSelectedIds([]);
      await reloadData();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const batchPay = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => api.payTransfer(id)));
      setSelectedIds([]);
      await reloadData();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleReconcile = async (id: number) => {
    try {
      await api.reconcileTransfer(id);
      await reloadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePay = async (id: number) => {
    try {
      await api.payTransfer(id);
      await reloadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">对账管理</h1>
          <p className="page-desc">调拨单运费对账与付款管理</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-blue btn-sm flex items-center gap-1" onClick={batchReconcile} disabled={selectedIds.length === 0}>
            <CheckCircle size={14} />批量对账 ({selectedIds.length})
          </button>
          <button className="btn-success btn-sm flex items-center gap-1" onClick={batchPay} disabled={selectedIds.length === 0}>
            <CreditCard size={14} />批量付款 ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="flex items-center gap-3">
          <select value={filters.is_reconciled} onChange={(e) => setFilters({ ...filters, is_reconciled: e.target.value })} className="filter-select">
            <option value="">是否已对账</option>
            <option value="1">已对账</option>
            <option value="0">未对账</option>
          </select>
          <select value={filters.is_paid} onChange={(e) => setFilters({ ...filters, is_paid: e.target.value })} className="filter-select">
            <option value="">是否已付款</option>
            <option value="1">已付款</option>
            <option value="0">未付款</option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button className="link-btn text-xs text-red-500" onClick={() => setFilters({ is_reconciled: '', is_paid: '' })}>
              <X size={12} className="inline" /> 清除
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" checked={selectedIds.length === list.length && list.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                </th>
                <th>调拨单号</th>
                <th>物流商</th>
                <th>预估运费</th>
                <th>最终运费</th>
                <th>对账状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="py-12"><div className="flex flex-col items-center gap-2"><Search size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
              ) : (
                list.map((t: any) => {
                  const rs = getReconcileStatus(t);
                  return (
                    <tr key={t.id} className={selectedIds.includes(t.id) ? 'selected' : ''}>
                      <td>
                        <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="rounded border-slate-300" />
                      </td>
                      <td className="font-medium text-slate-800">
                        <button className="link-btn font-medium" onClick={() => navigate(`/transfers/${t.id}`)}>
                          {t.transfer_order_no || t.biz_order_no || '-'}
                        </button>
                      </td>
                      <td>{t.carrier_name || '-'}</td>
                      <td>{t.estimated_freight ? `¥${t.estimated_freight}` : '-'}</td>
                      <td className="font-medium text-slate-800">{t.final_freight ? `¥${t.final_freight}` : '-'}</td>
                      <td><StatusBadge type="reconcileStatus" value={rs} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          {rs === 'PENDING' && (
                            <button className="link-btn" onClick={() => handleReconcile(t.id)}>确认对账</button>
                          )}
                          {rs === 'RECONCILED' && (
                            <button className="link-btn" onClick={() => handlePay(t.id)}>确认付款</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
