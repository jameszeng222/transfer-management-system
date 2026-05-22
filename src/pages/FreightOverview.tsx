import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function FreightOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getTransfers();
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

  const list = data?.transfers || data?.list || [];

  const estimatedTotal = list.reduce((sum: number, t: any) => sum + (Number(t.estimated_freight) || 0), 0);
  const finalTotal = list.reduce((sum: number, t: any) => sum + (Number(t.final_freight) || 0), 0);
  const deviation = estimatedTotal > 0 ? ((finalTotal - estimatedTotal) / estimatedTotal * 100).toFixed(1) : '0';

  const carrierMap: Record<string, { estimated: number; final: number }> = {};
  list.forEach((t: any) => {
    const carrier = t.carrier_name || '未知';
    if (!carrierMap[carrier]) carrierMap[carrier] = { estimated: 0, final: 0 };
    carrierMap[carrier].estimated += Number(t.estimated_freight) || 0;
    carrierMap[carrier].final += Number(t.final_freight) || 0;
  });
  const carrierStats = Object.entries(carrierMap).map(([carrier, val]) => ({
    carrier,
    estimated_freight: val.estimated,
    final_freight: val.final,
    deviation: val.estimated > 0 ? ((val.final - val.estimated) / val.estimated * 100).toFixed(1) : '0',
  }));

  const stats = [
    { icon: DollarSign, label: '预估运费总额', value: `¥${estimatedTotal.toLocaleString()}`, iconBg: 'bg-[#F0FDFA]', iconColor: 'text-teal-500' },
    { icon: TrendingUp, label: '最终运费总额', value: `¥${finalTotal.toLocaleString()}`, iconBg: 'bg-[#ECFDF5]', iconColor: 'text-emerald-500' },
    { icon: Number(deviation) > 0 ? TrendingUp : TrendingDown, label: '偏差率', value: `${deviation}%`, iconBg: Number(deviation) > 0 ? 'bg-[#FEF2F2]' : 'bg-[#ECFDF5]', iconColor: Number(deviation) > 0 ? 'text-red-500' : 'text-emerald-500', valueColor: Number(deviation) > 0 ? 'text-red-500' : 'text-emerald-600' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">运费概览</h1>
          <p className="page-desc">运费统计与偏差分析</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
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
                  <div className={`stat-value ${(stat as any).valueColor || ''}`}>{stat.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">按物流商运费统计</h3>
        </div>
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>物流商</th>
                <th>预估运费</th>
                <th>最终运费</th>
                <th>偏差</th>
              </tr>
            </thead>
            <tbody>
              {carrierStats.length === 0 ? (
                <tr><td colSpan={4} className="py-12"><div className="flex flex-col items-center gap-2"><DollarSign size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
              ) : (
                carrierStats.map((item) => (
                  <tr key={item.carrier}>
                    <td className="font-medium text-slate-800">{item.carrier}</td>
                    <td>¥{item.estimated_freight.toLocaleString()}</td>
                    <td>¥{item.final_freight.toLocaleString()}</td>
                    <td className={Number(item.deviation) > 0 ? 'text-red-500' : 'text-emerald-600'}>
                      {item.deviation}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
