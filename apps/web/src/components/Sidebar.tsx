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
  Receipt,
  FileText,
  BarChart3,
  Bell,
  Activity,
  Settings
} from 'lucide-react';

const menuItems = [
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
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
    <div className="w-20 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col items-center py-4">
      {/* Logo/Icon at top */}
      <div className="mb-8">
        <LayoutDashboard className="w-6 h-6 text-white" />
      </div>
      
      {/* Navigation items */}
      <nav className="flex-1 space-y-2 w-full px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-colors group relative',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User profile at bottom */}
      <div className="mt-auto">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          IM
        </div>
      </div>
    </div>
  );
}
