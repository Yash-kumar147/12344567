import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, BookmarkCheck, CheckCircle2, 
  Bot, Settings, Search, Bell, LogOut, GraduationCap, ChevronDown, 
  BookOpen, Users, AlertTriangle, ShieldCheck, X, Check, Clock, ArrowRight
} from 'lucide-react';
import { useAuth, DEMO_PRESETS } from '../context/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'timetable' | 'disruption' | 'system';
  link?: string;
}

export const Layout: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  // Role-appropriate default notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Spectra Venue Booking Request',
      message: 'New club booking request for Main Auditorium on Tuesday P6 awaiting approval.',
      time: '10m ago',
      read: false,
      type: 'booking',
      link: '/approvals'
    },
    {
      id: 'notif_2',
      title: 'Faculty Schedule Change Request',
      message: 'Dr. Arvind Sharma requested to relocate BS104 session to Friday P2.',
      time: '45m ago',
      read: false,
      type: 'timetable',
      link: '/timetable'
    },
    {
      id: 'notif_3',
      title: 'Lunch Period & Extended Slots Configured',
      message: '1-Hour protected lunch break between P5 & P6 active. Event slots P10-P13 online.',
      time: '2h ago',
      read: true,
      type: 'system',
      link: '/timetable'
    },
    {
      id: 'notif_4',
      title: 'Midsem Exam Schedule Published',
      message: '41 midsem exams scheduled with 50% anti-copy halved capacity rule.',
      time: '1d ago',
      read: true,
      type: 'timetable',
      link: '/exams'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setNotificationsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleRoleSwitch = async (role: any) => {
    setDropdownOpen(false);
    await quickLogin(role);
    navigate('/');
  };

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    badge?: string;
    adminOnly?: boolean;
    allowedRoles?: string[];
  }

  const allNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Timetable', path: '/timetable', icon: Calendar },
    { name: 'Bookings', path: '/bookings', icon: BookmarkCheck },
    // Task 2: Approvals present for Department Coordinator and Admins
    { name: 'Approvals', path: '/approvals', icon: CheckCircle2, allowedRoles: ['admin', 'coordinator'] },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
    { name: 'Exam Timetable', path: '/exams', icon: BookOpen },
    { name: 'Faculty Availability', path: '/faculty', icon: Users },
    // Task 1: Share Conflict Report only with Admin and Deputy Coordinator
    { name: 'Conflict Reports', path: '/conflicts', icon: AlertTriangle, allowedRoles: ['admin', 'coordinator', 'deputy_coordinator'] },
    { name: 'Audit History', path: '/audit', icon: ShieldCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.allowedRoles) {
      return item.allowedRoles.includes(user?.role || '');
    }
    return !item.adminOnly || user?.role === 'admin';
  });

  const getInitials = (name?: string) => {
    if (!name) return 'JD';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const filteredNotifications = notifications.filter(n => notifFilter === 'all' || !n.read);

  return (
    <div className="flex h-screen bg-page font-sans text-ink overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-line flex flex-col justify-between p-4 z-20">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-3 py-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-xl shadow-sm">
              CIT
            </div>
            <div>
              <div className="font-bold text-lg leading-tight text-brand">CIT</div>
              <div className="text-xs text-muted">Chilika Institute of Technology</div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-muted hover:text-ink hover:bg-page'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="w-5 h-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Banner */}
        <div>
          <div className="p-4 rounded-2xl bg-brand-tint border border-teal-200/50 text-center relative overflow-hidden">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-brand text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-brand-dark">Smarter Scheduling.</div>
            <div className="text-xs text-brand-dark opacity-90">A Better Campus.</div>
          </div>

          {/* User profile snippet */}
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between px-1">
            <div className="text-xs text-muted">Role: <span className="font-semibold text-ink uppercase">{user?.role || 'Guest'}</span></div>
            <button
              onClick={logout}
              title="Logout"
              className="text-muted hover:text-bad-text p-1.5 rounded-lg hover:bg-bad-bg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-line px-6 flex items-center justify-between z-10">
          {/* Search bar */}
          <div className="flex items-center gap-3 w-96 bg-page px-3.5 py-2 rounded-xl border border-line focus-within:border-brand transition-colors">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search for rooms, sessions or faculty..."
              className="bg-transparent text-sm w-full outline-none placeholder:text-muted"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Week indicator */}
            <div className="flex items-center gap-2 bg-page border border-line px-3 py-1.5 rounded-xl text-xs font-medium text-ink">
              <Calendar className="w-4 h-4 text-brand" />
              <span>Week 7 • 14 - 20 Apr, 2025</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted" />
            </div>

            {/* Task 1: Interactive Notification Bell & Inbox Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setDropdownOpen(false);
                }}
                className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
                  notificationsOpen ? 'bg-teal-50 text-brand' : 'hover:bg-page text-muted hover:text-ink'
                }`}
                title="Notifications Inbox"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notification Inbox Modal Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-card border border-line rounded-2xl shadow-2xl py-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-4 pb-3 border-b border-line flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">Notifications Inbox</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-brand hover:underline font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="px-4 py-2 bg-page/50 border-b border-line flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        notifFilter === 'all' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        notifFilter === 'unread' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {/* Notifications list */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-line">
                    {filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-page cursor-pointer transition-colors flex items-start gap-3 ${
                          !notif.read ? 'bg-teal-50/40' : ''
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                          notif.type === 'booking' ? 'bg-purple-100 text-purple-700' :
                          notif.type === 'timetable' ? 'bg-teal-100 text-teal-800' :
                          notif.type === 'disruption' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notif.type === 'booking' ? <BookmarkCheck className="w-4 h-4" /> :
                           notif.type === 'timetable' ? <Calendar className="w-4 h-4" /> :
                           notif.type === 'disruption' ? <AlertTriangle className="w-4 h-4" /> :
                           <Clock className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${!notif.read ? 'font-bold text-ink' : 'font-semibold text-ink/80'}`}>
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-muted shrink-0">{notif.time}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>

                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))}

                    {filteredNotifications.length === 0 && (
                      <div className="p-8 text-center text-xs text-muted">
                        No {notifFilter === 'unread' ? 'unread' : ''} notifications in inbox.
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pt-2 pb-1 border-t border-line text-center">
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] text-muted hover:text-ink font-medium"
                    >
                      Close Inbox
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown & Quick Role Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-page transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand text-white font-semibold text-xs flex items-center justify-center">
                  {getInitials(user?.name)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">{user?.name?.split(' ')[0] || 'User'}</div>
                  <div className="text-xs text-muted capitalize">{user?.role || 'Guest'}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card border border-line rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-line">
                    <p className="text-xs text-muted">Switch Demo Account:</p>
                  </div>
                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => handleRoleSwitch(p.role)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-page ${
                        user?.role === p.role ? 'font-bold text-brand bg-teal-50/50' : 'text-ink'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] text-muted">{p.email}</span>
                    </button>
                  ))}
                  <div className="border-t border-line mt-2 pt-2 px-2">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-1.5 text-xs text-bad-text hover:bg-bad-bg rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
