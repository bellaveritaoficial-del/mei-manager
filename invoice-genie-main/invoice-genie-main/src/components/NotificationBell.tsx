import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data as any as Notification[]);
            setUnreadCount((data as any as Notification[]).filter(n => !n.read_at).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to updates (new notifications) to refresh list
        // Reusing logic or just relying on open? For now simpler: fetch on mount/open
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchNotifications();
        });

        // Realtime refresher could be added here similar to NotificationServer
        const channel = supabase
            .channel('bell-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        }

    }, []);

    const markAsRead = async (id: string) => {
        await (supabase.from('notifications') as any).update({ read_at: new Date().toISOString() }).eq('id', id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 rounded-full">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhuma notificação.
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notif.read_at ? 'bg-muted/50' : ''}`}
                                onClick={() => markAsRead(notif.id)}
                            >
                                <div className="font-medium text-sm">{notif.title}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">{notif.body}</div>
                                <div className="text-[10px] text-muted-foreground text-right w-full mt-1">
                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
