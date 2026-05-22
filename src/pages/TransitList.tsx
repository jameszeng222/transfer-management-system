import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { Download, Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

export default function TransitList() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    keyword: '',
    logistics_status: '',
    is_logistics_abnormal: '',
    is_shelve_abnormal: '',
  });

  useEffect(() => {
    load();
  }, [page, filters]);

  const load = async () => {
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
  };

  const exportData = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set('export', 'csv');
    window.open(`/api/transit/list?${params.toString()}`, '_blank');
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const list = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">在途明细</h1>
          <p className="page-desc">在途调拨单SKU明细，可导出给计划部门</p>
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
              placeholder="搜索调拨单号/SKU..."
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
                <th className="w-8"></th>
                <th>业务单号</th>
                <th>第三方入库单</th>
                <th>发货仓→目的仓</th>
                <th>物流商</th>
                <th>物流状态</th>
                <th>提货时间</th>
                <th>预计签收</th>
                <th>物流异常</th>
                <th>上架异常</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-slate-200" />
                      <span className="text-sm text-slate-300">暂无数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((t: any) => {
                  const isExpanded = expandedIds.has(t.id);
                  const skuItems = t.sku_items || [];
                  return (
                    <>
                      <tr key={t.id} className={isExpanded ? 'bg-blue-50/10' : ''}>
                        <td>
                          <button
                            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => toggleExpand(t.id)}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                          </button>
                        </td>
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
                        <td>
                          {t.is_shelve_abnormal ? (
                            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs text-red-500">异常</span></span>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                      </tr>
                      {isExpanded && skuItems.length > 0 && (
                        skuItems.map((item: any, idx: number) => (
                          <tr key={`${t.id}-sku-${idx}`} className="bg-slate-50/50">
                            <td></td>
                            <td colSpan={2} className="text-slate-400 text-[12px]">
                              {idx === 0 && <span className="text-[11px] text-blue-500 font-medium mr-1">SKU</span>}
                            </td>
                            <td className="font-mono text-[12px] text-slate-700">{item.sku}</td>
                            <td className="text-[12px] text-slate-500">×{item.quantity}</td>
                            <td className="text-[12px] text-slate-400">{item.box_no || '-'}</td>
                            <td colSpan={4}></td>
                          </tr>
                        ))
                      )}
                      {isExpanded && skuItems.length === 0 && (
                        <tr key={`${t.id}-no-sku`} className="bg-slate-50/50">
                          <td></td>
                          <td colSpan={9} className="text-[12px] text-slate-400 py-2">暂无SKU明细</td>
                        </tr>
                      )}
                    </>
                  );
                })
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
