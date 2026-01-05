'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  BookOpen,
  Package,
  FileText,
  BarChart3,
  Bell,
  Activity,
  Settings,
  ChevronDown,
  User
} from 'lucide-react';

const menuItems = [
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/knowledge', label: 'Información', icon: BookOpen },
  { href: '/tracking', label: 'Tracking', icon: Package },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/surveys', label: 'Surveys', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/observability', label: 'Observability', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col">
      {/* Header con Inbox y Customer */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Inbox</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2 text-white">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Customer</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
      
      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User profile at bottom */}
      <div className="p-4 border-t border-slate-700">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold mx-auto">
          IM
        </div>
      </div>
    </div>
  );
}
