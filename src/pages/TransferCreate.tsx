import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function TransferCreate() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    biz_order_no: '',
    transfer_order_no: '',
    outbound_order_no: '',
    third_party_inbound_no: '',
    source: 'MANUAL',
    origin_warehouse_id: '',
    dest_warehouse_id: '',
    team_id: '',
    product_name: '',
    transport_type: '',
    carrier_id: '',
    carrier_order_no: '',
    is_customs_declared: false,
    customs_factory: '',
    sla_days: '',
    order_remark: '',
  });
  const [skuItems, setSkuItems] = useState([{ sku: '', quantity: '', box_no: '' }]);

  useEffect(() => {
    async function load() {
      try {
        const [w, c, t] = await Promise.all([api.getWarehouses(), api.getCarriers(), api.getTeams()]);
        setWarehouses(w || []);
        setCarriers(c || []);
        setTeams(t || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const domesticWarehouses = warehouses.filter((w: any) => w.type === 'DOMESTIC');
  const overseasWarehouses = warehouses.filter((w: any) => w.type === 'FBA' || w.type === 'OVERSEAS');

  const addSkuItem = () => {
    setSkuItems([...skuItems, { sku: '', quantity: '', box_no: '' }]);
  };

  const removeSkuItem = (idx: number) => {
    setSkuItems(skuItems.filter((_, i) => i !== idx));
  };

  const updateSkuItem = (idx: number, field: string, value: string) => {
    const updated = [...skuItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setSkuItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.biz_order_no || !form.origin_warehouse_id || !form.dest_warehouse_id) {
      alert('请填写必填字段');
      return;
    }
    setSubmitting(true);
    try {
      await api.createTransfer({
        ...form,
        sla_days: form.sla_days ? Number(form.sla_days) : undefined,
        sku_items: skuItems.filter((s) => s.sku),
      });
      navigate('/transfers');
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">创建调拨单</h1>
          <p className="page-desc">手工创建新的调拨单</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">基本信息</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">调拨业务管理单号 <span className="text-red-500">*</span></label>
                <input type="text" value={form.biz_order_no} onChange={(e) => setForm({ ...form, biz_order_no: e.target.value })} className="filter-input w-full" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">调拨单号</label>
                <input type="text" value={form.transfer_order_no} onChange={(e) => setForm({ ...form, transfer_order_no: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">出库单号</label>
                <input type="text" value={form.outbound_order_no} onChange={(e) => setForm({ ...form, outbound_order_no: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">第三方入库单号</label>
                <input type="text" value={form.third_party_inbound_no} onChange={(e) => setForm({ ...form, third_party_inbound_no: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">来源</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="filter-select w-full">
                  <option value="MANUAL">手工</option>
                  <option value="API_WANYITONG">万邑通</option>
                  <option value="API_AMAZON">亚马逊</option>
                  <option value="OTHER">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">发货仓 <span className="text-red-500">*</span></label>
                <select value={form.origin_warehouse_id} onChange={(e) => setForm({ ...form, origin_warehouse_id: e.target.value })} className="filter-select w-full" required>
                  <option value="">请选择</option>
                  {domesticWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">目的仓 <span className="text-red-500">*</span></label>
                <select value={form.dest_warehouse_id} onChange={(e) => setForm({ ...form, dest_warehouse_id: e.target.value })} className="filter-select w-full" required>
                  <option value="">请选择</option>
                  {overseasWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">团队</label>
                <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} className="filter-select w-full">
                  <option value="">请选择</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">品名</label>
                <input type="text" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">运输类型</label>
                <select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })} className="filter-select w-full">
                  <option value="">请选择</option>
                  <option value="SEA">海运</option>
                  <option value="AIR">空运</option>
                  <option value="RAIL">铁路</option>
                  <option value="EXPRESS">快递</option>
                  <option value="TRUCK">卡车</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">物流商</label>
                <select value={form.carrier_id} onChange={(e) => setForm({ ...form, carrier_id: e.target.value })} className="filter-select w-full">
                  <option value="">请选择</option>
                  {carriers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">物流商单号</label>
                <input type="text" value={form.carrier_order_no} onChange={(e) => setForm({ ...form, carrier_order_no: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">是否报关</label>
                <label className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    checked={form.is_customs_declared}
                    onChange={(e) => setForm({ ...form, is_customs_declared: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-slate-600">是</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">报关工厂</label>
                <input type="text" value={form.customs_factory} onChange={(e) => setForm({ ...form, customs_factory: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">时效要求(天)</label>
                <input type="number" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} className="filter-input w-full" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">订单备注</label>
              <textarea value={form.order_remark} onChange={(e) => setForm({ ...form, order_remark: e.target.value })} className="filter-input w-full h-20 resize-none" />
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">SKU明细</h3>
            <button type="button" className="btn-blue btn-sm" onClick={addSkuItem}>
              <Plus size={14} />添加
            </button>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>数量</th>
                  <th>箱号</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {skuItems.map((item, idx) => (
                  <tr key={idx}>
                    <td><input type="text" value={item.sku} onChange={(e) => updateSkuItem(idx, 'sku', e.target.value)} className="filter-input w-full" /></td>
                    <td><input type="number" value={item.quantity} onChange={(e) => updateSkuItem(idx, 'quantity', e.target.value)} className="filter-input w-full" /></td>
                    <td><input type="text" value={item.box_no} onChange={(e) => updateSkuItem(idx, 'box_no', e.target.value)} className="filter-input w-full" /></td>
                    <td>
                      {skuItems.length > 1 && (
                        <button type="button" onClick={() => removeSkuItem(idx)} className="p-1 text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Save size={16} />{submitting ? '提交中...' : '提交'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/transfers')}>取消</button>
        </div>
      </form>
    </div>
  );
}
