import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Bell, Shield, Palette, Upload, Save, Building, Check, User, Mail, MapPin, Phone, FileText, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMEI } from "@/hooks/useMEI";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { config, updateConfig, isLoading } = useMEI();
  const [activeTab, setActiveTab] = useState("empresa");

  // Local state for form management
  const [formData, setFormData] = useState({
    razao_social: "",
    cnpj: "",
    inscricao_estadual: "",
    telefone: "",
    endereco: "",
    logo_url: "",
    favicon_url: "",
    notifications_vencimento: true,
    notifications_novas_notas: true,
    notifications_resumo: false,
    auth_2fa: false,
    backup_auto: false
  });

  // Sync with loaded config
  useEffect(() => {
    if (config) {
      // Explicitly spread object properties to satisfy TS or use a safeguard
      const safeConfig = config as any;
      setFormData(prev => ({
        ...prev,
        ...(safeConfig || {})
      }));
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formData);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeTab}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'favicon_url']: publicUrl
      }));

      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} carregado com sucesso! Não esqueça de Salvar.`);

    } catch (error: any) {
      toast.error(`Erro ao fazer upload: ${error.message}`);
      console.error(error);
    }
  };

  // AI Logo Generation
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);

  const handleGenerateLogo = async () => {
    if (!logoPrompt.trim()) {
      toast.error("Por favor, descreva sua marca primeiro.");
      return;
    }

    setIsGeneratingLogo(true);
    try {
      // Real Call to Edge Function
      const { data, error } = await supabase.functions.invoke('generate-logo', { body: { prompt: logoPrompt, type: 'logo' } });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (data?.image_url) {
        setGeneratedLogo(data.image_url);
        toast.success("Logo gerado com sucesso!");
      } else {
        throw new Error("Nenhuma imagem retornada.");
      }

    } catch (error: any) {
      toast.error("Erro ao gerar logo: " + (error.message || "Tente novamente."));
      console.error(error);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const NavItem = ({ value, icon: Icon, label, description }: { value: string; icon: any; label: string; description: string }) => (
    <TabsTrigger
      value={value}
      className={cn(
        "w-full flex items-center justify-start gap-4 p-4 rounded-xl transition-all data-[state=active]:bg-muted data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border",
        "hover:bg-muted/50"
      )}
    >
      <div className={cn("p-2 rounded-lg bg-background shadow-sm border", activeTab === value ? "text-primary border-primary/20" : "text-muted-foreground")}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </TabsTrigger>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-10 pt-12 md:pt-0">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">Configurações</h1>
            <p className="text-muted-foreground mt-2 text-lg">Gerencie a identidade e preferências do seu negócio</p>
          </div>
          <Button size="lg" onClick={handleSave} className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
            <Save className="w-5 h-5" />
            Salvar Alterações
          </Button>
        </div>

        <Tabs defaultValue="empresa" value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col md:flex-row gap-8">

          {/* Sidebar Navigation */}
          <div className="w-full md:w-80 space-y-2 md:sticky md:top-4 self-start">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-2 supports-[backdrop-filter]:bg-background/60">
              <NavItem value="empresa" icon={Building2} label="Dados da Empresa" description="CNPJ, Endereço e Contato" />
              <NavItem value="branding" icon={Palette} label="Identidade Visual" description="Logo, Favicon e Cores" />
              <NavItem value="notificacoes" icon={Bell} label="Notificações" description="Alertas e Emails" />
              <NavItem value="seguranca" icon={Shield} label="Segurança" description="Proteção e Backups" />
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">

            {/* TAB: EMPRESA */}
            <TabsContent value="empresa" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-2xl">Dados Cadastrais</CardTitle>
                  <CardDescription>Informações oficiais para emissão de notas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> Razão Social</Label>
                      <Input value={formData.razao_social} onChange={e => setFormData({ ...formData, razao_social: e.target.value })} placeholder="Ex: Minha Empresa Ltda" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> CNPJ</Label>
                      <Input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Inscrição Estadual</Label>
                      <Input value={formData.inscricao_estadual} onChange={e => setFormData({ ...formData, inscricao_estadual: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Telefone</Label>
                      <Input value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className="h-11" />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço Completo</Label>
                      <Input value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} className="h-11" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: BRANDING */}
            <TabsContent value="branding" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-2xl">Personalização</CardTitle>
                  <CardDescription>Defina como sua marca aparece no sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">

                  {/* Logo Row */}
                  <div className="flex flex-col md:flex-row gap-6 items-start p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="relative group w-32 h-32 flex-shrink-0 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-all">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground gap-2">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Logo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium">Trocar Imagem</p>
                      </div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleLogoUpload(e, 'logo')} />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">Logotipo Principal <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">Recomendado</span></h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Exibido no menu lateral, cabeçalho de notas fiscais e relatórios.
                        Recomendamos o uso de arquivo PNG com fundo transparente.
                      </p>
                    </div>
                  </div>

                  {/* Favicon Row */}
                  <div className="flex flex-col md:flex-row gap-6 items-start p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="relative group w-16 h-16 flex-shrink-0 bg-background rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-all">
                      {formData.favicon_url ? (
                        <img src={formData.favicon_url} className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Building2 className="w-6 h-6" />
                        </div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleLogoUpload(e, 'favicon')} />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">Favicon Desktop</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Ícone exibido na aba do navegador. Utilize uma versão simplificada do seu logo para melhor visibilidade em tamanhos pequenos (32x32px).
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Generator Section */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5" />
                      <h3 className="font-semibold text-lg">Gerador de Logo com IA</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Descreva sua empresa e cores, e nossa Inteligência Artificial criará sugestões exclusivas para você.
                    </p>

                    <div className="flex gap-4 flex-col">
                      <div className="flex-1">
                        <Label>Descrição da Marca</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Ex: Empresa de tecnologia sustentável, logo minimalista com folha e circuito, cores verde e cinza."
                            className="bg-background"
                            value={logoPrompt}
                            onChange={(e) => setLogoPrompt(e.target.value)}
                          />
                          <Button
                            variant="default"
                            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                            onClick={handleGenerateLogo}
                            disabled={isGeneratingLogo}
                          >
                            {isGeneratingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isGeneratingLogo ? "Criando..." : "Gerar"}
                          </Button>
                        </div>
                      </div>

                      {generatedLogo && (
                        <div className="mt-4 p-4 border rounded-lg bg-background animate-in fade-in slide-in-from-top-2">
                          <p className="text-sm font-medium mb-2">Resultado Gerado:</p>
                          <div className="flex items-center gap-6">
                            <img src={generatedLogo} alt="Generated Logo" className="w-32 h-32 object-contain border rounded-lg bg-white" />
                            <div className="space-y-2">
                              <Button size="sm" onClick={() => setFormData(prev => ({ ...prev, logo_url: generatedLogo || "" }))} className="w-full">
                                Usar como Logo
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setFormData(prev => ({ ...prev, favicon_url: generatedLogo || "" }))} className="w-full">
                                Usar como Favicon
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: NOTIFICATIONS */}
            <TabsContent value="notificacoes" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-2xl">Central de Notificações</CardTitle>
                  <CardDescription>Escolha o que é importante para você.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 pt-2 divide-y divide-border/40">
                  <div className="flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-medium text-base">Alertas de Vencimento</p>
                      <p className="text-sm text-muted-foreground">Receba avisos antes que suas notas vençam.</p>
                    </div>
                    <Switch checked={formData.notifications_vencimento} onCheckedChange={c => setFormData({ ...formData, notifications_vencimento: c })} />
                  </div>
                  <div className="flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-medium text-base">Captura de Notas</p>
                      <p className="text-sm text-muted-foreground">Seja notificado quando a IA processar novos documentos.</p>
                    </div>
                    <Switch checked={formData.notifications_novas_notas} onCheckedChange={c => setFormData({ ...formData, notifications_novas_notas: c })} />
                  </div>
                  <div className="flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-medium text-base">Relatório Mensal</p>
                      <p className="text-sm text-muted-foreground">Resumo completo do desempenho da sua empresa por email.</p>
                    </div>
                    <Switch checked={formData.notifications_resumo} onCheckedChange={c => setFormData({ ...formData, notifications_resumo: c })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: SECURITY */}
            <TabsContent value="seguranca" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-2xl">Segurança da Conta</CardTitle>
                  <CardDescription>Proteja seus dados financeiros.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 pt-2 divide-y divide-border/40">
                  <div className="flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-medium text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Autenticação em Duas Etapas</p>
                      <p className="text-sm text-muted-foreground">Adicione uma camada extra de proteção via app autenticador.</p>
                    </div>
                    <Switch checked={formData.auth_2fa} onCheckedChange={c => setFormData({ ...formData, auth_2fa: c })} />
                  </div>
                  <div className="flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-medium text-base">Backup Automático Diário</p>
                      <p className="text-sm text-muted-foreground">Cópia de segurança dos seus dados armazenada na nuvem.</p>
                    </div>
                    <Switch checked={formData.backup_auto} onCheckedChange={c => setFormData({ ...formData, backup_auto: c })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
