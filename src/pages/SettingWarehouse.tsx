import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import { Plus } from 'lucide-react';

export default function SettingWarehouse() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', contact: '', type: 'domestic' });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getWarehouses();
        setList(res?.list || res || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const domesticList = list.filter((w: any) => w.type === 'domestic' || !w.type);
  const destList = list.filter((w: any) => w.type === 'destination');

  const openCreate = (type: string) => {
    setEditItem(null);
    setForm({ name: '', code: '', address: '', contact: '', type });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name || '', code: item.code || '', address: item.address || '', contact: item.contact || '', type: item.type || 'domestic' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editItem) {
        await api.updateWarehouse(editItem.id, form);
      } else {
        await api.createWarehouse(form);
      }
      setShowModal(false);
      const res = await api.getWarehouses();
      setList(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const renderTable = (items: any[], title: string, type: string) => (
    <div className="card mb-6">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={() => openCreate(type)}>
          <Plus size={14} />新增
        </button>
      </div>
      <div className="card-body p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>仓库名称</th>
              <th>仓库编码</th>
              <th>地址</th>
              <th>联系人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12"><div className="flex flex-col items-center gap-2"><Plus size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-800">{item.name || '-'}</td>
                  <td>{item.code || '-'}</td>
                  <td className="max-w-[200px] truncate">{item.address || '-'}</td>
                  <td>{item.contact || '-'}</td>
                  <td>
                    <button className="link-btn" onClick={() => openEdit(item)}>编辑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">仓库配置</h1>
          <p className="page-desc">管理发货仓和目的仓信息</p>
        </div>
      </div>

      {renderTable(domesticList, '国内仓', 'domestic')}
      {renderTable(destList, '目的地仓', 'destination')}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? '编辑仓库' : '新增仓库'} footer={
        <>
          <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">仓库类型 <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="filter-select w-full">
              <option value="domestic">国内仓</option>
              <option value="destination">目的地仓</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">仓库名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">仓库编码</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">地址</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">联系人</label>
            <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="filter-input w-full" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
