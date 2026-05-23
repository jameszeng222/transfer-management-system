import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Search, X, ChevronLeft, ChevronRight, Package, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DR: { label: '草稿', color: 'bg-slate-50 text-slate-500' },
  OD: { label: '已下单', color: 'bg-blue-50 text-blue-600' },
  RE: { label: '已收货', color: 'bg-indigo-50 text-indigo-600' },
  TS: { label: '运输中', color: 'bg-purple-50 text-purple-600' },
  PEWC: { label: '部分到仓', color: 'bg-amber-50 text-amber-600' },
  EWC: { label: '已到仓', color: 'bg-orange-50 text-orange-600' },
  SHD: { label: '已上架', color: 'bg-emerald-50 text-emerald-600' },
  STOP: { label: '终止', color: 'bg-red-50 text-red-600' },
};

const PKG_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UD: { label: '已卸货', color: 'bg-orange-50 text-orange-600' },
  SHD: { label: '已上架', color: 'bg-emerald-50 text-emerald-600' },
  SA: { label: '上架异常区', color: 'bg-red-50 text-red-600' },
  STOP: { label: '终止', color: 'bg-red-50 text-red-700' },
  LOST: { label: '丢失', color: 'bg-red-50 text-red-700' },
};

export default function WinitInbound() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', warehouse: '', orderNo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (filters.status) params.set('status', filters.status);
      if (filters.warehouse) params.set('warehouse', filters.warehouse);
      if (filters.orderNo) params.set('orderNo', filters.orderNo);
      const res = await api.getWinitInboundOrders(`?${params.toString()}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWinitInbound();
      alert(`同步完成，共同步 ${res.synced ?? 0} 条入库单`);
      await load();
    } catch (e: any) {
      alert(e.message || '同步失败，请检查万邑通API凭证配置');
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpand = async (orderNo: string) => {
    const next = new Set(expandedOrders);
    if (next.has(orderNo)) {
      next.delete(orderNo);
      setExpandedOrders(next);
      return;
    }
    next.add(orderNo);
    setExpandedOrders(next);

    if (!orderDetails[orderNo]) {
      setDetailLoading(new Set([...detailLoading, orderNo]));
      try {
        const detail = await api.getWinitInboundOrderDetail(orderNo);
        setOrderDetails((prev) => ({ ...prev, [orderNo]: detail }));
      } catch (e) {
        console.error(e);
      } finally {
        setDetailLoading((prev) => { const next = new Set(prev); next.delete(orderNo); return next; });
      }
    }
  };

  const orders = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const stats = {
    total: orders.length,
    shelved: orders.filter((o: any) => o.status === 'SHD').length,
    inWarehouse: orders.filter((o: any) => ['EWC', 'PEWC'].includes(o.status)).length,
    abnormal: orders.filter((o: any) => o.status === 'STOP').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">入库单上架情况</h1>
          <p className="page-desc">万邑通入库单上架追踪</p>
        </div>
        <button
          className={`btn-primary btn-sm flex items-center gap-1.5 ${syncing ? 'opacity-60 pointer-events-none' : ''}`}
          onClick={handleSync}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? '同步中...' : '同步万邑通数据'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Package, label: '入库单总数', value: total, iconBg: 'bg-[#EEF2FF]', iconColor: 'text-indigo-500' },
          { icon: CheckCircle, label: '已上架', value: stats.shelved, iconBg: 'bg-[#ECFDF5]', iconColor: 'text-emerald-500' },
          { icon: Clock, label: '待上架', value: stats.inWarehouse, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-blue-500' },
          { icon: AlertTriangle, label: '异常/终止', value: stats.abnormal, iconBg: 'bg-[#FFFBEB]', iconColor: 'text-amber-500' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
                <div>
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">入库单列表</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9 w-48"
                placeholder="搜索单号..."
                value={filters.orderNo}
                onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && load()}
              />
            </div>
            <button className="btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <Search size={14} />筛选
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 pb-4 flex items-center gap-3">
            <select
              className="input-field w-36"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">全部状态</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              className="input-field w-40"
              placeholder="目的仓..."
              value={filters.warehouse}
              onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
            />
            <button className="btn-primary btn-sm" onClick={() => { setPage(1); load(); }}>查询</button>
            <button className="btn-secondary btn-sm" onClick={() => { setFilters({ status: '', warehouse: '', orderNo: '' }); setPage(1); }}>
              <X size={14} />重置
            </button>
          </div>
        )}

        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>万邑通单号</th>
                <th>客户订单号</th>
                <th>目的仓</th>
                <th>状态</th>
                <th>总包裹数</th>
                <th>总商品数</th>
                <th>是否完结</th>
                <th>下单时间</th>
                <th>目标上架时间</th>
                <th>实际上架时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={40} className="text-slate-200" />
                      <span className="text-sm text-slate-300">暂无数据，请先同步万邑通数据</span>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  const isExpanded = expandedOrders.has(order.order_no);
                  const detail = orderDetails[order.order_no];
                  const isLoadingDetail = detailLoading.has(order.order_no);
                  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'slate' };
                  const packages = detail?.packages || [];
                  const merchandise = detail?.merchandise || [];

                  return (
                    <>
                      <tr key={order.order_no} className="cursor-pointer hover:bg-slate-50/50" onClick={() => toggleExpand(order.order_no)}>
                        <td>
                          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRightIcon size={14} className="text-slate-400" />}
                        </td>
                        <td className="font-medium text-slate-800">{order.order_no}</td>
                        <td className="text-slate-500">{order.seller_order_no || '-'}</td>
                        <td className="text-slate-600">{order.destination_warehouse_name || '-'}</td>
                        <td>
                          <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                        </td>
                        <td>{order.total_package_qty ?? '-'}</td>
                        <td>{order.total_merchandise_qty ?? '-'}</td>
                        <td>
                          {order.is_completed === 'Y' ? (
                            <span className="text-emerald-600 text-xs font-medium">已完结</span>
                          ) : (
                            <span className="text-slate-400 text-xs">进行中</span>
                          )}
                        </td>
                        <td className="text-slate-500 text-xs">{order.created_date || '-'}</td>
                        <td className="text-slate-500 text-xs">{order.plan_shelf_completed_date || '-'}</td>
                        <td className="text-slate-500 text-xs">{order.shelve_completed_date || '-'}</td>
                      </tr>

                      {isExpanded && isLoadingDetail && (
                        <tr className="bg-slate-50/50">
                          <td></td>
                          <td colSpan={10} className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              加载详情...
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded && detail && (
                        <>
                          {packages.length > 0 && (
                            <tr className="bg-slate-50/50">
                              <td></td>
                              <td colSpan={10} className="px-6 py-3">
                                <div className="text-xs font-medium text-slate-500 mb-2">包裹上架明细</div>
                                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">包裹条码</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">卖家箱号</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">状态</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">尺寸(长×宽×高cm)</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">重量(kg)</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">卸货时间</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">上架时间</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {packages.map((pkg: any) => {
                                      const pkgStatus = PKG_STATUS_MAP[pkg.status] || { label: pkg.status, color: 'slate' };
                                      return (
                                        <tr key={pkg.package_no} className="border-t border-slate-100">
                                          <td className="px-3 py-2 font-mono text-slate-700">{pkg.package_no}</td>
                                          <td className="px-3 py-2 text-slate-600">{pkg.seller_case_no || '-'}</td>
                                          <td className="px-3 py-2">
                                            <span className={`badge ${pkgStatus.color}`}>{pkgStatus.label}</span>
                                          </td>
                                          <td className="px-3 py-2 text-slate-600">
                                            {pkg.length && pkg.width && pkg.height ? `${pkg.length}×${pkg.width}×${pkg.height}` : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-slate-600">{pkg.weight || '-'}</td>
                                          <td className="px-3 py-2 text-slate-500">{pkg.unloading_time || '-'}</td>
                                          <td className="px-3 py-2 text-slate-500">{pkg.shelves_time || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}

                          {merchandise.length > 0 && (
                            <tr className="bg-slate-50/50">
                              <td></td>
                              <td colSpan={10} className="px-6 py-3">
                                <div className="text-xs font-medium text-slate-500 mb-2">SKU上架明细</div>
                                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">SKU</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">商品编码</th>
                                      <th className="px-3 py-2 text-left text-slate-500 font-medium">规格</th>
                                      <th className="px-3 py-2 text-right text-slate-500 font-medium">下单数量</th>
                                      <th className="px-3 py-2 text-right text-slate-500 font-medium">验货数量</th>
                                      <th className="px-3 py-2 text-right text-slate-500 font-medium">上架数量</th>
                                      <th className="px-3 py-2 text-right text-slate-500 font-medium">上架率</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {merchandise.map((m: any, idx: number) => {
                                      const qty = m.quantity || 0;
                                      const actual = m.actual_quantity || 0;
                                      const rate = qty > 0 ? Math.round((actual / qty) * 100) : 0;
                                      const rateColor = rate >= 100 ? 'text-emerald-600' : rate > 0 ? 'text-amber-600' : 'text-red-500';
                                      return (
                                        <tr key={idx} className="border-t border-slate-100">
                                          <td className="px-3 py-2 font-mono text-blue-600">{m.sku || '-'}</td>
                                          <td className="px-3 py-2 text-slate-600">{m.merchandise_code || '-'}</td>
                                          <td className="px-3 py-2 text-slate-500">{m.specification || '-'}</td>
                                          <td className="px-3 py-2 text-right text-slate-700">{qty}</td>
                                          <td className="px-3 py-2 text-right text-slate-700">{m.inspection_qty || 0}</td>
                                          <td className="px-3 py-2 text-right font-medium text-slate-800">{actual}</td>
                                          <td className={`px-3 py-2 text-right font-medium ${rateColor}`}>
                                            {rate}%
                                            {rate < 100 && rate > 0 && <span className="ml-1 text-[10px] text-amber-500">差异{qty - actual}</span>}
                                            {rate === 0 && qty > 0 && <span className="ml-1 text-[10px] text-red-400">未上架</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <span className="text-xs text-slate-400">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-600">{page} / {totalPages}</span>
              <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
