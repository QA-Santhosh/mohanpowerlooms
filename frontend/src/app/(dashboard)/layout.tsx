'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  History, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  User as UserIcon,
  Scissors,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Camera
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sidebar toggle state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);

  // Search input functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [workersList, setWorkersList] = useState<any[]>([]);

  // Profile picture states
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== 'WORKER') {
      api.get<any[]>('/workers').then(setWorkersList).catch(() => {});
    }
  }, [user]);

  // Read saved profile avatar from LocalStorage on mount
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`mpl_avatar_${user.id}`);
      setAvatarImage(saved);
    }
  }, [user]);

  // Keyboard shortcut listener ctrl+s or cmd+s
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setIsSearchFocused(true);
        setIsCollapsed(false);
        const inputEl = document.querySelector('input[placeholder="Search"]') as HTMLInputElement;
        if (inputEl) inputEl.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      fetchNotifications();
    } catch (e) {
      // Ignore
    }
  };

  const updateAvatar = (newAvatar: string | null) => {
    if (user) {
      if (newAvatar) {
        localStorage.setItem(`mpl_avatar_${user.id}`, newAvatar);
        setAvatarImage(newAvatar);
      } else {
        localStorage.removeItem(`mpl_avatar_${user.id}`);
        setAvatarImage(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-slate-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  // Nav items based on roles
  const allNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'SUPERVISOR', 'WORKER'] },
    { name: 'Workers', href: '/workers', icon: Users, roles: ['SUPER_ADMIN', 'SUPERVISOR'] },
    { name: 'Saree Types', href: '/saree-types', icon: Scissors, roles: ['SUPER_ADMIN', 'SUPERVISOR'] },
    { name: 'Warp Yarns', href: '/warps', icon: Layers, roles: ['SUPER_ADMIN', 'SUPERVISOR'] },
    { name: 'Production Logs', href: '/production', icon: History, roles: ['SUPER_ADMIN', 'SUPERVISOR', 'WORKER'] },
    { name: 'Salary & Banking', href: '/salary', icon: DollarSign, roles: ['SUPER_ADMIN', 'WORKER'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['SUPER_ADMIN', 'SUPERVISOR'] },
    { name: 'Audit History', href: '/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
  ];

  const allowedNavItems = allNavItems.filter(item => item.roles.includes(user.role));
  const userInitials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  const getPageTitle = () => {
    const item = allNavItems.find(item => item.href === pathname);
    return item ? item.name : 'Mohan Looms';
  };

  // Perform search query filtering
  const getSearchResults = () => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    const results: any[] = [];

    // Search pages
    allowedNavItems.forEach(item => {
      if (item.name.toLowerCase().includes(query)) {
        results.push({
          id: `page-${item.href}`,
          title: item.name,
          subtitle: 'Navigation Page',
          href: item.href,
          icon: item.icon,
        });
      }
    });

    // Search workers
    workersList.forEach(w => {
      const fullName = `${w.firstName} ${w.lastName}`.toLowerCase();
      if (fullName.includes(query) || w.workerId.toLowerCase().includes(query)) {
        results.push({
          id: `worker-${w.id}`,
          title: `${w.firstName} ${w.lastName}`,
          subtitle: `Worker (${w.workerId})`,
          href: `/workers/${w.id}`,
          icon: Users,
        });
      }
    });

    return results.slice(0, 8);
  };

  const searchResults = getSearchResults();

  // Mock messaging contacts matching Dribbble layout
  const mockContacts = [
    { name: 'Ester Howard', status: 'active', avatar: 'EH', color: 'bg-emerald-500' },
    { name: 'Jacob Jones', status: 'busy', avatar: 'JJ', color: 'bg-rose-500' },
    { name: 'Cody Fisher', status: 'active', avatar: 'CF', color: 'bg-emerald-500' },
  ];

  const hasDashboardAccess = allowedNavItems.some(i => i.href === '/dashboard');
  const showSareeTypes = allowedNavItems.some(i => i.href === '/saree-types');
  const showWarps = allowedNavItems.some(i => i.href === '/warps');

  // Filter out Dashboard nested sub-links from the primary navigation listing on the sidebar
  const mainSidebarItems = allowedNavItems.filter(item => 
    item.href !== '/dashboard' && item.href !== '/saree-types' && item.href !== '/warps'
  );

  // Gradient presets for luxury feel avatar fallback options
  const presetGradients = [
    { name: 'Emerald Gold', value: 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400' },
    { name: 'Royal Velvet', value: 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-rose-500' },
    { name: 'Midnight Chrome', value: 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-650' },
    { name: 'Sunset Bronze', value: 'bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400' },
    { name: 'Ocean Quartz', value: 'bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400' },
    { name: 'Rose Gold', value: 'bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-300' },
  ];

  // Helper renderer for dynamic profile avatars
  const renderAvatar = (sizeClass = "h-9 w-9") => {
    const isGradient = avatarImage && avatarImage.startsWith('bg-');
    const isImage = avatarImage && avatarImage.startsWith('data:image/');

    return (
      <Avatar className={`${sizeClass} border-2 border-amber-500/40 ring-1 ring-amber-500/20 shadow-md relative overflow-hidden flex-shrink-0 cursor-pointer`}>
        {isImage ? (
          <img src={avatarImage!} alt="User Avatar" className="h-full w-full object-cover" />
        ) : isGradient ? (
          <div className={`h-full w-full flex items-center justify-center text-slate-50 font-extrabold ${avatarImage}`}>
            <span className={sizeClass.includes('h-24') ? 'text-2xl font-black' : 'text-[10px]'}>{userInitials}</span>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-50 font-extrabold bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-400">
            <span className={sizeClass.includes('h-24') ? 'text-2xl font-black' : 'text-[10px]'}>{userInitials}</span>
          </div>
        )}
      </Avatar>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">
      {/* 1. Left Sidebar Navigation Panel */}
      <aside className={`relative hidden xl:flex flex-col bg-slate-900 border-r border-slate-850 sticky top-0 h-screen transition-all duration-300 ease-in-out z-45 ${isCollapsed ? 'w-[76px]' : 'w-[260px]'}`}>
        
        {/* Toggle Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-[-12px] top-6 z-50 h-6 w-6 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-200 shadow-md cursor-pointer transition focus:outline-none"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Sidebar Logo Header */}
        <div className="h-16 flex items-center px-6 gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-900 shadow-[0_0_8px_#10b981] flex-shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="font-black text-xs tracking-wider text-slate-100 uppercase truncate">MOHAN LOOMS</span>
          )}
        </div>

        {/* Dynamic Global search bar */}
        <div className="px-3 py-2">
          {isCollapsed ? (
            <button 
              onClick={() => {
                setIsCollapsed(false);
                setTimeout(() => {
                  const inputEl = document.querySelector('input[placeholder="Search"]') as HTMLInputElement;
                  if (inputEl) inputEl.focus();
                }, 100);
              }}
              className="mx-auto h-9 w-9 bg-slate-850/40 border border-slate-800/80 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 transition focus:outline-none cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full h-9 bg-slate-850/40 border border-slate-800/80 rounded-xl pl-9 pr-10 text-xs font-semibold text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"
              />
              <kbd className="absolute right-2.5 top-2.5 h-4 px-1.5 rounded bg-slate-800 border border-slate-750 text-[8px] font-bold text-slate-500 font-mono flex items-center justify-center pointer-events-none">
                ⌘S
              </kbd>

              {/* Dynamic Floating Search Dropdown */}
              {isSearchFocused && (searchQuery || searchResults.length > 0) && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSearchFocused(false)} />
                  <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 max-h-64 overflow-y-auto divide-y divide-slate-850 z-50">
                    {searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 font-medium">No records found</div>
                    ) : (
                      searchResults.map((res) => {
                        const IconComp = res.icon;
                        return (
                          <Link
                            key={res.id}
                            href={res.href}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-850/60 transition cursor-pointer text-left w-full"
                          >
                            <div className="p-1.5 bg-slate-950/40 text-emerald-500 rounded-md">
                              <IconComp className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">{res.title}</p>
                              <span className="text-[9px] text-slate-500 font-medium block truncate">{res.subtitle}</span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          
          {/* Main Directory Area */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-6 mb-2">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Main</span>
              </div>
            )}

            {/* Collapsible Dashboard Submenu with Tree Connectors */}
            {hasDashboardAccess && (
              <div className="space-y-1">
                {isCollapsed ? (
                  <div className="group relative">
                    <Link
                      href="/dashboard"
                      className={`flex h-10 w-10 mx-auto rounded-xl items-center justify-center transition-all ${
                        pathname === '/dashboard' || pathname === '/saree-types' || pathname === '/warps'
                          ? 'bg-slate-855 text-emerald-500'
                          : 'text-slate-550 hover:text-slate-200 hover:bg-slate-850/50'
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Link>
                    <div className="absolute left-full top-0 ml-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 hidden group-hover:block z-50">
                      <div className="text-[10px] font-bold text-slate-550 px-2 py-1 uppercase tracking-wider">Dashboard</div>
                      <Link href="/dashboard" className="block text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 p-2 rounded-lg font-bold">Overview</Link>
                      {showSareeTypes && <Link href="/saree-types" className="block text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 p-2 rounded-lg font-bold">Saree Types</Link>}
                      {showWarps && <Link href="/warps" className="block text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 p-2 rounded-lg font-bold">Warp Yarns</Link>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 px-3">
                    <button
                      onClick={() => setDashboardOpen(!dashboardOpen)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                        pathname === '/dashboard' || pathname === '/saree-types' || pathname === '/warps'
                          ? 'bg-slate-850/60 text-slate-100'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-850/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </div>
                      {dashboardOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {dashboardOpen && (
                      <div className="pl-6 border-l border-slate-800 ml-5 mt-1 space-y-1 flex flex-col">
                        <Link
                          href="/dashboard"
                          className={`block px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                            pathname === '/dashboard'
                              ? 'text-emerald-500 font-bold bg-emerald-500/5'
                              : 'text-slate-500 hover:text-slate-200'
                          }`}
                        >
                          Overview
                        </Link>
                        {showSareeTypes && (
                          <Link
                            href="/saree-types"
                            className={`block px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                              pathname === '/saree-types'
                                ? 'text-emerald-500 font-bold bg-emerald-500/5'
                                : 'text-slate-500 hover:text-slate-200'
                            }`}
                          >
                            Saree Types
                          </Link>
                        )}
                        {showWarps && (
                          <Link
                            href="/warps"
                            className={`block px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                              pathname === '/warps'
                                ? 'text-emerald-500 font-bold bg-emerald-500/5'
                                : 'text-slate-500 hover:text-slate-200'
                            }`}
                          >
                            Warp Yarns
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Other Sidebar menu links */}
            <div className="space-y-1">
              {mainSidebarItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href;
                return isCollapsed ? (
                  <div key={item.name} className="group relative">
                    <Link
                      href={item.href}
                      className={`flex h-10 w-10 mx-auto rounded-xl items-center justify-center transition-all ${
                        isActive 
                          ? 'bg-slate-855 text-emerald-500' 
                          : 'text-slate-555 hover:text-slate-200 hover:bg-slate-850/50'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </Link>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl px-3 py-1.5 hidden group-hover:block z-50 text-xs text-slate-200 font-bold whitespace-nowrap">
                      {item.name}
                    </div>
                  </div>
                ) : (
                  <div key={item.name} className="px-3">
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-slate-850/60 text-slate-100 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-850/50'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dribbble Style Messages Feed */}
          <div className="space-y-1">
            {isCollapsed ? (
              <div className="mt-4 space-y-3">
                <div className="text-center">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-wide">MSG</span>
                </div>
                <div className="space-y-2.5 flex flex-col items-center">
                  {mockContacts.map(c => (
                    <div key={c.name} className="relative group cursor-pointer">
                      <Avatar className="h-7 w-7 bg-slate-800 text-slate-350 font-bold border border-slate-750">
                        <AvatarFallback className="text-[10px] font-black">{c.avatar}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-slate-900 ${c.color}`} />
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-slate-200 hidden group-hover:block z-50 whitespace-nowrap">
                        {c.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 px-3">
                <div className="flex items-center justify-between px-3">
                  <span className="text-[10px] font-bold text-slate-555 uppercase tracking-widest">Messages</span>
                  <button className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {mockContacts.map(c => (
                    <div key={c.name} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-850/30 transition-all cursor-pointer">
                      <div className="relative">
                        <Avatar className="h-7 w-7 bg-slate-800 text-slate-300 font-bold border border-slate-750">
                          <AvatarFallback className="text-[10px] font-black">{c.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-slate-900 ${c.color}`} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Bottom Profile Section */}
        {isCollapsed ? (
          <div className="mt-auto border-t border-slate-850 py-4 flex flex-col items-center gap-3">
            <div className="group relative cursor-pointer">
              {renderAvatar("h-9 w-9")}
              <div className="absolute left-full bottom-0 ml-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 hidden group-hover:block z-50 animate-in fade-in-50 duration-100">
                <div className="px-2 py-1">
                  <div className="text-xs font-bold text-slate-200">{user.firstName} {user.lastName}</div>
                  <div className="text-[10px] text-slate-550">{user.email}</div>
                </div>
                <div className="h-px bg-slate-800 my-1.5" />
                <button 
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-850/60 hover:text-slate-100 transition text-left cursor-pointer focus:outline-none"
                >
                  <Camera className="h-3.5 w-3.5 text-slate-450" /> Set Avatar Picture
                </button>
                <div className="h-px bg-slate-800 my-1.5" />
                <button 
                  onClick={logout} 
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition text-left cursor-pointer focus:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" /> Log Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-auto border-t border-slate-850 p-4 flex items-center justify-between">
            <div 
              onClick={() => setIsAvatarDialogOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Click to update picture"
            >
              {renderAvatar("h-9 w-9 group-hover:scale-[1.03] transition-all")}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-200 max-w-[110px] truncate">{user.firstName} {user.lastName}</span>
                <span className="text-[10px] text-slate-500 capitalize truncate">{user.role.toLowerCase().replace('_', ' ')}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-slate-500 hover:text-rose-500 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-850/50 focus:outline-none"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

      </aside>

      {/* 2. Right Workspace Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Workspace Top header bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-855 sticky top-0 backdrop-blur-xl z-40">
          
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Hamburger Trigger */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="xl:hidden text-slate-400 hover:text-slate-200"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="hidden xl:block text-sm font-black text-slate-100 tracking-wide uppercase">{getPageTitle()}</h2>
          </div>

          {/* Header Action elements */}
          <div className="flex items-center gap-4">
            
            {/* Notification Dropdown panel */}
            <div className="relative">
              <button 
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="text-slate-400 relative hover:bg-slate-850/50 p-2 rounded-md flex items-center justify-center cursor-pointer transition focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                      <span className="font-bold text-sm text-slate-100">Notifications</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => {
                            handleMarkAllRead();
                            setNotificationsOpen(false);
                          }} 
                          className="text-emerald-500 hover:text-emerald-400 text-xs font-bold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-850">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-semibold">No alerts found</div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 hover:bg-slate-850/10 transition ${!n.read ? 'bg-slate-850/20 border-l-2 border-emerald-500' : ''}`}
                          >
                            <div className="font-bold text-xs text-slate-200">{n.title}</div>
                            <div className="text-[11px] text-slate-500 mt-1 font-semibold">{n.message}</div>
                            <div className="text-[9px] text-slate-550 mt-2 font-mono">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown panel */}
            <div className="relative">
              <button 
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-850/50 text-slate-400 rounded-md transition cursor-pointer focus:outline-none"
              >
                {renderAvatar("h-8 w-8")}
                <span className="hidden sm:inline text-xs font-bold text-slate-300">{user.firstName}</span>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-2 py-1.5">
                      <div className="text-sm font-bold text-slate-100">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-slate-500 font-semibold">{user.email}</div>
                    </div>
                    <div className="-mx-2 my-1.5 h-px bg-slate-800" />
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        setIsAvatarDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-350 hover:bg-slate-850/60 hover:text-slate-100 transition text-left cursor-pointer focus:outline-none"
                    >
                      <Camera className="h-4 w-4 text-slate-450" /> Set Profile Picture
                    </button>
                    {user.workerProfile && (
                      <Link 
                        href={`/workers/${user.workerProfile.id}`} 
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-350 hover:bg-slate-850/60 hover:text-slate-100 transition"
                      >
                        <UserIcon className="h-4 w-4 text-slate-450" /> View My Profile
                      </Link>
                    )}
                    <div className="-mx-2 my-1.5 h-px bg-slate-800" />
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-455 transition text-left cursor-pointer focus:outline-none"
                    >
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Scrollable Work Yield */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* 3. Collapsible Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden bg-slate-950/60 backdrop-blur-sm transition-opacity duration-350">
          <div className="relative w-64 max-w-sm bg-slate-900 border-r border-slate-800 flex flex-col p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-slate-400"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="h-10 flex items-center gap-2 px-2 mb-6">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="font-black text-sm tracking-wider text-slate-100">MOHAN LOOMS</span>
            </div>

            <nav className="flex-1 space-y-1">
              {allowedNavItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      isActive 
                        ? 'bg-slate-800 text-slate-100 font-bold' 
                        : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-250'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
              {renderAvatar("h-9 w-9")}
              <div>
                <p className="text-sm font-bold text-slate-200">{user.firstName} {user.lastName}</p>
                <span className="text-xs text-slate-500 font-semibold capitalize">{user.role.toLowerCase().replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Luxury Profile Avatar Dialog Picker */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-md bg-slate-900 border-slate-800 text-slate-200 rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Update Profile Picture</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
              Upload your photo or choose one of our luxury gradient presets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            
            {/* Live Preview & File Selection Area */}
            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 flex flex-col items-center gap-4">
              <div className="relative group">
                {renderAvatar("h-24 w-24 border-4 border-amber-500/40 ring-2 ring-amber-500/10")}
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-slate-200 text-xs font-bold gap-1"
                >
                  <Camera className="h-4 w-4" /> Upload
                </label>
                <input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-300">Custom Photo Upload</p>
                <p className="text-[10px] text-slate-550 mt-0.5">Supports JPG, PNG, or GIF up to 2MB</p>
              </div>
            </div>

            {/* Preset Gradients Selector */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Luxury Presets</span>
              <div className="grid grid-cols-3 gap-3">
                {presetGradients.map((g) => {
                  const isSelected = avatarImage === g.value;
                  return (
                    <button
                      key={g.name}
                      onClick={() => updateAvatar(g.value)}
                      className={`h-11 rounded-2xl transition-all relative overflow-hidden flex items-center justify-center ${g.value} ${
                        isSelected 
                          ? 'ring-2 ring-amber-500 border-2 border-slate-900 scale-[1.04] shadow-md' 
                          : 'border border-slate-800 hover:scale-[1.02]'
                      } cursor-pointer`}
                      title={g.name}
                    >
                      <span className="text-[8px] font-black text-slate-50 uppercase bg-black/25 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                        {g.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/60 mt-6">
              {avatarImage ? (
                <button 
                  onClick={() => {
                    updateAvatar(null);
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer focus:outline-none"
                >
                  Remove Picture
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsAvatarDialogOpen(false)}
                  className="text-slate-455 hover:text-slate-250 text-xs font-bold cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
