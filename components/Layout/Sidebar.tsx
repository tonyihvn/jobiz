import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Store, LayoutDashboard, Package, Users, GraduationCap, 
  CreditCard, Settings, Shield, MessageSquare, Truck, 
  History, Layers, Settings2, UserCheck, ClipboardList, FileText, Activity, LogOut,
  ChevronDown, ChevronRight, Bell, CheckCircle, XCircle, AlertTriangle, CreditCardIcon
} from 'lucide-react';
import db from '../../services/apiClient';
import { Role, CompanySettings, TaskStatus, Employee } from '../../types';
import BusinessSwitcher from './BusinessSwitcher';
import { useBusinessContext } from '../../services/BusinessContext';

interface SidebarProps {
  onLogout: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, collapsed = false, onToggle }) => {
  const { selectedBusiness } = useBusinessContext();
  const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', headerImageUrl: '', footerImageUrl: '', vatRate: 0, currency: '$' } as CompanySettings;
  const [settings, setSettings] = useState<CompanySettings>(emptySettings);
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'sales': true,
    'inventory': true,
    'services': true,
    'crm': true,
    'admin': false,
    'super_admin': true
  });
  const location = useLocation();
  const [categoryGroups, setCategoryGroups] = useState<Array<{group:string,isProduct:boolean}>>([]);

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      try {
        let user: any = null;
        if (db.auth && db.auth.getCurrentUser) user = await db.auth.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(user);

        // detailed user (to pick up is_super_admin and default_location)
        let detailedUser: any = null;
        if (user && db.employees && db.employees.getAll) {
          try {
            const emps: any[] = await db.employees.getAll();
            detailedUser = emps.find(e => e.id === user.id) || null;
            if (detailedUser) setCurrentUser(prev => ({ ...prev, ...detailedUser } as Employee));
          } catch (e) { /* ignore */ }
        }

        if (detailedUser && (detailedUser.is_super_admin || detailedUser.isSuperAdmin)) {
          setIsSuperAdmin(true);
          setUserRole({ id: 'super', businessId: 'sys', name: 'Super Admin', permissions: [] });
        } else {
          setIsSuperAdmin(false);
          if (db.roles && db.roles.getAll) {
            try {
              const roles: any[] = await db.roles.getAll();
              const role = roles.find(r => r.id === (detailedUser?.role_id || user?.roleId || user?.role_id));
              setUserRole(role);
            } catch (e) { /* ignore */ }
          }
        }

        // Tasks
        try {
          let tasks: any[] = [];
          if (db.tasks && db.tasks.getAll) tasks = await db.tasks.getAll();
          const pending = tasks.filter(t => t.assignedTo === user?.id && t.status !== TaskStatus.COMPLETED).length;
          setPendingTasksCount(pending);
        } catch (e) { /* ignore */ }

        // Notifications (super admin helper)
        try {
          if (db.superAdmin && db.superAdmin.getBusinesses) {
            const bizs: any[] = await db.superAdmin.getBusinesses();
            const biz = bizs.find(b => b.id === (detailedUser?.businessId || user?.businessId));
            if (biz && biz.paymentStatus === 'unpaid') setNotifications(1);
          }
        } catch (e) { /* ignore */ }

        // Settings
        try {
          if (db.settings && db.settings.get) {
            const s = await db.settings.get();
            if (mounted && s) setSettings(s as CompanySettings);
          }
        } catch (e) { /* ignore */ }

        // Load category groups for sidebar
        try {
          if (db.categories && db.categories.getAll) {
            const cats: any[] = await db.categories.getAll();
            const groups: Record<string, boolean> = {};
            (cats || []).forEach((c: any) => { if (c && c.group) groups[c.group] = groups[c.group] || !!(c.isProduct || c.is_product); });
            const arr = Object.keys(groups).map(g => ({ group: g, isProduct: groups[g] }));
            setCategoryGroups(arr);
          }
        } catch (e) { /* ignore */ }
      } catch (err) {
        // swallow
      }
    };

    loadAll();

    const onCatsChanged = async () => {
      try {
        if (db.categories && db.categories.getAll) {
          const cats: any[] = await db.categories.getAll();
          const groups: Record<string, boolean> = {};
          (cats || []).forEach((c: any) => { if (c && c.group) groups[c.group] = groups[c.group] || !!(c.isProduct || c.is_product); });
          const arr = Object.keys(groups).map(g => ({ group: g, isProduct: groups[g] }));
          setCategoryGroups(arr);
        }
      } catch (e) { /* ignore */ }
    };

    window.addEventListener('categories:changed', onCatsChanged);

    return () => { mounted = false; window.removeEventListener('categories:changed', onCatsChanged); };
  }, [location]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Build dynamic menu groups, injecting category groups into Inventory or Services
  const dynamicInventoryItems = categoryGroups.filter(g => g.isProduct).map(g => ({ id: `inv_group_${g.group}`, to: `/inventory/${encodeURIComponent(g.group)}`, icon: Layers, label: g.group }));
  const dynamicServicesItems = categoryGroups.filter(g => !g.isProduct).map(g => ({ id: `svc_group_${g.group}`, to: `/services/${encodeURIComponent(g.group)}`, icon: Users, label: g.group }));

  // Menu Groups
  const regularMenuGroups = [
    {
      key: 'main',
      label: 'Main',
      items: [
        { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      key: 'sales',
      label: 'Sales & Front Office',
      items: [
        { id: 'pos', to: '/pos', icon: Store, label: 'Storefront (POS)' },
        { id: 'sales_history', to: '/sales-history', icon: History, label: 'Sales History' },
        { id: 'service_history', to: '/service-history', icon: History, label: 'Service History' },
      ]
    },
    {
      key: 'inventory',
      label: 'Inventory & Stock',
      items: [
        { id: 'stock', to: '/stock', icon: Package, label: 'Stock Management' },
        { id: 'suppliers', to: '/suppliers', icon: Truck, label: 'Suppliers' },
        // dynamic product groups (each group is a distinct page)
        ...dynamicInventoryItems,
      ]
    },
    {
      key: 'services',
      label: 'Services',
      items: [
        // dynamic service groups (each group is a distinct page)
        ...dynamicServicesItems,
      ]
    },
    {
      key: 'crm',
      label: 'CRM & Tasks',
      items: [
        { id: 'clients', to: '/clients', icon: UserCheck, label: 'Clients' },
        { id: 'communications', to: '/communications', icon: MessageSquare, label: 'Communication' },
        { id: 'tasks', to: '/tasks', icon: ClipboardList, label: 'Tasks & Memos', badge: pendingTasksCount },
        // Categories moved here per request
        { id: 'categories', to: '/categories', icon: Layers, label: 'Categories' },
      ]
    },
    {
      key: 'admin',
      label: 'Administration',
      items: [
        { id: 'finance', to: '/finance', icon: CreditCard, label: 'Finance & HR' },
        { id: 'reports', to: '/reports', icon: FileText, label: 'Reports' },
        { id: 'audit_trails', to: '/audit-trails', icon: Activity, label: 'Audit Trails' },
        { id: 'admin', to: '/admin', icon: Shield, label: 'Roles & Admin' },
        { id: 'settings', to: '/settings', icon: Settings2, label: 'App Settings' },
      ]
    }
  ];

  // Super Admin Menu - Additional Control Menus
  const superAdminMenuItems = [
    {
      key: 'super_admin',
      label: 'Super Admin Controls',
      items: [
        { id: 'business_approvals', to: '/super-admin/approvals', icon: CheckCircle, label: 'Approvals' },
        { id: 'payment_management', to: '/super-admin/payments', icon: CreditCardIcon, label: 'Payments' },
        { id: 'business_activation', to: '/super-admin/activation', icon: AlertTriangle, label: 'Activation' },
        { id: 'feedbacks', to: '/super-admin/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
        { id: 'all_data', to: '/super-admin/data', icon: Package, label: 'Business Data' },
        { id: 'landing_config', to: '/super-admin/landing-config', icon: Settings2, label: 'Landing Page' },
      ]
    }
  ];

  const menuGroups = isSuperAdmin ? [...regularMenuGroups, ...superAdminMenuItems] : regularMenuGroups;

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col h-screen no-print fixed left-0 top-0 overflow-hidden transition-width` }>
      <div className="p-4 border-b border-slate-800 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
             <img src={settings.logoUrl} alt="Logo" className={`${collapsed ? 'w-6 h-6' : 'w-8 h-8'} rounded bg-white object-contain`} />
          ) : (
            <div className={`${collapsed ? 'w-6 h-6' : 'w-8 h-8'} bg-brand-500 rounded-lg flex items-center justify-center text-white shrink-0`}>
              <Settings className="w-5 h-5" />
            </div>
          )}
          {!collapsed && <div>
            <h1 className="text-xl font-bold text-white truncate">{isSuperAdmin ? 'Super Admin' : settings.name}</h1>
            <p className="text-xs text-slate-500 mt-1 truncate">{isSuperAdmin ? selectedBusiness?.name || 'No Business Selected' : settings.motto}</p>
          </div>}
        </div>
        <div>
          <button onClick={() => onToggle && onToggle()} className="text-slate-400 hover:text-white p-1 rounded" title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Business Switcher for Super Admin */}
      {isSuperAdmin && <BusinessSwitcher collapsed={collapsed} />}

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuGroups.map((group) => {
          // Check if user has permission for at least one item in the group
          // Super Admin sees everything. Otherwise require a role and permission.
          // Permission check allows either exact permission (e.g. "categories")
          // or a namespaced permission like "categories:read" so roles with
          // scoped permissions still see the menu item.
          const visibleItems = group.items.filter(item => 
            // Super admin sees everything
            isSuperAdmin 
            // Dynamic category-generated pages should be visible to regular users
            || item.id.startsWith('inv_group_') || item.id.startsWith('svc_group_')
            // Otherwise require a role and permission match
            || (userRole && userRole.permissions && userRole.permissions.some((p: string) => p === item.id || p.startsWith(item.id + ':')))
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key} className="mb-1">
              {group.key !== 'main' && !collapsed && (
                <button 
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                >
                  {group.label}
                  {openGroups[group.key] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} 
                </button>
              )}

              {(group.key === 'main' || openGroups[group.key]) && (
                <div className="mt-1 space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                          isActive 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' 
                            : 'hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                      </div>
                      {item.badge && !collapsed ? (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Removed: Category Groups section (per UI change request) */}
      </nav>

      <div className="p-3 border-t border-slate-800 shrink-0">
        {notifications > 0 && !collapsed && (
            <div className="mb-3 bg-rose-500/20 text-rose-300 p-2 rounded flex items-center gap-2 text-xs">
                <Bell size={14} className="animate-pulse" />
                <span>{notifications} Action Required</span>
            </div>
        )}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {userRole?.name ? userRole.name.slice(0,2).toUpperCase() : 'SA'}
          </div>
          {!collapsed && <div className="overflow-hidden flex-1">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 truncate">{userRole?.name}</p>
          </div>}
          <button onClick={onLogout} className="text-slate-400 hover:text-white" title="Logout">
              <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;