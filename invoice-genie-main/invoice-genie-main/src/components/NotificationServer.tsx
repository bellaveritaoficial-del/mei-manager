import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function NotificationServer() {
    useEffect(() => {
        // 1. Subscribe to realtime notifications for this user
        const subscribeToNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotif = payload.new as any;
                        // Display toast
                        toast(newNotif.title, {
                            description: newNotif.body,
                            action: {
                                label: 'Ver',
                                onClick: () => console.log('Undo'), // TODO: navigate to relevant page
                            },
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        subscribeToNotifications();

        // 2. Request Notification Permission (Web Push)
        // In a real app, this should be triggered by user action, not on mount ideally.
        // For now, checks permission state.
        if ('Notification' in window && Notification.permission === 'default') {
            // We can show a prompt or wait for user enabling in settings
        }

    }, []);

    return null;
}
