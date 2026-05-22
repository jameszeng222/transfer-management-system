import React from 'react';

const logisticsStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待提货', color: 'bg-slate-50 text-slate-500' },
  PICKED_UP: { label: '已提货', color: 'bg-blue-50 text-blue-600' },
  DEPARTED: { label: '已离港', color: 'bg-indigo-50 text-indigo-600' },
  ARRIVED_PORT: { label: '已到港', color: 'bg-cyan-50 text-cyan-600' },
  CLEARED: { label: '已清关', color: 'bg-teal-50 text-teal-600' },
  LAST_MILE: { label: '尾程派送', color: 'bg-amber-50 text-amber-600' },
  DELIVERED: { label: '已签收', color: 'bg-emerald-50 text-emerald-600' },
  UNLOADED: { label: '已卸货', color: 'bg-green-50 text-green-600' },
  SHELVED: { label: '已上架', color: 'bg-green-50 text-green-700' },
};

const sourceMap: Record<string, { label: string; color: string }> = {
  API_WANYITONG: { label: '万邑通API', color: 'bg-blue-50 text-blue-600' },
  API_AMAZON: { label: '亚马逊API', color: 'bg-orange-50 text-orange-600' },
  MANUAL: { label: '手工录入', color: 'bg-slate-50 text-slate-500' },
  OTHER: { label: '其他', color: 'bg-purple-50 text-purple-600' },
};

const abnormalTypeMap: Record<string, { label: string; color: string }> = {
  DELAY: { label: '延误', color: 'bg-amber-50 text-amber-600' },
  OVERDUE: { label: '超时', color: 'bg-red-50 text-red-600' },
  DAMAGED: { label: '货损', color: 'bg-orange-50 text-orange-600' },
  LOST: { label: '丢失', color: 'bg-red-50 text-red-700' },
  QUANTITY_MISMATCH: { label: '数量不符', color: 'bg-pink-50 text-pink-600' },
  LOGISTICS_DELAY: { label: '物流延误', color: 'bg-amber-50 text-amber-600' },
  LOGISTICS_LOST: { label: '物流丢失', color: 'bg-red-50 text-red-700' },
  LOGISTICS_DAMAGED: { label: '物流货损', color: 'bg-orange-50 text-orange-600' },
  SHELVING_SHORTAGE: { label: '上架短缺', color: 'bg-amber-50 text-amber-600' },
  SHELVING_WRONG: { label: '上架错误', color: 'bg-red-50 text-red-600' },
  SHELVING_DAMAGED: { label: '上架破损', color: 'bg-orange-50 text-orange-600' },
};

const reconcileStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待对账', color: 'bg-slate-50 text-slate-500' },
  RECONCILED: { label: '已对账', color: 'bg-blue-50 text-blue-600' },
  PAID: { label: '已付款', color: 'bg-emerald-50 text-emerald-600' },
};

const maps: Record<string, Record<string, { label: string; color: string }>> = {
  logisticsStatus: logisticsStatusMap,
  source: sourceMap,
  abnormalType: abnormalTypeMap,
  reconcileStatus: reconcileStatusMap,
};

interface StatusBadgeProps {
  type: 'logisticsStatus' | 'source' | 'abnormalType' | 'reconcileStatus';
  value: string;
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  const map = maps[type] || {};
  const config = map[value] || { label: value, color: 'bg-slate-50 text-slate-500' };

  return (
    <span className={`badge ${config.color}`}>
      {config.label}
    </span>
  );
}
