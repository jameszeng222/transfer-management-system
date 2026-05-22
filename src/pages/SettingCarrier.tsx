import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import { Plus } from 'lucide-react';

export default function SettingCarrier() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', contact: '', phone: '', api_type: '' });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getCarriers();
        setList(res?.list || res || []);
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
    setForm({ name: '', code: '', contact: '', phone: '', api_type: '' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name || '', code: item.code || '', contact: item.contact || '', phone: item.phone || '', api_type: item.api_type || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editItem) {
        await api.updateCarrier(editItem.id, form);
      } else {
        await api.createCarrier(form);
      }
      setShowModal(false);
      const res = await api.getCarriers();
      setList(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`确定删除物流商「${item.name}」吗？`)) return;
    try {
      await api.deleteCarrier(item.id);
      const res = await api.getCarriers();
      setList(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">物流商管理</h1>
          <p className="page-desc">管理物流商信息和API对接</p>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={openCreate}>
          <Plus size={14} />新增物流商
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>物流商名称</th>
                <th>编码</th>
                <th>联系人</th>
                <th>电话</th>
                <th>API类型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">加载中...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} className="py-12"><div className="flex flex-col items-center gap-2"><Plus size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-800">{item.name || '-'}</td>
                    <td>{item.code || '-'}</td>
                    <td>{item.contact || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td>{item.api_type || '-'}</td>
                    <td>
                      <button className="link-btn" onClick={() => openEdit(item)}>编辑</button>
                      <button className="link-btn text-red-500 ml-2" onClick={() => handleDelete(item)}>删除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? '编辑物流商' : '新增物流商'} footer={
        <>
          <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">物流商名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">编码</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">联系人</label>
            <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">电话</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">API类型</label>
            <select value={form.api_type} onChange={(e) => setForm({ ...form, api_type: e.target.value })} className="filter-select w-full">
              <option value="">无</option>
              <option value="WANYITONG">万邑通</option>
              <option value="AMAZON">亚马逊</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
