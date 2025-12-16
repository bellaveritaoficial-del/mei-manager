import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Users, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface Customer {
    id: string;
    kind: 'pf' | 'pj';
    name: string;
    cpf_hash?: string;
    cpf_last4?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    created_at: string;
}

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            toast.error('Erro ao carregar clientes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.cnpj && c.cnpj.includes(search))
    );

    const handleCreate = async () => {
        // Simple fast creation or redirect to new page
        // For now, let's create a placeholder and redirect to profile
        // Or actually, redirect to a "new" route?
        // Let's create a stub record for now to landing on profile? Or better, a Dialog.
        // Simplified: Just an empty profile page logic handling "new".
        // navigating to /clientes/new
        navigate('/clientes/new');
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-12 lg:pt-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clientes</h1>
                        <p className="text-muted-foreground mt-1">Gerencie sua base de clientes PF e PJ</p>
                    </div>
                    <Button onClick={handleCreate} className="gap-2 w-full sm:w-auto">
                        <Plus className="w-4 h-4" />
                        Novo Cliente
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <CardTitle>Lista de Clientes</CardTitle>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome, email, cpf/cnpj..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhum cliente encontrado</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Documento</TableHead>
                                            <TableHead>Contato</TableHead>
                                            <TableHead className="hidden md:table-cell">Tags</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCustomers.map((customer) => (
                                            <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clientes/${customer.id}`)}>
                                                <TableCell>
                                                    {customer.kind === 'pj' ? <User className="w-4 h-4" /> : <User className="w-4 h-4 text-green-600" />}
                                                </TableCell>
                                                <TableCell className="font-medium">{customer.name}</TableCell>
                                                <TableCell>
                                                    {customer.kind === 'pj' ? customer.cnpj : `***.${customer.cpf_last4}`}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    <div>{customer.email}</div>
                                                    <div>{customer.phone}</div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {customer.tags?.map(tag => (
                                                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon">
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
};

export default Customers;
