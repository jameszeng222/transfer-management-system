import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Save, Plus, Trash2, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const templateFields = [
  { field: 'biz_order_no', label: '调拨业务管理单号', required: true, example: 'WYT-20260522-001' },
  { field: 'transfer_order_no', label: '调拨单号', required: false, example: 'WYT-TF-20260522' },
  { field: 'outbound_order_no', label: '出库单号', required: false, example: '' },
  { field: 'third_party_inbound_no', label: '第三方入库单号', required: false, example: 'FBA15ABC123' },
  { field: 'source', label: '来源', required: false, example: 'MANUAL' },
  { field: 'origin_warehouse_name', label: '发货仓', required: true, example: '深圳仓' },
  { field: 'dest_warehouse_name', label: '目的仓', required: true, example: '美国-LAX9' },
  { field: 'team_name', label: '团队', required: false, example: '团队A' },
  { field: 'product_name', label: '品名', required: false, example: '蓝牙耳机/充电宝' },
  { field: 'transport_type', label: '运输类型', required: false, example: 'SEA' },
  { field: 'carrier_name', label: '物流商', required: false, example: '万邑通' },
  { field: 'carrier_order_no', label: '物流商单号', required: false, example: '' },
  { field: 'box_count', label: '箱数', required: false, example: '50' },
  { field: 'planned_qty', label: '计划数量', required: false, example: '1000' },
  { field: 'box_spec', label: '箱规', required: false, example: '60x40x40cm' },
  { field: 'is_customs_declared', label: '是否报关', required: false, example: 'true/false' },
  { field: 'customs_factory', label: '报关工厂', required: false, example: '' },
  { field: 'sla_days', label: '时效要求(天)', required: false, example: '30' },
  { field: 'sku', label: 'SKU', required: false, example: 'SKU-BT-001' },
  { field: 'sku_quantity', label: 'SKU数量', required: false, example: '500' },
  { field: 'box_no', label: '箱号', required: false, example: 'B1-B25' },
  { field: 'order_remark', label: '备注', required: false, example: '' },
];

type TabKey = 'create' | 'import';

export default function TransferCreateAndImport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('create');

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">创建调拨单</h1>
          <p className="page-desc">手工创建或批量导入调拨单</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-slate-100 p-1 w-fit" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <button
          className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'create' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('create')}
        >
          手工创建
        </button>
        <button
          className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'import' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('import')}
        >
          批量导入
        </button>
      </div>

      {activeTab === 'create' ? <CreateForm navigate={navigate} /> : <ImportForm />}
    </div>
  );
}

function CreateForm({ navigate }: { navigate: (path: string) => void }) {
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
  );
}

function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const headerRow = templateFields.map((f) => f.label + (f.required ? '*' : ''));
    const exampleRow = templateFields.map((f) => f.example);
    const descRow = templateFields.map((f) => {
      let desc = f.field;
      if (f.required) desc += '(必填)';
      if (f.field === 'source') desc += '(API_WANYITONG/API_AMAZON/MANUAL/OTHER)';
      if (f.field === 'transport_type') desc += '(SEA/AIR/RAIL/EXPRESS/TRUCK)';
      if (f.field === 'is_customs_declared') desc += '(true/false)';
      return desc;
    });

    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow, descRow]);
    ws['!cols'] = templateFields.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '调拨单导入模板');
    XLSX.writeFile(wb, '调拨单导入模板.xlsx');
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) throw new Error('文件内容为空');

      const labelToField: Record<string, string> = {};
      templateFields.forEach((f) => {
        labelToField[f.label] = f.field;
        labelToField[f.label + '*'] = f.field;
      });

      const transferMap = new Map<string, any>();
      rows.forEach((row) => {
        const obj: any = {};
        Object.entries(row).forEach(([key, val]) => {
          const field = labelToField[key.trim()] || key.trim();
          obj[field] = String(val).trim();
        });

        const bizKey = obj.biz_order_no;
        if (!bizKey) return;

        if (!transferMap.has(bizKey)) {
          transferMap.set(bizKey, {
            biz_order_no: bizKey,
            transfer_order_no: obj.transfer_order_no || '',
            outbound_order_no: obj.outbound_order_no || '',
            third_party_inbound_no: obj.third_party_inbound_no || '',
            source: obj.source || 'MANUAL',
            origin_warehouse_name: obj.origin_warehouse_name || '',
            dest_warehouse_name: obj.dest_warehouse_name || '',
            team_name: obj.team_name || '',
            product_name: obj.product_name || '',
            transport_type: obj.transport_type || '',
            carrier_name: obj.carrier_name || '',
            carrier_order_no: obj.carrier_order_no || '',
            box_count: obj.box_count ? Number(obj.box_count) : 0,
            planned_qty: obj.planned_qty ? Number(obj.planned_qty) : 0,
            box_spec: obj.box_spec || '',
            is_customs_declared: obj.is_customs_declared === 'true' ? 1 : 0,
            customs_factory: obj.customs_factory || '',
            sla_days: obj.sla_days ? Number(obj.sla_days) : 0,
            order_remark: obj.order_remark || '',
            items: [] as any[],
          });
        }

        const transfer = transferMap.get(bizKey)!;
        if (obj.sku) {
          transfer.items.push({
            sku: obj.sku,
            quantity: obj.sku_quantity ? Number(obj.sku_quantity) : 0,
            box_no: obj.box_no || '',
          });
        }
      });

      const transfers = Array.from(transferMap.values());
      if (transfers.length === 0) throw new Error('未找到有效的调拨单数据');

      const res = await api.batchImportTransfers({ transfers });
      setResult(res);
    } catch (e: any) {
      setError(e.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={downloadTemplate}>
          <Download size={14} />下载导入模板
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors mb-6 bg-white ${
          dragging ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${dragging ? 'bg-blue-500' : 'bg-slate-100'}`}>
          <Upload size={32} className={dragging ? 'text-white' : 'text-slate-400'} />
        </div>
        <p className="text-sm text-slate-600 mb-2">拖拽Excel文件到此处，或</p>
        <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
          选择文件
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        <p className="text-xs text-slate-400 mt-3">支持 .xlsx / .xls 格式</p>
        {importing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            导入中...
          </div>
        )}
      </div>

      {error && (
        <div className="card mb-6 border-red-200">
          <div className="card-body flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-500">导入失败</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="card mb-6 border-emerald-200">
          <div className="card-body flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-600">导入成功</p>
              <p className="text-xs text-slate-500 mt-1">成功导入 {Array.isArray(result) ? result.length : (result.success_count ?? result.successCount ?? 0)} 条</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <h3 className="card-title">模板字段说明</h3>
        </div>
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>字段名</th>
                <th>说明</th>
                <th>示例</th>
                <th>必填</th>
              </tr>
            </thead>
            <tbody>
              {templateFields.map((f) => (
                <tr key={f.field}>
                  <td className="font-mono text-xs text-slate-600">{f.field}</td>
                  <td>{f.label}</td>
                  <td className="text-xs text-slate-400">{f.example}</td>
                  <td>{f.required ? <span className="text-red-500 text-xs">是</span> : <span className="text-slate-400 text-xs">否</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
