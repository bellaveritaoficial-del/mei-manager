import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Trash2, FileText, Wallet, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DocumentImportModal } from '@/components/invoice/DocumentImportModal';

const CustomerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    // States
    const [isLoading, setIsLoading] = useState(!isNew);
    const [isSaving, setIsSaving] = useState(false);
    const [customer, setCustomer] = useState<any>({
        kind: 'pf',
        name: '',
        tags: [],
        notes: ''
    });

    useEffect(() => {
        if (!isNew && id) {
            fetchCustomer(id);
        }
    }, [id, isNew]);

    const fetchCustomer = async (customerId: string) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();
            if (error) throw error;
            if (data) setCustomer(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Erro ao carregar cliente');
            navigate('/clientes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                name: customer.name,
                kind: customer.kind,
                cnpj: customer.cnpj,
                email: customer.email,
                phone: customer.phone,
                cep: customer.cep,
                street: customer.street,
                number: customer.number,
                complement: customer.complement,
                neighborhood: customer.neighborhood,
                city: customer.city,
                state: customer.state,
                notes: customer.notes
                // Add other fields as needed
            };

            let error;
            let data;

            if (isNew) {
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    console.error('Auth User Error:', authError);
                    toast.error('Erro de autenticação: Usuário não identificado. Tente fazer login novamente.');
                    setIsSaving(false);
                    return;
                }

                // Explicitly include user_id for RLS ownership
                const insertData = { ...payload, user_id: user.id };
                console.log('[DEBUG] Inserting Customer:', insertData);

                // @ts-ignore
                const { data: inserted, error: insertError } = await (supabase.from('customers') as any)
                    .insert(insertData)
                    .select()
                    .single();
                data = inserted;
                error = insertError;
            } else {
                // @ts-ignore
                const { data: updated, error: updateError } = await (supabase.from('customers') as any)
                    .update(payload)
                    .eq('id', id)
                    .select()
                    .single();
                data = updated;
                error = updateError;
            }

            if (error) throw error;

            toast.success(isNew ? 'Cliente criado!' : 'Cliente atualizado!');
            if (isNew && data) {
                navigate(`/clientes/${data.id}`, { replace: true });
            }
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleImportConfirm = (data: any) => {
        // 1. Auto-fill customer data if new or empty
        if (isNew) {
            setCustomer(prev => ({
                ...prev,
                name: data.customer?.name || prev.name,
                // Only fill if extraction succeeded
                kind: data.customer?.cpf_cnpj?.length > 11 ? 'pj' : 'pf',
                cnpj: data.customer?.cpf_cnpj,
                phone: data.customer?.phone || prev.phone,
                street: data.customer?.address?.street,
                number: data.customer?.address?.number,
                neighborhood: data.customer?.address?.neighborhood,
                city: data.customer?.address?.city,
                state: data.customer?.address?.state,
                cep: data.customer?.address?.cep,
            }));
            toast.success('Dados do cliente preenchidos via OCR!');
        }

        // 2. Schedule Charge creation (we can stash this in state to save after customer is saved, 
        // or just create it immediately if customer exists. For now, let's just fill the customer 
        // and notify that charge needs to be created - or ideally, create the charge in the future 
        // "Charges" tab automatically. 
        // Simplified approach for Phase 2: If we are in "New Customer" mode, we fill the form.
        // If we want to create the charge, we would need the customer ID first.

        if (data.charge) {
            toast.info("Cobrança identificada: " + data.charge.title + " - R$ " + data.charge.amount);
            // TODO: Persist charge after saving customer
        }
    };

    if (isLoading) return <MainLayout><div>Carregando...</div></MainLayout>;

    // Masking Helpers
    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value: string) => {
        const v = value.replace(/\D/g, '');
        if (v.length > 10) {
            return v
                .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else {
            return v
                .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        }
    };

    const formatCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')} className="shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-bold truncate leading-tight" title={customer.name}>
                                {isNew ? 'Novo Cliente' : customer.name || 'Cliente Sem Nome'}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {isNew ? 'Cadastro de Cliente' : customer.kind === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto ml-0 md:ml-auto pl-14 md:pl-0">
                        <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none">
                            <PenTool className="w-4 h-4 mr-2" />
                            Digitalizar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="flex-1 md:flex-none">
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="dados" className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="dados">Dados Principais</TabsTrigger>
                        {!isNew && <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>}
                        {!isNew && <TabsTrigger value="notas">Notas</TabsTrigger>}
                        {!isNew && <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="dados">
                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome Completo / Razão Social</Label>
                                        <Input
                                            value={customer.name}
                                            onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                            placeholder="Ex: Carlos Eduardo Silva"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <div className="flex gap-4 pt-2">
                                            <Label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="w-4 h-4 text-primary"
                                                    checked={customer.kind === 'pf'}
                                                    onChange={() => setCustomer({ ...customer, kind: 'pf' })}
                                                />
                                                Pessoa Física
                                            </Label>
                                            <Label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="w-4 h-4 text-primary"
                                                    checked={customer.kind === 'pj'}
                                                    onChange={() => setCustomer({ ...customer, kind: 'pj' })}
                                                />
                                                Pessoa Jurídica
                                            </Label>
                                        </div>
                                    </div>
                                    {customer.kind === 'pj' ? (
                                        <div className="space-y-2">
                                            <Label>CNPJ</Label>
                                            <Input
                                                value={customer.cnpj || ''}
                                                onChange={e => setCustomer({ ...customer, cnpj: formatCNPJ(e.target.value) })}
                                                placeholder="00.000.000/0000-00"
                                                maxLength={18}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label>CPF</Label>
                                            <Input
                                                value={customer.cnpj || ''} // Using 'cnpj' field for CPF as well in DB usually, or need to check schema. Assuming 'cnpj' holds the tax ID.
                                                onChange={e => setCustomer({ ...customer, cnpj: formatCPF(e.target.value) })}
                                                placeholder="000.000.000-00"
                                                maxLength={14}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            value={customer.email || ''}
                                            onChange={e => setCustomer({ ...customer, email: e.target.value })}
                                            type="email"
                                            placeholder="exemplo@email.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Telefone (WhatsApp)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={customer.phone || ''}
                                                onChange={e => setCustomer({ ...customer, phone: formatPhone(e.target.value) })}
                                                placeholder="(11) 99999-9999"
                                                maxLength={15}
                                            />
                                            {customer.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => window.open(`https://wa.me/55${customer.phone.replace(/\D/g, '')}`, '_blank')}
                                                    title="Abrir WhatsApp"
                                                >
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="font-semibold">Endereço</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>CEP</Label>
                                            <Input
                                                value={customer.cep || ''}
                                                onChange={e => setCustomer({ ...customer, cep: formatCEP(e.target.value) })}
                                                placeholder="00000-000"
                                                maxLength={9}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>Rua</Label>
                                            <Input
                                                value={customer.street || ''}
                                                onChange={e => setCustomer({ ...customer, street: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Número</Label>
                                            <Input
                                                value={customer.number || ''}
                                                onChange={e => setCustomer({ ...customer, number: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Complemento</Label>
                                            <Input
                                                value={customer.complement || ''}
                                                onChange={e => setCustomer({ ...customer, complement: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bairro</Label>
                                            <Input
                                                value={customer.neighborhood || ''}
                                                onChange={e => setCustomer({ ...customer, neighborhood: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cidade</Label>
                                            <Input
                                                value={customer.city || ''}
                                                onChange={e => setCustomer({ ...customer, city: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Estado</Label>
                                            <Input
                                                value={customer.state || ''}
                                                onChange={e => setCustomer({ ...customer, state: e.target.value })}
                                                maxLength={2}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Anotações</Label>
                                    <Input
                                        value={customer.notes || ''}
                                        onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                                        placeholder="Observações gerais sobre o cliente"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="assinaturas">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PenTool className="w-5 h-5" />
                                    Assinaturas
                                </CardTitle>
                                <CardDescription>Coleção de assinaturas digitais ou fotos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    Em breve: Upload de Assinatura
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notas">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Notas Vinculadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    Em breve: Lista de invoices
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cobrancas">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="w-5 h-5" />
                                    Cobranças
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    Em breve: Lista de charges
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <DocumentImportModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onConfirm={handleImportConfirm}
            />
        </MainLayout>
    );
};

export default CustomerProfile;
