import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { AlertTriangle, PackageCheck } from 'lucide-react';

export default function TransitAbnormal() {
  const navigate = useNavigate();
  const [logisticsData, setLogisticsData] = useState<any[]>([]);
  const [shelvingData, setShelvingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'logistics' | 'shelving'>('logistics');
  const [showModal, setShowModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [logRes, shelRes] = await Promise.all([
          api.getTransitAbnormal('type=logistics'),
          api.getTransitAbnormal('type=shelving'),
        ]);
        setLogisticsData(logRes?.list || logRes || []);
        setShelvingData(shelRes?.list || shelRes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const data = tab === 'logistics' ? logisticsData : shelvingData;

  const handleProcess = async () => {
    if (!currentItem) return;
    try {
      await api.updateAbnormal(currentItem.id, {
        ...(tab === 'logistics'
          ? { logistics_abnormal_remark: remark }
          : { shelve_abnormal_remark: remark }),
      });
      setShowModal(false);
      setRemark('');
      const res = await api.getTransitAbnormal(tab === 'logistics' ? 'type=logistics' : 'type=shelving');
      if (tab === 'logistics') {
        setLogisticsData(res?.list || res || []);
      } else {
        setShelvingData(res?.list || res || []);
      }
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">异常处理</h1>
          <p className="page-desc">处理物流异常和上架异常</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <div className="stat-label">物流异常数</div>
              <div className="stat-value">{logisticsData.length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
              <PackageCheck size={18} className="text-orange-500" />
            </div>
            <div>
              <div className="stat-label">上架异常数</div>
              <div className="stat-value">{shelvingData.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b-0 pb-0">
          <div className="flex gap-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'logistics' ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setTab('logistics')}
            >
              物流异常
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'shelving' ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setTab('shelving')}
            >
              上架异常
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>调拨单号</th>
                <th>第三方入库单</th>
                <th>异常类型</th>
                <th>异常备注</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-12"><div className="flex flex-col items-center gap-2"><AlertTriangle size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无异常</span></div></td></tr>
              ) : (
                data.map((item: any) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-800">
                      <button className="link-btn font-medium" onClick={() => navigate(`/transfers/${item.id}`)}>
                        {item.transfer_order_no || item.biz_order_no || '-'}
                      </button>
                    </td>
                    <td>{item.third_party_inbound_no || '-'}</td>
                    <td>
                      <StatusBadge type="abnormalType" value={tab === 'logistics' ? item.logistics_abnormal_type : item.shelve_abnormal_type} />
                    </td>
                    <td className="text-slate-500 max-w-[200px] truncate">
                      {tab === 'logistics' ? (item.logistics_abnormal_remark || '-') : (item.shelve_abnormal_remark || '-')}
                    </td>
                    <td className="text-slate-400">{item.created_at || '-'}</td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => { setCurrentItem(item); setRemark(''); setShowModal(true); }}
                      >
                        处理
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="处理异常"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleProcess}>确认</button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">异常备注</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="filter-input w-full h-24 resize-none"
            placeholder="请填写处理备注..."
          />
        </div>
      </Modal>
    </div>
  );
}
