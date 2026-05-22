import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import { Plus } from 'lucide-react';

export default function SettingUser() {
  const [list, setList] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', team_id: '', role: 'user' });

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, teamsRes] = await Promise.all([api.getUsers(), api.getTeams()]);
        setList(usersRes?.list || usersRes || []);
        setTeams(teamsRes?.list || teamsRes || []);
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
    setForm({ name: '', email: '', phone: '', team_id: '', role: 'user' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name || '', email: item.email || '', phone: item.phone || '', team_id: String(item.team_id || ''), role: item.role || 'user' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editItem) {
        await api.updateUser(editItem.id, form);
      } else {
        await api.createUser(form);
      }
      setShowModal(false);
      const res = await api.getUsers();
      setList(res?.list || res || []);
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  const getTeamName = (teamId: number | string) => {
    const team = teams.find((t: any) => String(t.id) === String(teamId));
    return team?.name || '-';
  };

  const roleLabels: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
    viewer: '只读用户',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">用户管理</h1>
          <p className="page-desc">管理系统用户和权限</p>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={openCreate}>
          <Plus size={14} />新增用户
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>电话</th>
                <th>团队</th>
                <th>角色</th>
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
                    <td>{item.email || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td>{getTeamName(item.team_id)}</td>
                    <td>
                      <span className="badge bg-slate-50 text-slate-500">{roleLabels[item.role] || item.role || '-'}</span>
                    </td>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? '编辑用户' : '新增用户'} footer={
        <>
          <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>确认</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">姓名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">邮箱</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">电话</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="filter-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">团队</label>
            <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} className="filter-select w-full">
              <option value="">请选择</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">角色</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="filter-select w-full">
              <option value="admin">管理员</option>
              <option value="user">普通用户</option>
              <option value="viewer">只读用户</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
