import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { Download, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TransitList() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    keyword: '',
    logistics_status: '',
    is_logistics_abnormal: '',
    is_shelve_abnormal: '',
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', '20');
        Object.entries(filters).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });
        const res = await api.getTransitList(params.toString());
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, filters]);

  const exportData = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set('export', 'csv');
    window.open(`/api/transit/list?${params.toString()}`, '_blank');
  };

  const list = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">在途明细</h1>
          <p className="page-desc">在途调拨单明细，可导出给计划部门</p>
        </div>
        <button className="btn-secondary btn-sm flex items-center gap-1.5" onClick={exportData}>
          <Download size={14} />导出
        </button>
      </div>

      <div className="filter-bar">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索调拨单号/第三方入库单号..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="filter-input w-full pl-9"
            />
          </div>
          <select value={filters.logistics_status} onChange={(e) => setFilters({ ...filters, logistics_status: e.target.value })} className="filter-select">
            <option value="">全部状态</option>
            <option value="PENDING">待提货</option>
            <option value="PICKED_UP">已提货</option>
            <option value="DEPARTED">已离港</option>
            <option value="ARRIVED_PORT">已到港</option>
            <option value="CLEARED">已清关</option>
            <option value="LAST_MILE">尾程派送</option>
            <option value="DELIVERED">已签收</option>
            <option value="UNLOADED">已卸货</option>
          </select>
          <select value={filters.is_logistics_abnormal} onChange={(e) => setFilters({ ...filters, is_logistics_abnormal: e.target.value })} className="filter-select">
            <option value="">物流异常</option>
            <option value="1">有异常</option>
            <option value="0">无异常</option>
          </select>
          <select value={filters.is_shelve_abnormal} onChange={(e) => setFilters({ ...filters, is_shelve_abnormal: e.target.value })} className="filter-select">
            <option value="">上架异常</option>
            <option value="1">有异常</option>
            <option value="0">无异常</option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button className="link-btn text-xs text-red-500" onClick={() => setFilters({ keyword: '', logistics_status: '', is_logistics_abnormal: '', is_shelve_abnormal: '' })}>
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
                <th>调拨单</th>
                <th>第三方入库单号</th>
                <th>发货仓→目的仓</th>
                <th>物流商</th>
                <th>物流状态</th>
                <th>提货时间</th>
                <th>预计签收</th>
                <th>物流异常</th>
                <th>物流异常备注</th>
                <th>上架异常</th>
                <th>上架异常备注</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-slate-200" />
                      <span className="text-sm text-slate-300">暂无数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-medium text-slate-800">{t.biz_order_no || '-'}</td>
                    <td>{t.third_party_inbound_no || '-'}</td>
                    <td>
                      <span className="text-slate-700">{t.origin_warehouse_name || '-'}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="text-slate-700">{t.dest_warehouse_name || '-'}</span>
                    </td>
                    <td>{t.carrier_name || '-'}</td>
                    <td><StatusBadge type="logisticsStatus" value={t.logistics_status} /></td>
                    <td className="text-slate-500">{t.pickup_time || '-'}</td>
                    <td className="text-slate-500">{t.estimated_delivery || '-'}</td>
                    <td>
                      {t.is_logistics_abnormal ? (
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-red-500">异常</span></span>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </td>
                    <td className="text-slate-500 max-w-[150px] truncate">{t.logistics_abnormal_remark || '-'}</td>
                    <td>
                      {t.is_shelve_abnormal ? (
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-red-500">异常</span></span>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </td>
                    <td className="text-slate-500 max-w-[150px] truncate">{t.shelve_abnormal_remark || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-700">{page} / {totalPages}</span>
              <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
