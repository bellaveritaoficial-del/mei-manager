import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Charge {
    id: string;
    title: string;
    amount: number;
    direction: 'pay' | 'receive';
    due_date: string;
    status: string;
    customer?: { name: string } | null;
}

interface RecentChargesProps {
    charges: Charge[];
    onSelect?: (charge: Charge) => void;
}

export function RecentCharges({ charges, onSelect }: RecentChargesProps) {
    const recentCharges = charges.slice(0, 5);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-500/10 text-green-500';
            case 'overdue': return 'bg-red-500/10 text-red-500';
            default: return 'bg-blue-500/10 text-blue-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Pago';
            case 'overdue': return 'Vencido';
            default: return 'Aberto';
        }
    };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Cobranças Recentes
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {recentCharges.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma cobrança encontrada
                    </div>
                ) : (
                    recentCharges.map((charge) => (
                        <div
                            key={charge.id}
                            onClick={() => onSelect?.(charge)}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                {charge.direction === 'receive' ? (
                                    <div className="p-2 rounded-full bg-green-500/10">
                                        <ArrowDownCircle className="w-4 h-4 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-full bg-red-500/10">
                                        <ArrowUpCircle className="w-4 h-4 text-red-500" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-sm">{charge.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Venc: {format(parseISO(charge.due_date), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-sm ${charge.direction === 'receive' ? 'text-green-500' : 'text-red-500'}`}>
                                    {charge.direction === 'receive' ? '+' : '-'} R$ {charge.amount.toFixed(2)}
                                </p>
                                <Badge variant="outline" className={`text-xs ${getStatusColor(charge.status)}`}>
                                    {getStatusLabel(charge.status)}
                                </Badge>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
