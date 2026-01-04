'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
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
  { href: '/tracking', label: 'Track & Trace', icon: Package },
  { href: '/billing', label: 'Facturación', icon: Receipt },
  { href: '/quotes', label: 'Cotizaciones', icon: FileText },
  { href: '/surveys', label: 'Encuestas', icon: BarChart3 },
  { href: '/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/observability', label: 'Observabilidad', icon: Activity },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-card border-r h-screen fixed left-0 top-0 p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Centro de Gestión</h1>
        <p className="text-sm text-muted-foreground">Atención al Cliente IA</p>
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
