import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Upload, Download, Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

export default function TransferList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    keyword: '',
    source: '',
    logistics_status: '',
    carrier: '',
    from_warehouse: '',
    to_warehouse: '',
    team: '',
    has_abnormal: '',
    start_date: '',
    end_date: '',
  });
  const [showFilters, setShowFilters] = useState(false);

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
        const res = await api.getTransfers(params.toString());
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, filters]);

  const resetFilters = () => {
    setFilters({ keyword: '', source: '', logistics_status: '', carrier: '', from_warehouse: '', to_warehouse: '', team: '', has_abnormal: '', start_date: '', end_date: '' });
    setPage(1);
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set('export', 'csv');
    window.open(`/api/transfers?${params.toString()}`, '_blank');
  };

  const transfers = data?.list || data?.transfers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">调拨单列表</h1>
          <p className="page-desc">整合线上线下所有调拨单</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={exportCsv}>
            <Download size={14} />导出CSV
          </button>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/transfers/create')}>
            <Upload size={14} />批量导入
          </button>
          <button className="btn-primary btn-sm" onClick={() => navigate('/transfers/create')}>
            <Plus size={14} />创建调拨单
          </button>
        </div>
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
          <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="filter-select">
            <option value="">全部来源</option>
            <option value="API_WANYITONG">万邑通</option>
            <option value="API_AMAZON">亚马逊</option>
            <option value="MANUAL">手工</option>
            <option value="OTHER">其他</option>
          </select>
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
            <option value="SHELVED">已上架</option>
          </select>
          <select value={filters.has_abnormal} onChange={(e) => setFilters({ ...filters, has_abnormal: e.target.value })} className="filter-select">
            <option value="">是否异常</option>
            <option value="1">有异常</option>
            <option value="0">无异常</option>
          </select>
          <button className="link-btn text-xs flex items-center gap-1" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={12} />{showFilters ? '收起' : '更多筛选'}
          </button>
          {Object.values(filters).some(Boolean) && (
            <button className="link-btn text-xs text-red-500 flex items-center gap-1" onClick={resetFilters}>
              <X size={12} />清除
            </button>
          )}
        </div>
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <input type="text" placeholder="物流商" value={filters.carrier} onChange={(e) => setFilters({ ...filters, carrier: e.target.value })} className="filter-input w-32" />
            <input type="text" placeholder="发货仓" value={filters.from_warehouse} onChange={(e) => setFilters({ ...filters, from_warehouse: e.target.value })} className="filter-input w-32" />
            <input type="text" placeholder="目的仓" value={filters.to_warehouse} onChange={(e) => setFilters({ ...filters, to_warehouse: e.target.value })} className="filter-input w-32" />
            <input type="text" placeholder="团队" value={filters.team} onChange={(e) => setFilters({ ...filters, team: e.target.value })} className="filter-input w-32" />
            <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="filter-input w-36" />
            <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="filter-input w-36" />
          </div>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>调拨单号</th>
                <th>第三方入库单</th>
                <th>发货仓→目的仓</th>
                <th>团队</th>
                <th>品名</th>
                <th>箱数</th>
                <th>计划数量</th>
                <th>来源</th>
                <th>物流状态</th>
                <th>异常</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-slate-200" />
                      <span className="text-sm text-slate-300">暂无数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <button className="link-btn font-medium" onClick={() => navigate(`/transfers/${t.id}`)}>
                        {t.transfer_order_no || t.biz_order_no || '-'}
                      </button>
                    </td>
                    <td>{t.third_party_inbound_no || '-'}</td>
                    <td>
                      <span className="text-slate-700">{t.origin_warehouse_name || '-'}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="text-slate-700">{t.dest_warehouse_name || '-'}</span>
                    </td>
                    <td>{t.team_name || '-'}</td>
                    <td className="max-w-[120px] truncate">{t.product_name || '-'}</td>
                    <td>{t.box_count ?? '-'}</td>
                    <td>{t.planned_qty ?? '-'}</td>
                    <td><StatusBadge type="source" value={t.source} /></td>
                    <td><StatusBadge type="logisticsStatus" value={t.logistics_status} /></td>
                    <td>
                      {t.is_logistics_abnormal || t.is_shelve_abnormal ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs text-red-500">异常</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td>
                      <button className="link-btn" onClick={() => navigate(`/transfers/${t.id}`)}>查看</button>
                    </td>
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
              <button
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-700">{page} / {totalPages}</span>
              <button
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
