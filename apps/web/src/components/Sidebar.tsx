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
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'WhatsApp', icon: MessageSquare },
  { href: '/tickets', label: 'Reclamos', icon: Ticket },
  { href: '/knowledge', label: 'Información', icon: BookOpen },
  { href: '/tracking', label: 'Track & Trace', icon: Package },
  { href: '/quotes', label: 'Facturación', icon: FileText },
  { href: '/surveys', label: 'Encuestas', icon: BarChart3 },
  { href: '/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/observability', label: 'Monitoreo', icon: Activity },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col">
      {/* Header con logo/brand */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-lg font-semibold">ElectroCentro</span>
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
