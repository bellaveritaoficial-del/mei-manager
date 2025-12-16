import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CreateChargeModal } from '@/components/finance/CreateChargeModal';

interface Charge {
    id: string;
    title: string;
    amount: number;
    direction: 'pay' | 'receive';
    due_date: string;
    status: 'open' | 'paid' | 'overdue' | 'canceled';
    customer?: { name: string };
}

const Charges = () => {
    const [charges, setCharges] = useState<Charge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activeTab, setActiveTab] = useState('lista');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchCharges();
    }, []);

    const fetchCharges = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('charges')
                .select('*, customer:customers(name)')
                .order('due_date', { ascending: true });

            if (error) throw error;
            setCharges(data || []);
        } catch (error) {
            console.error('Error fetching charges:', error);
            toast.error('Erro ao carregar cobranças');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'overdue': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
            case 'canceled': return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
            default: return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Pago';
            case 'overdue': return 'Vencido';
            case 'canceled': return 'Cancelado';
            default: return 'Em Aberto';
        }
    };

    const selectedDateCharges = charges.filter(c => date && isSameDay(parseISO(c.due_date), date));

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-12 lg:pt-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
                        <p className="text-muted-foreground mt-1">Contas a Pagar e Receber</p>
                    </div>
                    <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4" />
                        Nova Cobrança
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">A Receber (Mês)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {charges
                                    .filter(c => c.direction === 'receive' && c.status !== 'paid' && c.status !== 'canceled')
                                    .reduce((sum, c) => sum + c.amount, 0)
                                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">A Pagar (Mês)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {charges
                                    .filter(c => c.direction === 'pay' && c.status !== 'paid' && c.status !== 'canceled')
                                    .reduce((sum, c) => sum + c.amount, 0)
                                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Vencidos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {charges
                                    .filter(c => c.status === 'overdue')
                                    .reduce((sum, c) => sum + c.amount, 0)
                                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                        <TabsTrigger value="lista">Lista</TabsTrigger>
                        <TabsTrigger value="calendario">Calendário</TabsTrigger>
                    </TabsList>

                    <TabsContent value="lista">
                        <Card>
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Cliente/Fornecedor</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {charges.map((charge) => (
                                            <TableRow key={charge.id}>
                                                <TableCell>
                                                    {charge.direction === 'receive' ?
                                                        <ArrowDownCircle className="w-5 h-5 text-green-500" /> :
                                                        <ArrowUpCircle className="w-5 h-5 text-red-500" />
                                                    }
                                                </TableCell>
                                                <TableCell className="font-medium">{charge.title}</TableCell>
                                                <TableCell>{charge.customer?.name || '-'}</TableCell>
                                                <TableCell>{format(parseISO(charge.due_date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    R$ {charge.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getStatusColor(charge.status)}>
                                                        {getStatusLabel(charge.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {/* Actions */}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {charges.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    Nenhuma cobrança encontrada.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="calendario">
                        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                            <Card>
                                <CardContent className="p-4 flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        locale={ptBR}
                                        className="rounded-md border"
                                        modifiers={{
                                            hasEvent: (date) => charges.some(c => isSameDay(parseISO(c.due_date), date))
                                        }}
                                        modifiersStyles={{
                                            hasEvent: { fontWeight: 'bold', textDecoration: 'underline decoration-primary' }
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Dia {date ? format(date, 'dd/MM/yyyy') : 'Selecionado'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedDateCharges.length === 0 ? (
                                        <div className="text-muted-foreground">Nada agendado para este dia.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {selectedDateCharges.map(charge => (
                                                <div key={charge.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {charge.direction === 'receive' ?
                                                            <ArrowDownCircle className="w-5 h-5 text-green-500" /> :
                                                            <ArrowUpCircle className="w-5 h-5 text-red-500" />
                                                        }
                                                        <div>
                                                            <div className="font-medium">{charge.title}</div>
                                                            <div className="text-sm text-muted-foreground">{charge.customer?.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold">R$ {charge.amount.toFixed(2)}</div>
                                                        <Badge variant="outline" className={`text-xs ${getStatusColor(charge.status)}`}>
                                                            {getStatusLabel(charge.status)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <CreateChargeModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={fetchCharges}
            />
        </MainLayout>
    );
};

export default Charges;
