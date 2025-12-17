import React, { useState, useEffect } from 'react';
import db from '../services/apiClient';
import { Role } from '../types';
import { Shield, Check, Plus, Save, X, Settings, Menu, Database, MapPin, Trash2, Edit2 } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'locations'>('roles');
  
  // Roles management
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [menuPermissions, setMenuPermissions] = useState<Array<{id:string,label:string}>>([]);
  const [resourcePermissions, setResourcePermissions] = useState<Array<{id:string,label:string}>>([]);
  const [editingResource, setEditingResource] = useState<{id: string, label: string} | null>(null);

  // Locations management
  const [locations, setLocations] = useState<Array<{id: string; name: string; address?: string}>>([]);
  const [editingLocation, setEditingLocation] = useState<{id: string; name: string; address?: string} | null>(null);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Load roles
                const rolesData = db.roles && db.roles.getAll ? await db.roles.getAll() : [];
                if (!mounted) return;
                setRoles(Array.isArray(rolesData) ? rolesData : []);
                if (!selectedRole && Array.isArray(rolesData) && rolesData.length > 0) setSelectedRole(rolesData[0]);
                
                // Load locations
                const locsData = db.locations && db.locations.getAll ? await db.locations.getAll() : [];
                if (!mounted) return;
                setLocations(Array.isArray(locsData) ? locsData : []);
                
                // build dynamic permissions from categories (group names)
                try {
                    const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
                    const groups: Record<string, boolean> = {};
                    (cats || []).forEach((c: any) => { if (c && c.group) groups[c.group] = groups[c.group] || !!(c.isProduct || c.is_product); });
                    const groupEntries = Object.keys(groups).map(g => ({ group: g, isProduct: groups[g] }));

                    // Base static menu permissions (excluding generic Product Master/Services)
                    const baseMenu = [
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'pos', label: 'POS System' },
                        { id: 'stock', label: 'Stock Management' },
                        { id: 'suppliers', label: 'Suppliers' },
                        { id: 'clients', label: 'Clients' },
                        { id: 'sales_history', label: 'Sales History' },
                        { id: 'finance', label: 'Finance & HR' },
                        { id: 'communications', label: 'Communications' },
                        { id: 'admin', label: 'Admin Access' },
                        { id: 'settings', label: 'System Settings' },
                        { id: 'categories', label: 'Categories' },
                    ];

                    // Inject dynamic group links as separate permissions
                    const dynamicMenu = groupEntries.flatMap(g => {
                        if (g.isProduct) return [{ id: `inv_group_${g.group}`, label: `Products: ${g.group}` }];
                        return [{ id: `svc_group_${g.group}`, label: `Services: ${g.group}` }];
                    });

                    setMenuPermissions([...baseMenu, ...dynamicMenu]);

                    // Resource permissions - include per-group resources for fine-grained CRUD if desired
                    const baseResources = [
                        { id: 'inventory', label: 'Products' },
                        { id: 'categories', label: 'Categories' },
                        { id: 'suppliers', label: 'Suppliers' },
                        { id: 'clients', label: 'Clients' },
                        { id: 'employees', label: 'Employees' },
                        { id: 'finance', label: 'Financial Records' }
                    ];

                    // Optionally create per-group resource ids like inventory:<group>
                    const dynamicResources = groupEntries.map(g => ({ id: `inventory:${g.group}`, label: `Products - ${g.group}` }));
                    setResourcePermissions([...baseResources, ...dynamicResources]);
                } catch (e) {
                    console.warn('Failed to build dynamic permissions from categories', e);
                }
            } catch (e) {
                console.warn('Failed to load roles', e);
            }
        })();
        return () => { mounted = false; };
  }, []);

    // menuPermissions and resourcePermissions are built dynamically and stored in state
    // They default to empty until categories are loaded (built in useEffect)

  const handleAddRole = () => {
      (async () => {
        if(!newRoleName) return;
        const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
        const newRole: Role = {
            id: newRoleName.toLowerCase().replace(/\s+/g, '_'),
            businessId: currentUser?.businessId || '',
            name: newRoleName,
            permissions: ['dashboard']
        };
        const updated = [...roles, newRole];
        setRoles(updated);
        try { if (db.roles && db.roles.save) await db.roles.save(updated); }
        catch (e) { console.warn('Failed to save roles', e); }
        setNewRoleName('');
      })();
  };

  const togglePermission = (permId: string) => {
    if (!selectedRole) return;
    
    let newPerms;
    if (selectedRole.permissions.includes(permId)) {
        newPerms = selectedRole.permissions.filter(p => p !== permId);
    } else {
        newPerms = [...selectedRole.permissions, permId];
    }

    updateRolePermissions(newPerms);
  };

  const updateRolePermissions = (newPerms: string[]) => {
    if (!selectedRole) return;
    const updatedRole = { ...selectedRole, permissions: newPerms };
    const updatedRoles = roles.map(r => r.id === updatedRole.id ? updatedRole : r);
    setRoles(updatedRoles);
    setSelectedRole(updatedRole);
    db.roles.save(updatedRoles);
  };

  const toggleResourceAction = (resourceId: string, action: 'create' | 'read' | 'update' | 'delete') => {
      if (!selectedRole) return;
      const permString = `${resourceId}:${action}`;
      togglePermission(permString);
  };

  // Locations CRUD handlers
  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) return;
    try {
      setLoadingLocations(true);
      const result = await db.locations.add({
        id: Date.now().toString(),
        name: newLocation.name,
        address: newLocation.address
      });
      if (result && result.success) {
        const updatedLocations = await db.locations.getAll();
        setLocations(Array.isArray(updatedLocations) ? updatedLocations : []);
        setNewLocation({ name: '', address: '' });
      }
    } catch (err) {
      console.error('Failed to add location', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    try {
      setLoadingLocations(true);
      const result = await db.locations.update(editingLocation.id, {
        name: editingLocation.name,
        address: editingLocation.address
      });
      if (result && result.success) {
        const updatedLocations = await db.locations.getAll();
        setLocations(Array.isArray(updatedLocations) ? updatedLocations : []);
        setEditingLocation(null);
      }
    } catch (err) {
      console.error('Failed to update location', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      setLoadingLocations(true);
      const result = await db.locations.delete(locId);
      if (result && result.success) {
        const updatedLocations = await db.locations.getAll();
        setLocations(Array.isArray(updatedLocations) ? updatedLocations : []);
      }
    } catch (err) {
      console.error('Failed to delete location', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
            <p className="text-slate-500">Manage roles, permissions, and stock locations.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <Shield size={18} /> Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'locations'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <MapPin size={18} /> Stock Locations
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-800">Roles</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {roles.map(role => (
                      <button
                          key={role.id}
                          onClick={() => setSelectedRole(role)}
                          className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedRole?.id === role.id ? 'bg-brand-50 border-l-4 border-brand-500' : ''}`}
                      >
                          <span className="font-medium text-slate-700">{role.name}</span>
                          <Shield className="w-4 h-4 text-slate-400" />
                      </button>
                  ))}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <div className="flex gap-2">
                      <input 
                          type="text" 
                          placeholder="New Role Name" 
                          className="w-full text-sm border rounded px-2 outline-none focus:border-brand-500"
                          value={newRoleName}
                          onChange={e => setNewRoleName(e.target.value)}
                      />
                      <button onClick={handleAddRole} className="bg-brand-600 text-white p-2 rounded hover:bg-brand-700">
                          <Plus size={16} />
                      </button>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {selectedRole ? (
                  <>
                      <div className="mb-6 border-b pb-4">
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              {selectedRole.name} 
                              <span className="text-xs font-normal text-white bg-slate-800 px-2 py-1 rounded">
                                  {selectedRole.id}
                              </span>
                          </h2>
                      </div>

                      <div className="space-y-8">
                          {/* Menu Access */}
                          <div>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Menu size={16}/> Menu Access
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {menuPermissions.map(perm => {
                                      const hasPerm = selectedRole.permissions.includes(perm.id);
                                      return (
                                          <div 
                                              key={perm.id}
                                              onClick={() => togglePermission(perm.id)}
                                              className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between text-sm ${
                                                  hasPerm 
                                                  ? 'border-brand-500 bg-brand-50 shadow-sm' 
                                                  : 'border-slate-200 hover:border-slate-300'
                                              }`}
                                          >
                                              <span className={`font-medium ${hasPerm ? 'text-brand-900' : 'text-slate-600'}`}>
                                                  {perm.label}
                                              </span>
                                              {hasPerm && <Check size={14} className="text-brand-600" />}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Resource Permissions */}
                          <div>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Database size={16}/> Data Resources (CRUD)
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {resourcePermissions.map(res => {
                                      // Check if any permission exists for this resource
                                      const hasAny = ['create', 'read', 'update', 'delete'].some(act => 
                                          selectedRole.permissions.includes(`${res.id}:${act}`)
                                      );
                                      
                                      return (
                                          <div 
                                              key={res.id}
                                              onClick={() => setEditingResource(res)}
                                              className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                                                  hasAny
                                                  ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                                                  : 'border-slate-200 hover:border-slate-300'
                                              }`}
                                          >
                                              <div className="flex items-center gap-3">
                                                  <Settings size={18} className={hasAny ? 'text-indigo-600' : 'text-slate-400'} />
                                                  <div>
                                                      <span className={`font-medium ${hasAny ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                          {res.label}
                                                      </span>
                                                      <div className="flex gap-1 mt-1">
                                                          {['C','R','U','D'].map((l, i) => {
                                                              const act = ['create', 'read', 'update', 'delete'][i];
                                                              const active = selectedRole.permissions.includes(`${res.id}:${act}`);
                                                              return (
                                                                  <span key={act} className={`text-[10px] font-bold px-1 rounded ${active ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-400'}`}>
                                                                      {l}
                                                                  </span>
                                                              )
                                                          })}
                                                      </div>
                                                  </div>
                                              </div>
                                              <button className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">
                                                  Configure
                                              </button>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  </>
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                      Select a role to edit permissions
                  </div>
              )}
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <MapPin size={20} /> Create New Location
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Main Warehouse, Branch Office"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <input
                  type="text"
                  placeholder="e.g., 123 Main St, City"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                />
              </div>
            </div>
            
            <button
              onClick={handleAddLocation}
              disabled={!newLocation.name.trim() || loadingLocations}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-700 disabled:bg-slate-400 flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> {loadingLocations ? 'Adding...' : 'Add Location'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">All Locations</h2>
              <p className="text-sm text-slate-600 mt-1">{locations.length} location(s) available</p>
            </div>
            
            {locations.length === 0 ? (
              <div className="p-12 text-center">
                <MapPin size={40} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No locations created yet. Create one above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {locations.map((location) => (
                  <div key={location.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-4 flex-1">
                      <MapPin size={20} className="text-brand-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{location.name}</h3>
                        {location.address && <p className="text-sm text-slate-600 mt-1">{location.address}</p>}
                        <p className="text-xs text-slate-500 mt-2 font-mono">{location.id}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingLocation(location)}
                        className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Edit location"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
                        title="Delete location"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={20} /> Edit Location
              </h3>
              <button onClick={() => setEditingLocation(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location Name</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500"
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500"
                  value={editingLocation.address || ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingLocation(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLocation}
                disabled={loadingLocations}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                <Save size={16} /> {loadingLocations ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Granular Permission Modal */}
      {editingResource && selectedRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800">Permissions: {editingResource.label}</h3>
                      <button onClick={() => setEditingResource(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                      <div className="space-y-3">
                      {[
                          { id: 'create', label: 'Create', desc: 'Can add new records' },
                          { id: 'read', label: 'Read', desc: 'Can view records' },
                          { id: 'update', label: 'Update', desc: 'Can edit existing records' },
                          { id: 'delete', label: 'Delete', desc: 'Can remove records' }
                      ].map(action => {
                          const permKey = `${editingResource.id}:${action.id}`;
                          const isChecked = selectedRole.permissions.includes(permKey);
                          
                          return (
                              <label key={action.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    checked={isChecked}
                                    onChange={() => toggleResourceAction(editingResource.id, action.id as any)}
                                  />
                                  <div>
                                      <span className="font-medium text-slate-800 block">{action.label}</span>
                                      <span className="text-xs text-slate-500">{action.desc}</span>
                                  </div>
                              </label>
                          )
                      })}
                  </div>

                  <button onClick={() => setEditingResource(null)} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold mt-6">
                      Done
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Admin;