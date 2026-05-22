import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Truck,
  Route,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface SubMenuItem {
  label: string;
  path: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: '数据看板', path: '/' },
  {
    icon: FileText,
    label: '调拨单管理',
    children: [
      { label: '调拨单列表', path: '/transfers' },
      { label: '创建调拨单', path: '/transfers/create' },
    ],
  },
  {
    icon: Truck,
    label: '在途管理',
    children: [
      { label: '在途总览', path: '/transit/overview' },
      { label: '在途明细', path: '/transit/list' },
      { label: '异常处理', path: '/transit/abnormal' },
    ],
  },
  {
    icon: Route,
    label: '时效追踪',
    children: [
      { label: '物流节点追踪', path: '/tracking' },
      { label: '时效规则配置', path: '/tracking/sla' },
    ],
  },
  {
    icon: DollarSign,
    label: '运费管理',
    children: [
      { label: '运费概览', path: '/freight/overview' },
      { label: '对账管理', path: '/freight/reconciliation' },
    ],
  },
  {
    icon: Settings,
    label: '系统设置',
    children: [
      { label: '仓库配置', path: '/settings/warehouses' },
      { label: '物流商管理', path: '/settings/carriers' },
      { label: '团队管理', path: '/settings/teams' },
      { label: '用户管理', path: '/settings/users' },
    ],
  },
];

const breadcrumbMap: Record<string, string> = {
  '/': '数据看板',
  '/transfers': '调拨单管理 / 调拨单列表',
  '/transfers/create': '调拨单管理 / 创建调拨单',
  '/transit/overview': '在途管理 / 在途总览',
  '/transit/list': '在途管理 / 在途明细',
  '/transit/abnormal': '在途管理 / 异常处理',
  '/tracking': '时效追踪 / 物流节点追踪',
  '/tracking/sla': '时效追踪 / 时效规则配置',
  '/freight/overview': '运费管理 / 运费概览',
  '/freight/reconciliation': '运费管理 / 对账管理',
  '/settings/warehouses': '系统设置 / 仓库配置',
  '/settings/carriers': '系统设置 / 物流商管理',
  '/settings/teams': '系统设置 / 团队管理',
  '/settings/users': '系统设置 / 用户管理',
};

export default function Layout() {
  const { setCurrentPageName } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(
    menuItems.filter((item) => item.children && item.label !== '系统设置').map((item) => item.label)
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isParentActive = (item: MenuItem) => {
    if (item.path) return isActive(item.path);
    return item.children?.some((child) => isActive(child.path)) || false;
  };

  const autoExpandParent = useMemo(() => {
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (isActive(child.path)) {
            return item.label;
          }
        }
      }
    }
    return null;
  }, [location.pathname]);

  useEffect(() => {
    if (autoExpandParent && !expandedMenus.includes(autoExpandParent)) {
      setExpandedMenus((prev) => [...prev, autoExpandParent]);
    }
  }, [autoExpandParent]);

  useEffect(() => {
    const path = location.pathname;
    if (path.match(/^\/transfers\/\d+$/)) {
      setCurrentPageName('调拨单管理 / 调拨单详情');
    } else {
      setCurrentPageName(breadcrumbMap[path] || '调拨管理');
    }
  }, [location.pathname, setCurrentPageName]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <aside className="fixed left-0 top-0 bottom-0 w-[300px] bg-white flex flex-col z-30 border-r border-slate-100/80">
        <div className="flex items-center gap-4 px-8 h-[80px] shrink-0">
          <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
            <ArrowLeftRight size={22} className="text-white" />
          </div>
          <div>
            <div className="text-[16px] font-semibold text-slate-900 leading-tight">调拨管理系统</div>
            <div className="text-[12px] text-slate-400 leading-tight mt-0.5">Transfer Management</div>
          </div>
        </div>

        <nav className="flex-1 py-5 px-5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isParentActive(item);
            const expanded = expandedMenus.includes(item.label);

            return (
              <div key={item.label} className="mb-1">
                {item.path ? (
                  <div
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-medium cursor-pointer transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon size={20} className={`shrink-0 ${active ? 'text-blue-500' : ''}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-medium cursor-pointer transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                      onClick={() => toggleMenu(item.label)}
                    >
                      <Icon size={20} className={`shrink-0 ${active ? 'text-blue-500' : ''}`} />
                      <span className="flex-1">{item.label}</span>
                      {active && !expanded && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                      {expanded ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                    </div>
                    {expanded && item.children && (
                      <div className="ml-5 pl-4 border-l border-slate-200 mt-1 space-y-0.5">
                        {item.children.map((child) => {
                          const childActive = isActive(child.path);
                          return (
                            <div
                              key={child.path}
                              className={`px-4 py-2.5 rounded-lg text-[14px] font-medium cursor-pointer transition-colors ${
                                childActive
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                              }`}
                              onClick={() => navigate(child.path)}
                            >
                              {child.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-6 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center">
              <span className="text-[14px] font-semibold text-slate-500">管</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-slate-700 truncate">管理员</div>
              <div className="text-[12px] text-slate-400 truncate">admin@company.com</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="ml-[300px] min-h-screen">
        <div className="mx-auto max-w-[1200px] px-10 py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
