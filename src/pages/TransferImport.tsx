import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const templateFields = [
  { field: 'biz_order_no', label: '调拨业务管理单号', required: true },
  { field: 'transfer_order_no', label: '调拨单号', required: false },
  { field: 'outbound_order_no', label: '出库单号', required: false },
  { field: 'third_party_inbound_no', label: '第三方入库单号', required: false },
  { field: 'source', label: '来源(API_WANYITONG/API_AMAZON/MANUAL/OTHER)', required: false },
  { field: 'origin_warehouse_name', label: '发货仓', required: true },
  { field: 'dest_warehouse_name', label: '目的仓', required: true },
  { field: 'team_name', label: '团队', required: false },
  { field: 'product_name', label: '品名', required: false },
  { field: 'transport_type', label: '运输类型(SEA/AIR/RAIL/EXPRESS/TRUCK)', required: false },
  { field: 'carrier_name', label: '物流商', required: false },
  { field: 'carrier_order_no', label: '物流商单号', required: false },
  { field: 'box_count', label: '箱数', required: false },
  { field: 'planned_qty', label: '计划数量', required: false },
  { field: 'is_customs_declared', label: '是否报关(true/false)', required: false },
  { field: 'customs_factory', label: '报关工厂', required: false },
  { field: 'sla_days', label: '时效要求(天)', required: false },
  { field: 'order_remark', label: '备注', required: false },
];

export default function TransferImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const text = await file.text();
      const rows = text.split('\n').filter((r) => r.trim());
      if (rows.length < 2) throw new Error('文件内容为空');
      const headers = rows[0].split(',').map((h) => h.trim());
      const items = rows.slice(1).map((row) => {
        const values = row.split(',').map((v) => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      });
      const res = await api.batchImportTransfers({ items });
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
    <div className="animate-fade-in max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">批量导入</h1>
          <p className="page-desc">通过CSV文件批量导入调拨单</p>
        </div>
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
        <p className="text-sm text-slate-600 mb-2">拖拽CSV文件到此处，或</p>
        <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
          选择文件
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
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
              <p className="text-xs text-slate-500 mt-1">成功导入 {result.success_count ?? result.successCount ?? 0} 条，失败 {result.fail_count ?? result.failCount ?? 0} 条</p>
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
                <th>必填</th>
              </tr>
            </thead>
            <tbody>
              {templateFields.map((f) => (
                <tr key={f.field}>
                  <td className="font-mono text-xs text-slate-600">{f.field}</td>
                  <td>{f.label}</td>
                  <td>{f.required ? <span className="text-red-500 text-xs">是</span> : <span className="text-slate-400 text-xs">否</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
