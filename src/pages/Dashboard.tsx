import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Truck,
  AlertTriangle,
  PackageCheck,
  CheckCircle,
  DollarSign,
  Target,
  TrendingUp,
  AlertCircle,
  Search,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

interface DashboardData {
  stats: {
    total_transfers: number;
    in_transit: number;
    logistics_abnormal: number;
    shelve_abnormal: number;
    completed: number;
    total_estimated_freight: number;
    total_final_freight: number;
  };
  logistics_status_distribution: { status: string; count: number }[];
  source_distribution: { source: string; count: number }[];
  abnormal_distribution: { type: string; count: number }[];
  recent_abnormals: {
    id: number;
    biz_order_no: string;
    logistics_abnormal_type: string;
    logistics_abnormal_remark: string;
    origin_warehouse_name: string;
    dest_warehouse_name: string;
  }[];
  freight_overview: { estimated: number; actual: number; deviation: number };
  sla_compliance: { on_time: number; overdue: number; rate: number };
}

const sourceColors: Record<string, string> = {
  API_WANYITONG: 'bg-blue-500',
  API_AMAZON: 'bg-orange-500',
  MANUAL: 'bg-slate-400',
  OTHER: 'bg-purple-500',
};

const abnormalColors: Record<string, string> = {
  DELAY: 'bg-amber-500',
  OVERDUE: 'bg-red-500',
  DAMAGED: 'bg-orange-500',
  LOST: 'bg-red-600',
  QUANTITY_MISMATCH: 'bg-pink-500',
  LOGISTICS_DELAY: 'bg-amber-500',
  LOGISTICS_LOST: 'bg-red-600',
  LOGISTICS_DAMAGED: 'bg-orange-500',
  SHELVING_SHORTAGE: 'bg-amber-500',
  SHELVING_WRONG: 'bg-red-500',
  SHELVING_DAMAGED: 'bg-orange-500',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getDashboard();
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

  const s = data?.stats;
  const stats = [
    { icon: FileText, label: '总调拨单', value: s?.total_transfers ?? 0, iconBg: 'bg-[#EFF6FF]', iconColor: 'text-blue-500' },
    { icon: Truck, label: '在途单数', value: s?.in_transit ?? 0, iconBg: 'bg-[#EEF2FF]', iconColor: 'text-indigo-500' },
    { icon: AlertTriangle, label: '物流异常', value: s?.logistics_abnormal ?? 0, iconBg: 'bg-[#FFFBEB]', iconColor: 'text-amber-500' },
    { icon: PackageCheck, label: '上架异常', value: s?.shelve_abnormal ?? 0, iconBg: 'bg-[#FFF7ED]', iconColor: 'text-orange-500' },
    { icon: CheckCircle, label: '已完成', value: s?.completed ?? 0, iconBg: 'bg-[#ECFDF5]', iconColor: 'text-emerald-500' },
    { icon: DollarSign, label: '预估运费', value: `¥${(s?.total_estimated_freight ?? 0).toLocaleString()}`, iconBg: 'bg-[#F0FDFA]', iconColor: 'text-teal-500' },
    { icon: Target, label: 'SLA达标率', value: `${data?.sla_compliance?.rate ?? 0}%`, iconBg: 'bg-[#F5F3FF]', iconColor: 'text-violet-500' },
  ];

  const totalLogistics = data?.logistics_status_distribution?.reduce((acc, i) => acc + i.count, 0) || 1;
  const totalAbnormal = data?.abnormal_distribution?.reduce((acc, i) => acc + i.count, 0) || 1;
  const slaRate = data?.sla_compliance?.rate ?? 0;
  const slaBarColor = slaRate >= 90 ? 'bg-indigo-500' : slaRate >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">数据看板</h1>
          <p className="page-desc">调拨运营关键指标总览</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {stats.slice(0, 4).map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
                <div className="min-w-0">
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.slice(4).map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${(i + 4) * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
                <div className="min-w-0">
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">物流状态分布</h3>
          </div>
          <div className="card-body space-y-3">
            {data?.logistics_status_distribution?.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <StatusBadge type="logisticsStatus" value={item.status} />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(item.count / totalLogistics) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">来源分布</h3>
          </div>
          <div className="card-body space-y-3">
            {data?.source_distribution?.map((item) => (
              <div key={item.source} className="flex items-center gap-3">
                <StatusBadge type="source" value={item.source} />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sourceColors[item.source] || 'bg-slate-400'} rounded-full`}
                    style={{ width: `${(item.count / (s?.total_transfers || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">异常分布</h3>
          </div>
          <div className="card-body space-y-3">
            {data?.abnormal_distribution?.map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <StatusBadge type="abnormalType" value={item.type} />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${abnormalColors[item.type] || 'bg-amber-500'} rounded-full`}
                    style={{ width: `${(item.count / totalAbnormal) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-12 text-right">{item.count}</span>
              </div>
            ))}
            {(!data?.abnormal_distribution || data.abnormal_distribution.length === 0) && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Search size={40} className="text-slate-200" />
                <span className="text-sm text-slate-300">暂无异常</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">SLA达标情况</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600">达标 {data?.sla_compliance?.on_time ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-600">延误 {data?.sla_compliance?.overdue ?? 0}</span>
                  </div>
                </div>
                <div className="h-6 bg-slate-50 rounded-lg overflow-hidden flex">
                  <div
                    className={`h-full ${slaBarColor} rounded-l-lg`}
                    style={{ width: `${slaRate}%` }}
                  />
                  <div
                    className="h-full bg-red-500 rounded-r-lg"
                    style={{ width: `${100 - slaRate}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>达标率 {slaRate}%</span>
                  <span>共 {((data?.sla_compliance?.on_time ?? 0) + (data?.sla_compliance?.overdue ?? 0))} 单</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">最近异常</h3>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="card-body p-0">
            {data?.recent_abnormals?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>调拨单</th>
                    <th>异常类型</th>
                    <th>备注</th>
                    <th>路线</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_abnormals.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-slate-800">{item.biz_order_no}</td>
                      <td><StatusBadge type="abnormalType" value={item.logistics_abnormal_type} /></td>
                      <td className="text-slate-500 max-w-[200px] truncate">{item.logistics_abnormal_remark || '-'}</td>
                      <td className="text-slate-400">{item.origin_warehouse_name} → {item.dest_warehouse_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12">
                <Search size={40} className="text-slate-200" />
                <span className="text-sm text-slate-300">暂无异常记录</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">运费概览</h3>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-16">预估</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${data?.freight_overview?.estimated ? 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">¥{(data?.freight_overview?.estimated ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-16">实际</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${data?.freight_overview?.estimated ? ((data.freight_overview.actual / data.freight_overview.estimated) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">¥{(data?.freight_overview?.actual ?? 0).toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">偏差</span>
                  <span className={data?.freight_overview?.deviation && data.freight_overview.deviation < 0 ? 'text-red-500 font-medium' : 'text-emerald-600 font-medium'}>
                    {data?.freight_overview?.deviation && data.freight_overview.deviation < 0 ? '' : '+'}¥{(data?.freight_overview?.deviation ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
