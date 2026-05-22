import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import { Plus, Trash2 } from 'lucide-react';

export default function SlaRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ dest_warehouse: '', transport_type: '', sla_days: '' });

  useEffect(() => {
    async function load() {
      try {
        const [rulesRes, whRes] = await Promise.all([
          api.getSlaRules(),
          api.getWarehouses(),
        ]);
        setRules(rulesRes?.list || rulesRes || []);
        setWarehouses(whRes?.list || whRes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ dest_warehouse: '', transport_type: '', sla_days: '' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ dest_warehouse: item.dest_warehouse || '', transport_type: item.transport_type || '', sla_days: String(item.sla_days || '') });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      await api.createSlaRule({ ...form, sla_days: Number(form.sla_days) });
      setShowModal(false);
      const res = await api.getSlaRules();
      setRules(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此规则？')) return;
    try {
      await api.deleteSlaRule(id);
      const res = await api.getSlaRules();
      setRules(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">时效规则配置</h1>
          <p className="page-desc">配置不同目的仓和运输类型的SLA时效</p>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={openCreate}>
          <Plus size={14} />新增规则
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>目的仓</th>
                <th>运输类型</th>
                <th>SLA天数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={4} className="py-12"><div className="flex flex-col items-center gap-2"><Plus size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无规则</span></div></td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="font-medium text-slate-800">{rule.dest_warehouse || '-'}</td>
                    <td>{rule.transport_type || '-'}</td>
                    <td>{rule.sla_days ? `${rule.sla_days}天` : '-'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button className="link-btn" onClick={() => openEdit(rule)}>编辑</button>
                        <button className="link-btn text-red-500" onClick={() => handleDelete(rule.id)}>删除</button>
                      </div>
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
        title={editItem ? '编辑规则' : '新增规则'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleSubmit}>确认</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">目的仓 <span className="text-red-500">*</span></label>
            <select value={form.dest_warehouse} onChange={(e) => setForm({ ...form, dest_warehouse: e.target.value })} className="filter-select w-full">
              <option value="">请选择</option>
              {warehouses.map((wh: any) => (
                <option key={wh.id} value={wh.name}>{wh.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">运输类型 <span className="text-red-500">*</span></label>
            <select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })} className="filter-select w-full">
              <option value="">请选择</option>
              <option value="SEA">海运</option>
              <option value="AIR">空运</option>
              <option value="RAIL">铁路</option>
              <option value="ROAD">陆运</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">SLA天数 <span className="text-red-500">*</span></label>
            <input type="number" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} className="filter-input w-full" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
