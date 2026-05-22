import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import { Plus } from 'lucide-react';

const WAREHOUSE_TYPES = [
  { value: 'DOMESTIC', label: '国内仓' },
  { value: 'FBA', label: 'FBA仓' },
  { value: 'OVERSEAS', label: '海外仓' },
];

export default function SettingWarehouse() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', contact: '', phone: '', country: '', type: 'DOMESTIC' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.getWarehouses();
      setList(res?.list || res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const domesticList = list.filter((w: any) => w.type === 'DOMESTIC');
  const fbaList = list.filter((w: any) => w.type === 'FBA');
  const overseasList = list.filter((w: any) => w.type === 'OVERSEAS');

  const openCreate = (type: string) => {
    setEditItem(null);
    setForm({ name: '', code: '', address: '', contact: '', phone: '', country: '', type });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      code: item.code || '',
      address: item.address || '',
      contact: item.contact || '',
      phone: item.phone || '',
      country: item.country || '',
      type: item.type || 'DOMESTIC',
    });
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
      await load();
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`确定删除仓库「${item.name}」吗？`)) return;
    try {
      await api.deleteWarehouse(item.id);
      await load();
    } catch (e: any) {
      alert(e.message || '删除失败');
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
              <th>国家</th>
              <th>地址</th>
              <th>联系人</th>
              <th>电话</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-12"><div className="flex flex-col items-center gap-2"><Plus size={40} className="text-slate-200" /><span className="text-sm text-slate-300">暂无数据</span></div></td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-800">{item.name || '-'}</td>
                  <td>{item.code || '-'}</td>
                  <td>{item.country || '-'}</td>
                  <td className="max-w-[200px] truncate">{item.address || '-'}</td>
                  <td>{item.contact || '-'}</td>
                  <td>{item.phone || '-'}</td>
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
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">仓库配置</h1>
          <p className="page-desc">管理国内仓、FBA仓和海外仓信息</p>
        </div>
      </div>

      {renderTable(domesticList, '国内仓', 'DOMESTIC')}
      {renderTable(fbaList, 'FBA仓', 'FBA')}
      {renderTable(overseasList, '海外仓', 'OVERSEAS')}

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
              {WAREHOUSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">仓库名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">仓库编码 <span className="text-red-500">*</span></label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">国家</label>
            <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">地址</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="filter-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">联系人</label>
              <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="filter-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">电话</label>
              <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="filter-input w-full" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
