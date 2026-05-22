import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { Truck, Box, AlertTriangle, PackageCheck } from 'lucide-react';

export default function TransitOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getTransitOverview();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { icon: Truck, label: '在途单数', value: data?.in_transit_count ?? 0, iconBg: 'bg-[#EEF2FF]', iconColor: 'text-indigo-500' },
    { icon: Box, label: '在途箱数', value: data?.in_transit_boxes ?? 0, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-blue-500' },
    { icon: AlertTriangle, label: '物流异常', value: data?.logistics_abnormal_count ?? 0, iconBg: 'bg-[#FFFBEB]', iconColor: 'text-amber-500' },
    { icon: PackageCheck, label: '上架异常', value: data?.shelve_abnormal_count ?? 0, iconBg: 'bg-[#FFF7ED]', iconColor: 'text-orange-500' },
  ];

  const distribution = data?.status_distribution || [];
  const byWarehouse = data?.by_warehouse || [];
  const byCarrier = data?.by_carrier || [];
  const totalCount = data?.in_transit_count || 1;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">在途总览</h1>
          <p className="page-desc">在途调拨单汇总统计</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => {
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

      {distribution.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">物流状态分布</h3>
          </div>
          <div className="card-body space-y-3">
            {distribution.map((item: any) => (
              <div key={item.status} className="flex items-center gap-3">
                <StatusBadge type="logisticsStatus" value={item.status} />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(item.count / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">按目的仓统计</h3>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>目的仓</th>
                  <th>在途单数</th>
                  <th>在途箱数</th>
                </tr>
              </thead>
              <tbody>
                {byWarehouse.length === 0 ? (
                  <tr><td colSpan={3} className="py-12"><div className="flex flex-col items-center gap-2"><Box size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
                ) : (
                  byWarehouse.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-800">{item.warehouse || '-'}</td>
                      <td>{item.count ?? 0}</td>
                      <td>{item.boxes ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">按物流商统计</h3>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>物流商</th>
                  <th>在途单数</th>
                  <th>在途箱数</th>
                </tr>
              </thead>
              <tbody>
                {byCarrier.length === 0 ? (
                  <tr><td colSpan={3} className="py-12"><div className="flex flex-col items-center gap-2"><Truck size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
                ) : (
                  byCarrier.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-800">{item.carrier || '-'}</td>
                      <td>{item.count ?? 0}</td>
                      <td>{item.boxes ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
