import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Truck,
  Ship,
  Package,
  CheckCircle2,
  ClipboardCheck,
  Anchor,
  Warehouse,
  Search,
} from 'lucide-react';

const logisticsNodes = [
  { key: 'PICKED_UP', label: '提货', time_key: 'pickup_time', icon: Truck },
  { key: 'DEPARTED', label: '离港', time_key: 'depart_time', icon: Ship },
  { key: 'ARRIVED_PORT', label: '到港', time_key: 'arrive_port_time', icon: Anchor },
  { key: 'CLEARED', label: '清关', time_key: 'clearance_time', icon: ClipboardCheck },
  { key: 'LAST_MILE', label: '尾程', time_key: 'last_mile_time', icon: Truck },
  { key: 'DELIVERED', label: '签收', time_key: 'delivery_time', icon: Package },
  { key: 'UNLOADED', label: '卸货', time_key: 'unload_time', icon: Warehouse },
  { key: 'SHELVED', label: '上架', time_key: 'shelve_time', icon: CheckCircle2 },
];

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAbnormalModal, setShowAbnormalModal] = useState(false);
  const [showFreightModal, setShowFreightModal] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [abnormalForm, setAbnormalForm] = useState({ logistics_abnormal_type: '', logistics_abnormal_remark: '', shelve_abnormal_type: '', shelve_abnormal_remark: '' });
  const [freightForm, setFreightForm] = useState({ estimated_unit_price: '', estimated_freight: '', box_spec: '', declared_value: '', final_freight: '' });
  const [nodeForm, setNodeForm] = useState({ status: '', actual_time: '' });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getTransfer(Number(id));
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const refresh = async () => {
    const res = await api.getTransfer(Number(id));
    setData(res);
  };

  const handleUpdateAbnormal = async () => {
    try {
      await api.updateAbnormal(Number(id), abnormalForm);
      setShowAbnormalModal(false);
      await refresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleUpdateFreight = async () => {
    try {
      await api.updateFreight(Number(id), freightForm);
      setShowFreightModal(false);
      await refresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleImportNodes = async () => {
    try {
      await api.importLogisticsNodes(Number(id), nodeForm);
      setShowNodeModal(false);
      await refresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleReconcile = async () => {
    try {
      await api.reconcileTransfer(Number(id));
      await refresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handlePay = async () => {
    try {
      await api.payTransfer(Number(id));
      await refresh();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-2 py-16">
        <Search size={40} className="text-slate-200" />
        <span className="text-sm text-slate-300">未找到调拨单</span>
        <button className="link-btn mt-2" onClick={() => navigate('/transfers')}>返回列表</button>
      </div>
    );
  }

  const currentNodeIdx = logisticsNodes.findIndex((n) => n.key === data.logistics_status);
  const nodes = data.logistics_nodes || [];
  const reconcileStatus = data.is_paid ? 'PAID' : data.is_reconciled ? 'RECONCILED' : 'PENDING';
  const hasAbnormal = data.is_logistics_abnormal || data.is_shelve_abnormal;
  const isReconciled = data.is_reconciled;
  const isPaid = data.is_paid;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/transfers')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">调拨单详情</h1>
            <p className="page-desc">{data.biz_order_no || data.transfer_order_no || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasAbnormal && (
            <button className="btn-danger btn-sm" onClick={() => setShowAbnormalModal(true)}>
              <AlertTriangle size={14} />更新异常
            </button>
          )}
          {!isReconciled && (
            <>
              <button className="btn-blue btn-sm" onClick={handleReconcile}>
                <CheckCircle size={14} />确认对账
              </button>
              <button className="btn-success btn-sm" onClick={handlePay}>
                <CreditCard size={14} />确认付款
              </button>
            </>
          )}
          {isReconciled && !isPaid && (
            <button className="btn-success btn-sm" onClick={handlePay}>
              <CreditCard size={14} />确认付款
            </button>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">基本信息</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4">
            {[
              ['调拨业务管理单号', data.biz_order_no],
              ['调拨单号', data.transfer_order_no],
              ['出库单号', data.outbound_order_no],
              ['第三方入库单号', data.third_party_inbound_no],
              ['来源', data.source ? <StatusBadge type="source" value={data.source} /> : '-'],
              ['发货仓', data.origin_warehouse_name],
              ['目的仓', data.dest_warehouse_name],
              ['团队', data.team_name],
              ['品名', data.product_name],
              ['箱数', data.box_count],
              ['计划数量', data.planned_qty],
              ['运输类型', data.transport_type],
              ['物流商', data.carrier_name],
              ['物流商单号', data.carrier_order_no],
              ['是否报关', data.is_customs_declared ? '是' : '否'],
              ['报关工厂', data.customs_factory],
              ['时效要求', data.sla_days ? `${data.sla_days}天` : '-'],
              ['物流状态', data.logistics_status ? <StatusBadge type="logisticsStatus" value={data.logistics_status} /> : '-'],
              ['备注', data.order_remark],
            ].map(([label, value], idx) => (
              <div key={idx}>
                <div className="text-xs text-slate-400 mb-1">{label as string}</div>
                <div className="text-sm font-medium text-slate-800">{value || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">物流节点</h3>
        </div>
        <div className="card-body">
          <div className="flex items-start">
            {logisticsNodes.map((node, idx) => {
              const isCompleted = idx < currentNodeIdx;
              const isCurrent = idx === currentNodeIdx;
              const nodeData = nodes.find((n: any) => n.status === node.key);
              const Icon = node.icon;

              return (
                <div key={node.key} className="flex-1 flex flex-col items-center relative">
                  {idx < logisticsNodes.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      isCompleted ? 'bg-blue-500' :
                      isCurrent ? 'bg-blue-300' :
                      'border-t-2 border-dashed border-slate-200'
                    }`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-blue-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white animate-pulse-blue' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className={`mt-2 text-xs font-medium ${
                    isCompleted ? 'text-blue-600' :
                    isCurrent ? 'text-blue-600' :
                    'text-slate-400'
                  }`}>
                    {node.label}
                  </div>
                  {nodeData?.actual_time && (
                    <div className="mt-1 text-xs text-slate-400">{nodeData.actual_time}</div>
                  )}
                  {nodeData?.sla_deadline && (
                    <div className="mt-0.5 text-xs text-slate-300">要求: {nodeData.sla_deadline}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {data.sku_items && data.sku_items.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">SKU明细</h3>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>数量</th>
                  <th>箱号</th>
                </tr>
              </thead>
              <tbody>
                {data.sku_items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="font-medium text-slate-800">{item.sku || '-'}</td>
                    <td>{item.quantity ?? '-'}</td>
                    <td>{item.box_no ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">运费信息</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">预估单价</div>
                <div className="text-sm font-medium text-slate-800">{data.estimated_unit_price ? `¥${data.estimated_unit_price}` : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">预估运费</div>
                <div className="text-sm font-medium text-slate-800">{data.estimated_freight ? `¥${data.estimated_freight}` : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">箱规</div>
                <div className="text-sm font-medium text-slate-800">{data.box_spec || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">申报货值</div>
                <div className="text-sm font-medium text-slate-800">{data.declared_value ? `¥${data.declared_value}` : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">最终运费</div>
                <div className="text-sm font-semibold text-blue-600">{data.final_freight ? `¥${data.final_freight}` : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">对账状态</div>
                <div className="text-sm font-medium"><StatusBadge type="reconcileStatus" value={reconcileStatus} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">异常信息</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">物流异常</div>
                {data.logistics_abnormal_type ? (
                  <div className="flex items-center gap-2">
                    <StatusBadge type="abnormalType" value={data.logistics_abnormal_type} />
                    <span className="text-sm text-slate-600">{data.logistics_abnormal_remark || ''}</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">无</span>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">上架异常</div>
                {data.shelve_abnormal_type ? (
                  <div className="flex items-center gap-2">
                    <StatusBadge type="abnormalType" value={data.shelve_abnormal_type} />
                    <span className="text-sm text-slate-600">{data.shelve_abnormal_remark || ''}</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">无</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.operation_logs && data.operation_logs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">操作日志</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {data.operation_logs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    {idx < data.operation_logs.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm text-slate-700">{log.action || log.content}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{log.operator || ''} {log.created_at || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showAbnormalModal} onClose={() => setShowAbnormalModal(false)} title="更新异常信息" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowAbnormalModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleUpdateAbnormal}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">物流异常类型</label>
            <select value={abnormalForm.logistics_abnormal_type} onChange={(e) => setAbnormalForm({ ...abnormalForm, logistics_abnormal_type: e.target.value })} className="filter-select w-full">
              <option value="">无</option>
              <option value="LOGISTICS_DELAY">延误</option>
              <option value="LOGISTICS_LOST">丢失</option>
              <option value="LOGISTICS_DAMAGED">货损</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">物流异常备注</label>
            <textarea value={abnormalForm.logistics_abnormal_remark} onChange={(e) => setAbnormalForm({ ...abnormalForm, logistics_abnormal_remark: e.target.value })} className="filter-input w-full h-20 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">上架异常类型</label>
            <select value={abnormalForm.shelve_abnormal_type} onChange={(e) => setAbnormalForm({ ...abnormalForm, shelve_abnormal_type: e.target.value })} className="filter-select w-full">
              <option value="">无</option>
              <option value="SHELVING_SHORTAGE">上架短缺</option>
              <option value="SHELVING_WRONG">上架错误</option>
              <option value="SHELVING_DAMAGED">上架破损</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">上架异常备注</label>
            <textarea value={abnormalForm.shelve_abnormal_remark} onChange={(e) => setAbnormalForm({ ...abnormalForm, shelve_abnormal_remark: e.target.value })} className="filter-input w-full h-20 resize-none" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showFreightModal} onClose={() => setShowFreightModal(false)} title="更新运费信息" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowFreightModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleUpdateFreight}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">预估单价</label>
            <input type="number" value={freightForm.estimated_unit_price} onChange={(e) => setFreightForm({ ...freightForm, estimated_unit_price: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">预估运费</label>
            <input type="number" value={freightForm.estimated_freight} onChange={(e) => setFreightForm({ ...freightForm, estimated_freight: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">箱规</label>
            <input type="text" value={freightForm.box_spec} onChange={(e) => setFreightForm({ ...freightForm, box_spec: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">申报货值</label>
            <input type="number" value={freightForm.declared_value} onChange={(e) => setFreightForm({ ...freightForm, declared_value: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">最终运费</label>
            <input type="number" value={freightForm.final_freight} onChange={(e) => setFreightForm({ ...freightForm, final_freight: e.target.value })} className="filter-input w-full" />
          </div>
        </div>
      </Modal>

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
