import { useState } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import {
  Search,
  Upload,
  CheckCircle2,
  Truck,
  Ship,
  MapPin,
  CheckCircle,
  Package,
} from 'lucide-react';

const logisticsNodes = [
  { key: 'PICKED_UP', label: '提货', icon: Truck },
  { key: 'DEPARTED', label: '离港', icon: Ship },
  { key: 'ARRIVED_PORT', label: '到港', icon: MapPin },
  { key: 'CLEARED', label: '清关', icon: CheckCircle },
  { key: 'LAST_MILE', label: '尾程', icon: Truck },
  { key: 'DELIVERED', label: '签收', icon: Package },
  { key: 'UNLOADED', label: '卸货', icon: Package },
  { key: 'SHELVED', label: '上架', icon: CheckCircle2 },
];

export default function Tracking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeForm, setNodeForm] = useState({ status: '', actual_time: '' });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.getTransfers(`keyword=${encodeURIComponent(searchQuery)}`);
      const list = res?.transfers || res?.list || [];
      if (list.length > 0) {
        const detail = await api.getTransfer(list[0].id);
        setData(detail);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImportNodes = async () => {
    if (!data) return;
    try {
      await api.importLogisticsNodes(data.id, nodeForm);
      setShowNodeModal(false);
      const detail = await api.getTransfer(data.id);
      setData(detail);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const currentNodeIdx = data ? logisticsNodes.findIndex((n) => n.key === data.logistics_status) : -1;
  const nodes = data?.logistics_nodes || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">物流节点追踪</h1>
          <p className="page-desc">按调拨单号/第三方入库单号/物流商单号搜索追踪</p>
        </div>
      </div>

      <div className="filter-bar mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="输入调拨单号/第三方入库单号/物流商单号"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="filter-input w-full pl-9"
            />
          </div>
          <button className="btn-primary btn-sm" onClick={handleSearch}>搜索</button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !data && (
        <div className="card">
          <div className="card-body text-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Search size={40} className="text-slate-200" />
              <span className="text-sm text-slate-300">请输入单号进行搜索</span>
            </div>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="card mb-6 border-l-4 border-l-blue-500">
            <div className="card-header flex items-center justify-between">
              <h3 className="card-title">调拨单信息</h3>
              <button className="btn-blue btn-sm flex items-center gap-1" onClick={() => setShowNodeModal(true)}>
                <Upload size={14} />批量导入物流节点
              </button>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-4">
                <div><div className="text-xs text-slate-400 mb-1">调拨业务管理单号</div><div className="text-sm font-medium text-slate-800">{data.biz_order_no || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">调拨单号</div><div className="text-sm font-medium text-slate-800">{data.transfer_order_no || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">第三方入库单号</div><div className="text-sm font-medium text-slate-800">{data.third_party_inbound_no || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">物流商单号</div><div className="text-sm font-medium text-slate-800">{data.carrier_order_no || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">发货仓→目的仓</div><div className="text-sm font-medium text-slate-800">{data.origin_warehouse_name || '-'} → {data.dest_warehouse_name || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">物流商</div><div className="text-sm font-medium text-slate-800">{data.carrier_name || '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">物流状态</div><div>{data.logistics_status ? <StatusBadge type="logisticsStatus" value={data.logistics_status} /> : '-'}</div></div>
                <div><div className="text-xs text-slate-400 mb-1">时效要求</div><div className="text-sm font-medium text-slate-800">{data.sla_days ? `${data.sla_days}天` : '-'}</div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">物流节点时间轴</h3>
            </div>
            <div className="card-body">
              <div className="space-y-0">
                {logisticsNodes.map((node, idx) => {
                  const isCompleted = idx < currentNodeIdx;
                  const isCurrent = idx === currentNodeIdx;
                  const nodeData = nodes.find((n: any) => n.status === node.key);
                  const Icon = node.icon;

                  return (
                    <div key={node.key} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-blue-500 text-white' :
                          isCurrent ? 'bg-blue-500 text-white animate-pulse-blue' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          <Icon size={16} />
                        </div>
                        {idx < logisticsNodes.length - 1 && (
                          <div className={`w-0.5 h-12 ${isCompleted ? 'bg-blue-500' : 'border-l-2 border-dashed border-slate-200'}`} />
                        )}
                      </div>
                      <div className="pb-8">
                        <div className={`text-sm font-medium ${
                          isCompleted ? 'text-blue-600' :
                          isCurrent ? 'text-blue-600' :
                          'text-slate-400'
                        }`}>
                          {node.label}
                        </div>
                        {nodeData?.actual_time && (
                          <div className="text-xs text-slate-500 mt-0.5">{nodeData.actual_time}</div>
                        )}
                        {nodeData?.sla_deadline && (
                          <div className="text-xs text-slate-400 mt-0.5">要求: {nodeData.sla_deadline}</div>
                        )}
                        {!nodeData?.actual_time && !isCurrent && !isCompleted && (
                          <div className="text-xs text-slate-300 mt-0.5">待完成</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={showNodeModal} onClose={() => setShowNodeModal(false)} title="导入物流节点" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowNodeModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleImportNodes}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">节点状态</label>
            <select value={nodeForm.status} onChange={(e) => setNodeForm({ ...nodeForm, status: e.target.value })} className="filter-select w-full">
              <option value="">请选择</option>
              {logisticsNodes.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">实际时间</label>
            <input type="datetime-local" value={nodeForm.actual_time} onChange={(e) => setNodeForm({ ...nodeForm, actual_time: e.target.value })} className="filter-input w-full" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
