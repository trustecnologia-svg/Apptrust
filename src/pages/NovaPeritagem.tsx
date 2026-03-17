import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Camera, Image as ImageIcon, X, CheckCircle, AlertCircle, Save, Info, ShieldCheck, FileSearch, ClipboardList } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { USIMINAS_ITEMS } from '../constants/usiminasItems';
import { STANDARD_ITEMS } from '../constants/standardItems';
import { CYLINDER_INSPECTION_MODEL } from '../constants/cylinderModel';
import { compressImage } from '../lib/imageUtils';
import { DIMENSIONAL_ANOMALIES_SERVICES } from '../constants/dimensionalItems';
import { syncPhotosToGallery } from '../lib/photoSync';
import type { SyncPhoto } from '../lib/photoSync';
import './NovaPeritagem.css';

type StatusColor = 'vermelho' | 'amarelo' | 'verde' | 'azul';

interface ChecklistItem {
    id: string;
    text: string;
    status: StatusColor;
    conformidade: 'conforme' | 'não conforme' | null;
    anomalia: string;
    solucao: string;
    fotos: string[];
    // Suporte a múltiplas anomalias/soluções
    anomaliasSet?: { value: string; isCustom: boolean }[];
    solucoesSet?: { value: string; isCustom: boolean }[];

    dimensoes?: string;
    qtd?: string;
    tipo?: 'componente' | 'vedação';
    unidade?: string;
    observacao?: string;
    diametro_encontrado?: string;
    diametro_ideal?: string;
    material_faltante?: string;
    // Novos campos dimensionais padronizados
    diametro_externo_encontrado?: string;
    diametro_externo_especificado?: string;
    desvio_externo?: string;
    diametro_interno_encontrado?: string;
    diametro_interno_especificado?: string;
    desvio_interno?: string;
    comprimento_encontrado?: string;
    comprimento_especificado?: string;
    desvio_comprimento?: string;
    isCustom?: boolean;
    isManualInput?: boolean;
    isCustomAnomaly?: boolean;
    isCustomSolucao?: boolean;
}



export const NovaPeritagem: React.FC = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(0); // 0: Seleção, 1: Formulário
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const camInputRef = React.useRef<HTMLInputElement>(null);
    const galleryInputRef = React.useRef<HTMLInputElement>(null);

    // Pergunta Inicial
    const [cylinderType, setCylinderType] = useState<'Cilindros' | null>(null);

    // Campos Fixos
    const [fixedData, setFixedData] = useState({
        tag: '',
        local_equipamento: '',
        data_inspecao: new Date().toISOString().split('T')[0],
        responsavel_tecnico: '',
        cliente: '',
        numero_os: '',
        ni: '',
        pedido: '',
        ordem: '',
        nota_fiscal: '',
        // Novos campos conforme imagem do formulário
        desenho_conjunto: '',
        tipo_modelo: '',
        fabricante: '',
        lubrificante: '',
        volume: '',
        acoplamento_polia: '',
        sistema_lubrificacao: '',

        outros_especificar: '',
        observacoes_gerais: '',
        area: '',
        linha: '',
        os_interna: '' // Novo campo interno
    });

    const [motivoRejeicao, setMotivoRejeicao] = useState<string | null>(null);

    const [isCustomClient, setIsCustomClient] = useState(false);
    const [empresas, setEmpresas] = useState<{ id: string, nome: string }[]>([]);

    const fetchEmpresas = async () => {
        const { data } = await supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome');
        if (data) setEmpresas(data);
    };

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const PREDEFINED_CLIENTS = [
        'GERDAU AÇOMINAS',
        'GEOSOL',
        'GEOSEDNA',
        'FERRO MAIS MINERAÇÃO',
        'IMIC'
    ];

    // Dimensões
    const [dimensions, setDimensions] = useState({
        diametroInterno: '',
        diametroHaste: '',
        curso: '',
        comprimentoTotal: '',
        diametroExterno: '',
        comprimentoHaste: '',
        montagem: '',
        pressaoNominal: '',
        fabricanteModelo: ''
    });

    const [fotoFrontal, setFotoFrontal] = useState<string>('');

    const frontalCameraRef = React.useRef<HTMLInputElement>(null);
    const frontalGalleryRef = React.useRef<HTMLInputElement>(null);

    // Checklist
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [vedacoes, setVedacoes] = useState<ChecklistItem[]>([]);

    useEffect(() => {
        if (!editId) {
            const osUrl = searchParams.get('os_interna');
            const clienteUrl = searchParams.get('cliente');
            const obsUrl = searchParams.get('obs');

            if (osUrl || clienteUrl) {
                setFixedData(prev => ({
                    ...prev,
                    os_interna: osUrl || prev.os_interna,
                    cliente: clienteUrl || prev.cliente,
                    observacoes_gerais: obsUrl || prev.observacoes_gerais
                }));
                // Mantemos step(0) para o perito selecionar o tipo de relatório desejado
            }
        }
    }, [searchParams, editId]);

    useEffect(() => {
        if (editId) {
            loadPeritagem(editId);
        }
    }, [editId]);

    const loadPeritagem = async (id: string) => {
        setLoading(true);
        try {
            // 1. Fetch Peritagem Data
            const { data: pData, error: pError } = await supabase
                .from('peritagens')
                .select('*')
                .eq('id', id)
                .single();

            if (pError) throw pError;

            if (pData.motivo_rejeicao) {
                setMotivoRejeicao(pData.motivo_rejeicao);
            }

            // 2. Fetch Analyses
            const { data: aData, error: aError } = await supabase
                .from('peritagem_analise_tecnica')
                .select('*')
                .eq('peritagem_id', id);

            if (aError) throw aError;

            // Populate States
            setStep(1);
            setCylinderType(pData.tipo_cilindro || 'Cilindros');
            setStep(1);
            setCylinderType(pData.tipo_cilindro || 'Cilindros');
            setFotoFrontal(pData.foto_frontal || '');

            // Validação de Segurança para Perito
            if (role === 'perito' && pData.status === 'APROVADO') {
                alert('Esta peritagem já foi aprovada pelo PCP e não pode ser editada.');
                // Redireciona para visualização ou lista
                navigate('/peritagens');
                return;
            }

            setFixedData({
                tag: pData.tag || '',
                local_equipamento: pData.local_equipamento || '',
                data_inspecao: pData.created_at ? pData.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                responsavel_tecnico: pData.responsavel_tecnico || '',
                cliente: pData.cliente || '',
                numero_os: pData.os || '',
                ni: pData.ni || '',
                pedido: pData.numero_pedido || '',
                ordem: pData.ordem || '',
                nota_fiscal: pData.nota_fiscal || '',
                desenho_conjunto: pData.desenho_conjunto || '',
                tipo_modelo: pData.tipo_modelo || '',
                fabricante: pData.fabricante || '',
                lubrificante: pData.lubrificante || '',
                volume: pData.volume || '',
                acoplamento_polia: pData.acoplamento_polia || '',
                sistema_lubrificacao: pData.sistema_lubrificacao || '',
                outros_especificar: pData.outros_especificar || '',
                observacoes_gerais: pData.observacoes_gerais || '',
                area: pData.area || '',
                linha: pData.linha || '',
                os_interna: pData.os_interna || ''
            });

            const isCustom = pData.cliente && !PREDEFINED_CLIENTS.includes(pData.cliente) && pData.cliente !== 'USIMINAS';
            setIsCustomClient(!!isCustom);

            setDimensions({
                diametroInterno: pData.camisa_int || '',
                diametroHaste: pData.haste_diam || '',
                curso: pData.curso || '',
                comprimentoTotal: pData.camisa_comp || '',
                diametroExterno: pData.camisa_ext || '',
                comprimentoHaste: pData.haste_comp || '',
                montagem: pData.montagem || '',
                pressaoNominal: pData.pressao_nominal || '',
                fabricanteModelo: pData.fabricante_modelo || ''
            });

            // Map Analyses to Checklist/Vedacoes
            // First, re-initialize list based on client to preserve order and structure
            let list = [];
            if (pData.cliente === 'USIMINAS') {
                list = USIMINAS_ITEMS;
            } else {
                list = STANDARD_ITEMS;
            }

            const mappedChecklist = list.map(text => {
                // Try to find existing analysis
                const existing = aData?.find((a: any) => a.componente === text && a.tipo !== 'vedação');
                if (existing) {
                    return {
                        id: crypto.randomUUID(),
                        text,
                        status: 'azul' as StatusColor,
                        conformidade: existing.conformidade,
                        anomalia: existing.anomalias || '',
                        anomaliasSet: existing.anomalias
                            ? existing.anomalias.split('\n').map((t: string) => ({ value: t, isCustom: false }))
                            : [{ value: '', isCustom: false }],
                        solucao: existing.solucao || '',
                        solucoesSet: existing.solucao
                            ? existing.solucao.split('\n').map((t: string) => ({ value: t, isCustom: false }))
                            : [{ value: '', isCustom: false }],
                        fotos: existing.fotos || [],
                        dimensoes: existing.dimensoes || '',
                        qtd: existing.qtd || '',
                        tipo: 'componente' as 'componente',
                        diametro_encontrado: existing.diametro_encontrado || '',
                        diametro_ideal: existing.diametro_ideal || '',
                        material_faltante: existing.material_faltante || '',
                        diametro_externo_encontrado: existing.diametro_externo_encontrado,
                        diametro_externo_especificado: existing.diametro_externo_especificado,
                        desvio_externo: existing.desvio_externo,
                        diametro_interno_encontrado: existing.diametro_interno_encontrado,
                        diametro_interno_especificado: existing.diametro_interno_especificado,
                        desvio_interno: existing.desvio_interno,
                        comprimento_encontrado: existing.comprimento_encontrado,
                        comprimento_especificado: existing.comprimento_especificado,
                        desvio_comprimento: existing.desvio_comprimento
                    };
                }
                return {
                    id: crypto.randomUUID(),
                    text,
                    status: 'vermelho' as StatusColor,
                    conformidade: null as any,
                    anomalia: '',
                    anomaliasSet: [{ value: '', isCustom: false }],
                    solucao: '',
                    solucoesSet: [{ value: '', isCustom: false }],
                    fotos: [],
                    dimensoes: '',
                    qtd: '',
                    tipo: 'componente' as 'componente'
                };
            });
            setChecklistItems(mappedChecklist);

            // Vedacoes
            const vedacoesData = aData?.filter((a: any) => a.tipo === 'vedação') || [];
            if (vedacoesData.length > 0) {
                setVedacoes(vedacoesData.map((v: any) => ({
                    id: crypto.randomUUID(),
                    text: v.componente || '',
                    qtd: v.qtd || '',
                    unidade: v.dimensoes || 'PC', // Reusing dimensions field for Unit/Dim
                    status: 'azul' as StatusColor,
                    conformidade: 'não conforme' as 'não conforme',
                    anomalia: '',
                    solucao: '',
                    fotos: [],
                    observacao: v.anomalias || '', // Mapping anomalias to observacao for vedacao
                    tipo: 'vedação' as 'vedação'
                })));
            } else if (pData.cliente !== 'USIMINAS') {
                const emptyVedacoes = Array.from({ length: 10 }).map(() => ({
                    id: crypto.randomUUID(),
                    text: '',
                    qtd: '',
                    unidade: 'PC',
                    status: 'azul' as StatusColor,
                    conformidade: 'não conforme' as 'não conforme',
                    anomalia: '',
                    solucao: '',
                    fotos: [],
                    observacao: '',
                    tipo: 'vedação' as 'vedação'
                }));
                // Only set if we didn't find any (which is weird for edit, but ok)
                setVedacoes(emptyVedacoes);
            } else {
                setVedacoes([]);
            }

        } catch (err) {
            console.error(err);
            alert('Erro ao carregar peritagem.');
            navigate('/peritagens');
        } finally {
            setLoading(false);
        }
    }


    // Quando mudar o tipo de cilindro, inicializa o checklist APENAS SE NÃO ESTIVER EDITANDO
    useEffect(() => {
        if (cylinderType && !editId) {
            const list = CYLINDER_INSPECTION_MODEL;

            setChecklistItems(list.map((text) => {
                return {
                    id: crypto.randomUUID(),
                    text,
                    status: 'vermelho',
                    conformidade: null,
                    anomalia: '',
                    anomaliasSet: [{ value: '', isCustom: false }],
                    solucao: '',
                    solucoesSet: [{ value: '', isCustom: false }],
                    fotos: [],
                    dimensoes: '',
                    qtd: '',
                    tipo: 'componente'
                };
            }));

            // Inicializa 10 linhas de vedações para padrão e Usiminas
            const emptyVedacoes = Array.from({ length: 10 }).map(() => ({
                id: crypto.randomUUID(),
                text: '',
                qtd: '',
                unidade: 'PC',
                status: 'azul' as StatusColor,
                conformidade: 'não conforme' as 'não conforme',
                anomalia: '',
                solucao: '',
                fotos: [],
                observacao: '',
                tipo: 'vedação' as 'vedação'
            }));
            setVedacoes(emptyVedacoes);
        }
    }, [cylinderType, fixedData.cliente, editId]);

    // Lógica de Autoload por TAG
    useEffect(() => {
        const fetchLastTagData = async () => {
            if (fixedData.tag.length >= 3) {
                const { data, error } = await supabase
                    .from('peritagens')
                    .select('*')
                    .eq('tag', fixedData.tag)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && !error) {
                    setDimensions({
                        diametroInterno: data.camisa_int || '',
                        diametroHaste: data.haste_diam || '',
                        curso: data.curso || '',
                        comprimentoTotal: data.camisa_comp || '',
                        diametroExterno: data.camisa_ext || '',
                        comprimentoHaste: data.haste_comp || '',
                        montagem: data.montagem || '',
                        pressaoNominal: data.pressao_nominal || '',
                        fabricanteModelo: data.fabricante_modelo || ''
                    });
                }
            }
        };
        fetchLastTagData();
    }, [fixedData.tag]);

    const handleChecklistItemClick = (itemId: string) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                // Se ainda for vermelho, vira amarelo (clicou mas não respondeu)
                const newStatus = item.status === 'vermelho' ? 'amarelo' : item.status;
                return { ...item, status: newStatus };
            }
            return item;
        }));
    };

    const handleResponse = (itemId: string, conformidade: 'conforme' | 'não conforme') => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, conformidade, status: 'verde' };
            }
            return item;
        }));
    };

    const handleResetItem = (itemId: string) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, conformidade: null, status: 'vermelho' };
            }
            return item;
        }));
    };

    const updateItemDetails = (itemId: string, field: 'anomalia' | 'solucao' | 'fotos' | 'text' | 'dimensoes' | 'qtd' | 'diametro_encontrado' | 'diametro_ideal' | 'material_faltante' | 'diametro_externo_encontrado' | 'diametro_externo_especificado' | 'desvio_externo' | 'diametro_interno_encontrado' | 'diametro_interno_especificado' | 'desvio_interno' | 'comprimento_encontrado' | 'comprimento_especificado' | 'desvio_comprimento' | 'isCustomAnomaly' | 'isCustomSolucao' | 'isManualInput', value: any) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                // Se estiver alterando o texto de um componente novo, vira amarelo
                const newStatus = field === 'text' && item.status === 'vermelho' ? 'amarelo' : item.status;

                // Resetar Anomalia, Solução e Flags se o Componente mudar
                if (field === 'text') {
                    return {
                        ...item,
                        [field]: value,
                        status: newStatus,
                        anomalia: '',
                        solucao: '',
                        isCustomAnomaly: false,
                        isCustomSolucao: false
                    };
                }

                // Resetar Solução e Flag de Solução se a Anomalia mudar
                if (field === 'anomalia') {
                    return {
                        ...item,
                        [field]: value,
                        status: newStatus,
                        solucao: '',
                        isCustomSolucao: false
                    };
                }

                if (field === 'isManualInput') {
                    return { ...item, isManualInput: value, text: value ? '' : item.text };
                }

                return { ...item, [field]: value, status: newStatus };
            }
            return item;
        }));
    };

    // Helpers para Sets de Anomalia/Solução
    const updateAnomalySet = (itemId: string, index: number, value: string, isCustom: boolean) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.anomaliasSet ? [...item.anomaliasSet] : [{ value: item.anomalia || '', isCustom: false }];
                while (newSet.length <= index) newSet.push({ value: '', isCustom: false });
                newSet[index] = { value, isCustom };
                const joined = newSet.map(x => x.value).filter(x => x && x.trim() !== '').join('\n');
                return { ...item, anomaliasSet: newSet, anomalia: joined, status: 'amarelo' };
            }
            return item;
        }));
    };

    const addAnomaly = (itemId: string) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.anomaliasSet ? [...item.anomaliasSet] : [{ value: item.anomalia || '', isCustom: false }];
                newSet.push({ value: '', isCustom: false });
                return { ...item, anomaliasSet: newSet, status: 'amarelo' };
            }
            return item;
        }));
    };

    const removeAnomaly = (itemId: string, index: number) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.anomaliasSet ? [...item.anomaliasSet] : [{ value: item.anomalia || '', isCustom: false }];
                if (newSet.length > 1) {
                    newSet.splice(index, 1);
                } else {
                    newSet[0] = { value: '', isCustom: false };
                }
                const joined = newSet.map(x => x.value).filter(x => x && x.trim() !== '').join('\n');
                return { ...item, anomaliasSet: newSet, anomalia: joined, status: 'amarelo' };
            }
            return item;
        }));
    };

    const updateSolucaoSet = (itemId: string, index: number, value: string, isCustom: boolean) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.solucoesSet ? [...item.solucoesSet] : [{ value: item.solucao || '', isCustom: false }];
                while (newSet.length <= index) newSet.push({ value: '', isCustom: false });
                newSet[index] = { value, isCustom };
                const joined = newSet.map(x => x.value).filter(x => x && x.trim() !== '').join('\n');
                return { ...item, solucoesSet: newSet, solucao: joined, status: 'amarelo' };
            }
            return item;
        }));
    };

    const addSolucao = (itemId: string) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.solucoesSet ? [...item.solucoesSet] : [{ value: item.solucao || '', isCustom: false }];
                newSet.push({ value: '', isCustom: false });
                return { ...item, solucoesSet: newSet, status: 'amarelo' };
            }
            return item;
        }));
    };

    const removeSolucao = (itemId: string, index: number) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newSet = item.solucoesSet ? [...item.solucoesSet] : [{ value: item.solucao || '', isCustom: false }];
                if (newSet.length > 1) {
                    newSet.splice(index, 1);
                } else {
                    newSet[0] = { value: '', isCustom: false };
                }
                const joined = newSet.map(x => x.value).filter(x => x && x.trim() !== '').join('\n');
                return { ...item, solucoesSet: newSet, solucao: joined, status: 'amarelo' };
            }
            return item;
        }));
    };

    const handlePhotoUpload = (itemId: string, mode: 'cam' | 'gallery') => {

        setEditingItemId(itemId);
        if (mode === 'cam') camInputRef.current?.click();
        else galleryInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingItemId) {
            try {
                const compressed = await compressImage(file, 1024, 1024, 0.7);
                const currentItem = checklistItems.find(i => i.id === editingItemId);
                if (currentItem) {
                    const newPhotos = [...currentItem.fotos, compressed];
                    updateItemDetails(editingItemId, 'fotos', newPhotos);
                }
            } catch (error) {
                console.error('Erro ao comprimir imagem:', error);
                alert('Erro ao processar foto.');
            }
        }
        // Reset input
        e.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (isSubmitting) return;

        if (!fotoFrontal) {
            alert('A foto frontal do equipamento é obrigatória!');
            return;
        }

        setIsSubmitting(true);
        setLoading(true);

        // Validação removida a pedido
        /*
        if (!fixedData.cliente || !fixedData.numero_os || !fixedData.tag) {
            alert('Por favor, preencha os campos obrigatórios (*): Cliente, O.S e TAG.');
            setLoading(false);
            return;
        }
        */

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                alert('Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.');
                navigate('/login');
                return;
            }

            // Se não tiver OS, gera um ID único temporário para não dar erro de duplicidade
            let numeroPeritagem = fixedData.numero_os ? fixedData.numero_os.toUpperCase() : `S/OS-${Date.now()}`;

            // 1. Salvar ou Atualizar Peritagem
            let peritagemId = editId;
            const empresa_id = !isCustomClient ? empresas.find(e => e.nome.toUpperCase().includes(fixedData.cliente.toUpperCase()))?.id : null;

            if (editId) {
                // UPDATE
                const { error: uError } = await supabase
                    .from('peritagens')
                    .update({
                        empresa_id,
                        tag: fixedData.tag,
                        cliente: fixedData.cliente,
                        local_equipamento: fixedData.local_equipamento,
                        responsavel_tecnico: fixedData.responsavel_tecnico,
                        tipo_cilindro: cylinderType,
                        ni: fixedData.ni,
                        numero_pedido: fixedData.pedido,
                        ordem: fixedData.ordem,
                        nota_fiscal: fixedData.nota_fiscal,
                        os: fixedData.numero_os,
                        camisa_int: dimensions.diametroInterno,
                        camisa_ext: dimensions.diametroExterno,
                        haste_diam: dimensions.diametroHaste,
                        haste_comp: dimensions.comprimentoHaste,
                        curso: dimensions.curso,
                        camisa_comp: dimensions.comprimentoTotal,
                        montagem: dimensions.montagem,
                        pressao_nominal: dimensions.pressaoNominal,
                        fabricante_modelo: dimensions.fabricanteModelo,
                        foto_frontal: fotoFrontal,
                        status: 'AGUARDANDO APROVAÇÃO DO PCP', // Reseta status ao editar
                        desenho_conjunto: fixedData.desenho_conjunto,
                        lubrificante: fixedData.lubrificante,
                        volume: fixedData.volume,
                        acoplamento_polia: fixedData.acoplamento_polia,
                        sistema_lubrificacao: fixedData.sistema_lubrificacao,
                        outros_especificar: fixedData.outros_especificar,
                        observacoes_gerais: fixedData.observacoes_gerais,
                        fabricante: fixedData.fabricante,
                        tipo_modelo: fixedData.tipo_modelo,
                        area: fixedData.area,
                        linha: fixedData.linha,
                        os_interna: fixedData.os_interna,
                        etapa_atual: 'peritagem',
                        databook_pronto: false,
                        motivo_rejeicao: null // Limpa o motivo de rejeição ao reenviar
                    })
                    .eq('id', editId);

                if (uError) throw uError;

                // Deletar análises antigas para recriar (estratégia simples)
                await supabase.from('peritagem_analise_tecnica').delete().eq('peritagem_id', editId);

            } else {
                // INSERT
                const { data: peritagem, error: pError } = await supabase
                    .from('peritagens')
                    .insert([{
                        empresa_id,
                        numero_peritagem: numeroPeritagem,
                        os: fixedData.numero_os,
                        tag: fixedData.tag,
                        cliente: fixedData.cliente,
                        local_equipamento: fixedData.local_equipamento,
                        responsavel_tecnico: fixedData.responsavel_tecnico,
                        tipo_cilindro: cylinderType,
                        ni: fixedData.ni,
                        numero_pedido: fixedData.pedido,
                        ordem: fixedData.ordem,
                        nota_fiscal: fixedData.nota_fiscal,
                        camisa_int: dimensions.diametroInterno,
                        camisa_ext: dimensions.diametroExterno,
                        haste_diam: dimensions.diametroHaste,
                        haste_comp: dimensions.comprimentoHaste,
                        curso: dimensions.curso,
                        camisa_comp: dimensions.comprimentoTotal,
                        montagem: dimensions.montagem,
                        pressao_nominal: dimensions.pressaoNominal,
                        fabricante_modelo: dimensions.fabricanteModelo,
                        foto_frontal: fotoFrontal,
                        criado_por: user?.id,
                        status: 'AGUARDANDO APROVAÇÃO DO PCP',
                        desenho_conjunto: fixedData.desenho_conjunto,
                        lubrificante: fixedData.lubrificante,
                        volume: fixedData.volume,
                        acoplamento_polia: fixedData.acoplamento_polia,
                        sistema_lubrificacao: fixedData.sistema_lubrificacao,
                        outros_especificar: fixedData.outros_especificar,
                        observacoes_gerais: fixedData.observacoes_gerais,
                        fabricante: fixedData.fabricante,
                        tipo_modelo: fixedData.tipo_modelo,
                        area: fixedData.area,
                        linha: fixedData.linha,
                        os_interna: fixedData.os_interna || numeroPeritagem,
                        etapa_atual: 'peritagem',
                        databook_pronto: false
                    }])
                    .select()
                    .single();

                if (pError) throw pError;
                peritagemId = peritagem.id;
            }


            // 2. Salvar Itens do Checklist
            const analyses = checklistItems
                .filter(item => item.conformidade !== null)
                .map(item => ({
                    peritagem_id: peritagemId,
                    componente: item.text,
                    conformidade: item.conformidade,
                    anomalias: item.anomalia,
                    solucao: item.solucao,
                    fotos: item.fotos,
                    dimensoes: item.dimensoes,
                    qtd: item.qtd,
                    diametro_encontrado: item.diametro_encontrado,
                    diametro_ideal: item.diametro_ideal,
                    material_faltante: item.material_faltante,
                    // Novos campos dimensionais
                    diametro_externo_encontrado: item.diametro_externo_encontrado,
                    diametro_externo_especificado: item.diametro_externo_especificado,
                    desvio_externo: item.desvio_externo,
                    diametro_interno_encontrado: item.diametro_interno_encontrado,
                    diametro_interno_especificado: item.diametro_interno_especificado,
                    desvio_interno: item.desvio_interno,
                    comprimento_encontrado: item.comprimento_encontrado,
                    comprimento_especificado: item.comprimento_especificado,
                    desvio_comprimento: item.desvio_comprimento,
                    tipo: item.tipo || 'componente',
                    status_indicador: 'azul'
                }));

            const analysesVedacoes = vedacoes
                .filter(item => item.text && item.text.trim() !== '')
                .map(item => ({
                    peritagem_id: peritagemId,
                    componente: item.text,
                    conformidade: 'não conforme',
                    anomalias: item.observacao || '',
                    solucao: '',
                    fotos: [],
                    dimensoes: item.unidade || '',
                    qtd: item.qtd,
                    tipo: 'vedação',
                    status_indicador: 'azul'
                }));

            const allAnalyses = [...analyses, ...analysesVedacoes];

            if (allAnalyses.length > 0) {
                const { error: aError } = await supabase
                    .from('peritagem_analise_tecnica')
                    .insert(allAnalyses);
                if (aError) throw aError;
            }

            // Atualizar status local para azul
            setChecklistItems(prev => prev.map(item => ({ ...item, status: 'azul' })));

            // 3. Atualizar status na tabela 'aguardando_peritagem' se existir
            const osForSearch = fixedData.os_interna || (fixedData.numero_os ? fixedData.numero_os.toUpperCase() : null);
            
            if (osForSearch) {
                await supabase
                    .from('aguardando_peritagem')
                    .update({ status: 'PERITADO' })
                    .eq('os_interna', osForSearch);
            }

            // 3. Sincronizar Fotos com o Arquivo Geral
            const allPhotosForGallery: SyncPhoto[] = [];

            if (fotoFrontal) {
                allPhotosForGallery.push({ data: fotoFrontal, description: 'Foto Frontal Equipamento' });
            }

            checklistItems.forEach(item => {
                if (item.fotos && item.fotos.length > 0) {
                    item.fotos.forEach((f, idx) => {
                        allPhotosForGallery.push({
                            data: f,
                            description: `Foto ${idx + 1} - ${item.text}`
                        });
                    });
                }
            });

            if (allPhotosForGallery.length > 0) {
                // Não aguardamos o sync para não travar o usuário, mas disparamos
                syncPhotosToGallery(
                    fixedData.os_interna || numeroPeritagem,
                    fixedData.cliente,
                    allPhotosForGallery
                );
            }

            alert('Peritagem salva e registrada no histórico!');
            navigate('/peritagens');
        } catch (err: any) {
            console.error('❌ Erro detalhado ao salvar:', err);
            if (err.code === '23505' || err.message?.includes('duplicate key')) {
                alert('Já existe uma peritagem com este número de OS/Laudo. Por favor, verifique ou use um número diferente.');
            } else {
                alert('Erro ao salvar peritagem: ' + (err.message || 'Erro interno'));
            }
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };



    if (step === 0) {
        if (loading) {
            return (
                <div className="nova-peritagem-container start-screen" style={{ flexDirection: 'column', gap: '20px' }}>
                    <div className="loader" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ color: '#666', fontWeight: 600 }}>Carregando dados da peritagem...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            );
        }

        return (
            <div className="nova-peritagem-container start-screen tech-grid-bg">
                <div className="selection-card">
                    <div className="card-industrial-header" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            background: 'var(--primary-light)', 
                            borderRadius: '24px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: '1.5rem',
                            color: 'var(--primary)',
                            boxShadow: 'inset 0 2px 4px rgba(33, 64, 142, 0.1)'
                        }}>
                            <ShieldCheck size={40} strokeWidth={1.5} />
                        </div>
                        <span className="ind-badge ind-badge-primary" style={{ marginBottom: '1rem' }}>Módulo Técnico v2.0</span>
                        <h2>Nova Peritagem Técnica</h2>
                        <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '1rem' }}>
                            Inicie o processo de inspeção técnica detalhada para geração de laudos periciais e acompanhamento de manutenção.
                        </p>
                    </div>
                    
                    {motivoRejeicao && (
                        <div style={{
                            padding: '20px',
                            margin: '20px 0',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            borderLeft: '5px solid #ef4444',
                            borderRadius: '16px',
                            animation: 'slideIn 0.3s ease-out',
                            textAlign: 'left'
                        }}>
                            <h3 style={{ color: '#991b1b', fontSize: '1rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={18} /> REPROVADA PELO PCP
                            </h3>
                            <p style={{ color: '#b91c1c', fontSize: '0.9rem', margin: 0 }}>
                                <strong>Motivo:</strong> {motivoRejeicao}
                            </p>
                        </div>
                    )}

                    <div style={{ marginTop: '2.5rem' }}>
                        <button 
                            className="btn-start" 
                            style={{ 
                                width: '100%', 
                                height: '64px',
                                padding: '20px', 
                                fontSize: '1.25rem', 
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}
                            onClick={() => {
                                setCylinderType('Cilindros');
                                setStep(1);
                            }}
                        >
                            <ClipboardList size={22} />
                            Iniciar Diagnóstico
                        </button>
                    </div>

                    <div className="card-footer-info" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                            SISTEMA ONLINE
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
                           <FileSearch size={14} />
                           LAUDO PADRONIZADO
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="nova-peritagem-container">
            <header className="header-sticky">
                <div className="header-content">
                    <button className="btn-back-circle" onClick={() => setStep(0)}>
                        <ArrowLeft size={22} />
                    </button>
                    <div className="title-group">
                        <span className="ind-badge ind-badge-info" style={{ marginBottom: '4px' }}>DIAGNÓSTICO TÉCNICO</span>
                        <h1 className="page-title">Inspeção de {cylinderType}</h1>
                        <span className="subtitle" style={{ fontWeight: '500' }}>Módulo de Peritagem Industrial</span>
                    </div>
                </div>
                <div className="header-actions-top">
                    <button className="btn-save-top" onClick={handleSubmit} disabled={loading} style={{ 
                        background: 'var(--primary-gradient)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 16px rgba(33, 64, 142, 0.2)'
                    }}>
                        <Save size={18} />
                        {loading ? 'Sincronizando...' : 'Concluir Diagnóstico'}
                    </button>
                </div>
            </header>

            <form className="peritagem-dynamic-form" onSubmit={(e) => e.preventDefault()}>
                {/* FOTO FRONTAL OBRIGATÓRIA */}
                <section className="form-card frontal-photo-section">
                    <div className="card-header">
                        <Camera size={20} color="#2980b9" />
                        <h3>Foto Frontal do Equipamento *</h3>
                    </div>
                    <div className="frontal-photo-upload" style={{ cursor: 'default' }}>
                        {fotoFrontal ? (
                            <div className="frontal-preview">
                                <img src={fotoFrontal} alt="Foto Frontal" />
                                <div className="change-photo-actions">
                                    <button type="button" className="btn-photo-action" onClick={() => frontalCameraRef.current?.click()}>
                                        <Camera size={20} />
                                        <span>Câmera</span>
                                    </button>
                                    <button type="button" className="btn-photo-action" onClick={() => frontalGalleryRef.current?.click()}>
                                        <ImageIcon size={20} />
                                        <span>Galeria</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="frontal-placeholder">
                                <p style={{ marginBottom: '1rem' }}>Selecione uma opção:</p>
                                <div className="photo-selection-buttons">
                                    <button type="button" className="btn-photo-select" onClick={() => frontalCameraRef.current?.click()}>
                                        <Camera size={32} />
                                        <span>Tirar Foto</span>
                                    </button>
                                    <button type="button" className="btn-photo-select" onClick={() => frontalGalleryRef.current?.click()}>
                                        <ImageIcon size={32} />
                                        <span>Galeria</span>
                                    </button>
                                </div>
                                <span style={{ marginTop: '1rem', display: 'block' }}>(Obrigatório)</span>
                            </div>
                        )}

                        {/* Input Câmera */}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={frontalCameraRef}
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    try {
                                        const compressed = await compressImage(file, 1024, 1024, 0.7);
                                        setFotoFrontal(compressed);
                                    } catch (error) {
                                        console.error('Erro ao comprimir foto frontal:', error);
                                        alert('Erro ao processar foto frontal.');
                                    }
                                }
                            }}
                        />

                        {/* Input Galeria */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={frontalGalleryRef}
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    try {
                                        const compressed = await compressImage(file, 1024, 1024, 0.7);
                                        setFotoFrontal(compressed);
                                    } catch (error) {
                                        console.error('Erro ao comprimir foto frontal:', error);
                                        alert('Erro ao processar foto frontal.');
                                    }
                                }
                            }}
                        />
                    </div>
                </section>

                <section className="form-card">
                    <div className="card-header main-card-header">
                        <CheckCircle className="header-icon-blue" />
                        <div className="header-titles">
                            <h3>ORDEM E IDENTIFICAÇÃO</h3>
                            <span className="subtitle" style={{ fontWeight: '500' }}>Dados Genéricos e Referenciais do Serviço</span>
                        </div>
                    </div>
                    
                    <div className="form-section-title">
                        <div style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        GESTÃO DE ATENDIMENTO
                    </div>

                    <div className="info-grid">
                        <div className="form-group">
                            <label>ID / OS INTERNA (MASTER)</label>
                            <input 
                                placeholder="Auto-gerado ou OS Superior" 
                                value={fixedData.os_interna} 
                                onChange={e => setFixedData({...fixedData, os_interna: e.target.value.toUpperCase()})}
                                style={{ fontWeight: '800', color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>CLIENTE / PARCEIRO</label>
                            {!isCustomClient ? (
                                <select 
                                    value={fixedData.cliente} 
                                    onChange={e => {
                                        if (e.target.value === 'OUTROS') setIsCustomClient(true);
                                        else setFixedData({...fixedData, cliente: e.target.value});
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {PREDEFINED_CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="OUTROS">OUTRO CLIENTE (MANUAL)</option>
                                </select>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        placeholder="Nome do Cliente..." 
                                        value={fixedData.cliente} 
                                        onChange={e => setFixedData({...fixedData, cliente: e.target.value.toUpperCase()})}
                                    />
                                    <button onClick={() => setIsCustomClient(false)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={16}/></button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>DATA DA INSPEÇÃO</label>
                            <input type="date" value={fixedData.data_inspecao} onChange={e => setFixedData({...fixedData, data_inspecao: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>RESPONSÁVEL TÉCNICO</label>
                            <input placeholder="Nome do perito" value={fixedData.responsavel_tecnico} onChange={e => setFixedData({...fixedData, responsavel_tecnico: e.target.value.toUpperCase()})} />
                        </div>
                    </div>

                    <div className="form-section-title">
                        <div style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        IDENTIFICAÇÃO DO ATIVO (EQUIPAMENTO)
                    </div>

                    <div className="info-grid">
                        <div className="form-group">
                            <label>TAG / CÓDIGO DO ATIVO</label>
                            <input placeholder="Ex: TAG-1234" value={fixedData.tag} onChange={e => setFixedData({...fixedData, tag: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>EQUIPAMENTO / LOCAL</label>
                            <input placeholder="Ex: CILINDRO DE ELEVAÇÃO" value={fixedData.local_equipamento} onChange={e => setFixedData({...fixedData, local_equipamento: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>ÁREA / SETOR</label>
                            <input placeholder="Ex: LAMINAÇÃO" value={fixedData.area} onChange={e => setFixedData({...fixedData, area: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>LINHA DE PRODUÇÃO</label>
                            <input placeholder="Ex: LINHA 01" value={fixedData.linha} onChange={e => setFixedData({...fixedData, linha: e.target.value.toUpperCase()})} />
                        </div>
                    </div>

                    <div className="form-section-title">
                        <div style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        DADOS TÉCNICOS & FABRICAÇÃO
                    </div>

                    <div className="info-grid">
                        <div className="form-group">
                            <label>FABRICANTE</label>
                            <input placeholder="Fabricante Original" value={fixedData.fabricante} onChange={e => setFixedData({...fixedData, fabricante: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>MODELO / SÉRIE</label>
                            <input placeholder="Modelo / N° da Peça" value={fixedData.tipo_modelo} onChange={e => setFixedData({...fixedData, tipo_modelo: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>DESENHO DE REFERÊNCIA</label>
                            <input placeholder="N° do Desenho" value={fixedData.desenho_conjunto} onChange={e => setFixedData({...fixedData, desenho_conjunto: e.target.value.toUpperCase()})} />
                        </div>
                         <div className="form-group">
                            <label>NI (NOTA DE INSPEÇÃO)</label>
                            <input placeholder="NI de Referência" value={fixedData.ni} onChange={e => setFixedData({...fixedData, ni: e.target.value.toUpperCase()})} />
                        </div>
                    </div>
                </section>

                <section className="form-card">
                    <div className="card-header">
                        <Info size={24} color="var(--primary)" />
                        <div className="header-titles">
                            <h3>CARACTERÍSTICAS DIMENSIONAIS</h3>
                            <span className="subtitle">Especificações de Projeto (Medidas Nominais)</span>
                        </div>
                    </div>

                    <div className="info-grid">
                        <div className="form-group">
                            <label>DIÂMETRO INTERNO (mm)</label>
                            <input type="text" placeholder="Ø Interno" value={dimensions.diametroInterno} onChange={e => setDimensions({...dimensions, diametroInterno: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>DIÂMETRO HASTE (mm)</label>
                            <input type="text" placeholder="Ø Haste" value={dimensions.diametroHaste} onChange={e => setDimensions({...dimensions, diametroHaste: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>CURSO ÚTIL (mm)</label>
                            <input type="text" placeholder="Curso" value={dimensions.curso} onChange={e => setDimensions({...dimensions, curso: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>COMPRIMENTO FECHADO (mm)</label>
                            <input type="text" placeholder="Comp. Fechado" value={dimensions.comprimentoTotal} onChange={e => setDimensions({...dimensions, comprimentoTotal: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>PRESSÃO NOMINAL (bar)</label>
                            <input type="text" placeholder="Pressão" value={dimensions.pressaoNominal} onChange={e => setDimensions({...dimensions, pressaoNominal: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>TIPO DE MONTAGEM</label>
                            <select value={dimensions.montagem} onChange={e => setDimensions({...dimensions, montagem: e.target.value})}>
                                <option value="">Selecione...</option>
                                <option value="FLANGE">FLANGE</option>
                                <option value="MUNHÃO">MUNHÃO</option>
                                <option value="OLHAL">OLHAL</option>
                                <option value="PÉ">PÉ / FIXAÇÃO BASE</option>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-section-title">PARÂMETROS DE RECEBIMENTO</div>
                    <div className="info-grid">
                        <div className="form-group">
                            <label>FLUIDO / LUBRIFICANTE</label>
                            <input placeholder="Ex: ISO VG 68" value={fixedData.lubrificante} onChange={e => setFixedData({...fixedData, lubrificante: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>VOLUME DE ÓLEO (L)</label>
                            <input placeholder="Capacidade" value={fixedData.volume} onChange={e => setFixedData({...fixedData, volume: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="form-group">
                            <label>ENTREGA COM ACOPLAMENTO / POLIA?</label>
                            <select value={fixedData.acoplamento_polia} onChange={e => setFixedData({...fixedData, acoplamento_polia: e.target.value})}>
                                <option value="">-</option>
                                <option value="SIM">SIM</option>
                                <option value="NÃO">NÃO</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>SISTEMA DE LUBRIFICAÇÃO INTEGRADO?</label>
                            <select value={fixedData.sistema_lubrificacao} onChange={e => setFixedData({...fixedData, sistema_lubrificacao: e.target.value})}>
                                <option value="">-</option>
                                <option value="SIM">SIM</option>
                                <option value="NÃO">NÃO</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* CHECKLIST TÉCNICO */}
                <section className="form-card">
                    <div className="card-header">
                        <AlertCircle size={20} color="#f39c12" />
                        <h3>Checklist Técnico de Inspeção</h3>
                    </div>
                    <div className="checklist-items">
                        <div className="checklist-header-row">
                            <span className="cl-col-num">N°</span>
                            <span className="cl-desc">DESCRIÇÃO DE PEÇAS / SERVIÇOS</span>
                            <span className="cl-col-x"></span>
                        </div>
                        {checklistItems.map((item, index) => (
                            <div key={item.id} className="checklist-row" onClick={() => handleChecklistItemClick(item.id)}>
                                <div className="row-main">
                                    <div className="item-info">
                                        <div className="cl-col-num-row">
                                            <div className={`status-dot-animated ${item.conformidade ? 'verde' : 'vermelho'}`} />
                                            <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{index + 1}</span>
                                        </div>
                                        <div className="cl-col-desc-row">
                                            {item.isCustom || item.text === 'Selecione o componente...' || item.isManualInput ? (
                                                <>
                                                    {!item.isManualInput ? (
                                                        <select
                                                            value={item.text === 'Selecione o componente...' ? '' : item.text}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === '__CUSTOM__') {
                                                                    updateItemDetails(item.id, 'isManualInput', true);
                                                                    updateItemDetails(item.id, 'text', '');
                                                                } else {
                                                                    updateItemDetails(item.id, 'isManualInput', false);
                                                                    updateItemDetails(item.id, 'text', val);
                                                                }
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                            className="cl-select-custom"
                                                        >
                                                            <option value="" disabled>Selecione o componente...</option>
                                                            {Object.keys(DIMENSIONAL_ANOMALIES_SERVICES).map(comp => (
                                                                <option key={comp} value={comp}>{comp}</option>
                                                            ))}
                                                            <option value="__CUSTOM__">Outros (Digitar manual)</option>
                                                        </select>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%' }}>
                                                            <input
                                                                autoFocus
                                                                placeholder="Digite o nome do componente..."
                                                                value={item.text}
                                                                onChange={e => updateItemDetails(item.id, 'text', e.target.value.toUpperCase())}
                                                                onClick={e => e.stopPropagation()}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #cbd5e0'
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateItemDetails(item.id, 'isManualInput', false);
                                                                    updateItemDetails(item.id, 'text', 'Selecione o componente...');
                                                                }}
                                                                title="Voltar para lista"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '5px',
                                                                    color: '#e53e3e'
                                                                }}
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span>{item.text}</span>
                                            )}
                                        </div>

                                        {/* Coluna X - Spacer oculto no mobile */}
                                        <div className="cl-col-x-row" />

                                        {/* Coluna QTD */}
                                    </div>


                                    <div className="conformity-toggle">
                                        <button
                                            type="button"
                                            className={`conf-btn conforme ${item.conformidade === 'conforme' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleResponse(item.id, 'conforme'); }}
                                        >
                                            Conforme
                                        </button>
                                        <button
                                            type="button"
                                            className={`conf-btn nao-conforme ${item.conformidade === 'não conforme' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleResponse(item.id, 'não conforme'); }}
                                        >
                                            Não Conforme
                                        </button>
                                    </div>
                                    {item.conformidade && (
                                        <button
                                            type="button"
                                            className="clear-item-btn"
                                            onClick={(e) => { e.stopPropagation(); handleResetItem(item.id); }}
                                            title="Limpar resposta"
                                        >
                                            <X size={20} color="#000" />
                                        </button>
                                    )}
                                </div>

                                {
                                    item.conformidade === 'não conforme' && (
                                        <div className="non-conformity-block slide-in" onClick={(e) => e.stopPropagation()}>
                                            {/* FOTOS EM PRIMEIRO - Conforme solicitado pelo usuário */}
                                            <div className="photo-section" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4a5568', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Evidências Fotográficas (Componente)</label>
                                                <div className="photo-grid">
                                                    {item.fotos.map((foto, idx) => (
                                                        <div key={idx} className="photo-preview">
                                                            <img src={foto} alt={`Anomalia ${idx}`} />
                                                            <button type="button" className="btn-remove-photo" onClick={() => {
                                                                const newPhotos = item.fotos.filter((_, i) => i !== idx);
                                                                updateItemDetails(item.id, 'fotos', newPhotos);
                                                            }}><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                    <div className="photo-upload-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-action-photo camera"
                                                            onClick={(e) => { e.stopPropagation(); handlePhotoUpload(item.id, 'cam'); }}
                                                        >
                                                            <Camera size={20} />
                                                            <span>Câmera</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-action-photo gallery"
                                                            onClick={(e) => { e.stopPropagation(); handlePhotoUpload(item.id, 'gallery'); }}
                                                        >
                                                            <Plus size={20} />
                                                            <span>Galeria</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="usiminas-item-fields" style={{ marginBottom: '1rem' }}>
                                                <div className="input-field" style={{ flex: '0 0 80px' }}>
                                                    <label>Qtd</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Qtd"
                                                        value={item.qtd}
                                                        onChange={e => updateItemDetails(item.id, 'qtd', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* BLOCO DE DIMENSÕES PADRONIZADO */}
                                            <div className="dimensional-block" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748', borderBottom: '1px solid #cbd5e0', paddingBottom: '5px' }}>ANÁLISE DIMENSIONAL</div>

                                                {/* 1. Diâmetro Interno */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Diâmetro Interno Encontrado</label>
                                                        <div style={{ position: 'relative', width: '100%' }}>
                                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568', fontWeight: 'bold' }}>Ø</span>
                                                            <input
                                                                type="number"
                                                                className="no-spinner"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                                }}
                                                                step="0.0001"
                                                                placeholder="0.0000"
                                                                style={{ paddingLeft: '30px', width: '100%' }}
                                                                value={item.diametro_interno_encontrado || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const found = parseFloat(val || '0');
                                                                    const spec = parseFloat(item.diametro_interno_especificado || '0');
                                                                    const diff = (found - spec).toFixed(4);
                                                                    updateItemDetails(item.id, 'diametro_interno_encontrado', val);
                                                                    if (val && item.diametro_interno_especificado) {
                                                                        updateItemDetails(item.id, 'desvio_interno', diff);
                                                                    } else {
                                                                        updateItemDetails(item.id, 'desvio_interno', '');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Diâmetro Interno Especificado</label>
                                                        <div style={{ position: 'relative', width: '100%' }}>
                                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568', fontWeight: 'bold' }}>Ø</span>
                                                            <input
                                                                type="number"
                                                                className="no-spinner"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                                }}
                                                                step="0.0001"
                                                                placeholder="0.0000"
                                                                style={{ paddingLeft: '30px', width: '100%' }}
                                                                value={item.diametro_interno_especificado || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const found = parseFloat(item.diametro_interno_encontrado || '0');
                                                                    const spec = parseFloat(val || '0');
                                                                    const diff = (found - spec).toFixed(4);
                                                                    updateItemDetails(item.id, 'diametro_interno_especificado', val);
                                                                    if (val && item.diametro_interno_encontrado) {
                                                                        updateItemDetails(item.id, 'desvio_interno', diff);
                                                                    } else {
                                                                        updateItemDetails(item.id, 'desvio_interno', '');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Desvio</label>
                                                        <div style={{
                                                            height: '38px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            fontWeight: 'bold',
                                                            fontSize: '13px',
                                                            color: item.desvio_interno ? (parseFloat(item.desvio_interno) < 0 ? '#e53e3e' : '#2f855a') : '#a0aec0'
                                                        }}>
                                                            {item.desvio_interno ? `${parseFloat(item.desvio_interno) >= 0 ? '+' : ''}${item.desvio_interno.replace('.', ',')} mm` : '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Diâmetro Externo */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Diâmetro Externo Encontrado</label>
                                                        <div style={{ position: 'relative', width: '100%' }}>
                                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568', fontWeight: 'bold' }}>Ø</span>
                                                            <input
                                                                type="number"
                                                                className="no-spinner"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                                }}
                                                                step="0.0001"
                                                                placeholder="0.0000"
                                                                style={{ paddingLeft: '30px', width: '100%' }}
                                                                value={item.diametro_externo_encontrado || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const found = parseFloat(val || '0');
                                                                    const spec = parseFloat(item.diametro_externo_especificado || '0');
                                                                    const diff = (found - spec).toFixed(4);
                                                                    updateItemDetails(item.id, 'diametro_externo_encontrado', val);
                                                                    // Só atualiza o desvio se houver valores
                                                                    if (val && item.diametro_externo_especificado) {
                                                                        updateItemDetails(item.id, 'desvio_externo', diff);
                                                                    } else {
                                                                        updateItemDetails(item.id, 'desvio_externo', '');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Diâmetro Externo Especificado</label>
                                                        <div style={{ position: 'relative', width: '100%' }}>
                                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568', fontWeight: 'bold' }}>Ø</span>
                                                            <input
                                                                type="number"
                                                                className="no-spinner"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                                }}
                                                                step="0.0001"
                                                                placeholder="0.0000"
                                                                style={{ paddingLeft: '30px', width: '100%' }}
                                                                value={item.diametro_externo_especificado || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const found = parseFloat(item.diametro_externo_encontrado || '0');
                                                                    const spec = parseFloat(val || '0');
                                                                    const diff = (found - spec).toFixed(4);
                                                                    updateItemDetails(item.id, 'diametro_externo_especificado', val);
                                                                    if (val && item.diametro_externo_encontrado) {
                                                                        updateItemDetails(item.id, 'desvio_externo', diff);
                                                                    } else {
                                                                        updateItemDetails(item.id, 'desvio_externo', '');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Desvio</label>
                                                        <div style={{
                                                            height: '38px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            fontWeight: 'bold',
                                                            fontSize: '13px',
                                                            color: item.desvio_externo ? (parseFloat(item.desvio_externo) < 0 ? '#e53e3e' : '#2f855a') : '#a0aec0'
                                                        }}>
                                                            {item.desvio_externo ? `${parseFloat(item.desvio_externo) >= 0 ? '+' : ''}${item.desvio_externo.replace('.', ',')} mm` : '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Comprimento */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Comprimento Encontrado</label>
                                                        <input
                                                            type="number"
                                                            className="no-spinner"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                            }}
                                                            step="0.0001"
                                                            placeholder="0.0000"
                                                            value={item.comprimento_encontrado || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const found = parseFloat(val || '0');
                                                                const spec = parseFloat(item.comprimento_especificado || '0');
                                                                const diff = (found - spec).toFixed(4);
                                                                updateItemDetails(item.id, 'comprimento_encontrado', val);
                                                                if (val && item.comprimento_especificado) {
                                                                    updateItemDetails(item.id, 'desvio_comprimento', diff);
                                                                } else {
                                                                    updateItemDetails(item.id, 'desvio_comprimento', '');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Comprimento Especificado</label>
                                                        <input
                                                            type="number"
                                                            className="no-spinner"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                                            }}
                                                            step="0.0001"
                                                            placeholder="0.0000"
                                                            value={item.comprimento_especificado || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const found = parseFloat(item.comprimento_encontrado || '0');
                                                                const spec = parseFloat(val || '0');
                                                                const diff = (found - spec).toFixed(4);
                                                                updateItemDetails(item.id, 'comprimento_especificado', val);
                                                                if (val && item.comprimento_encontrado) {
                                                                    updateItemDetails(item.id, 'desvio_comprimento', diff);
                                                                } else {
                                                                    updateItemDetails(item.id, 'desvio_comprimento', '');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="input-field">
                                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Desvio</label>
                                                        <div style={{
                                                            height: '38px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            fontWeight: 'bold',
                                                            fontSize: '13px',
                                                            color: item.desvio_comprimento ? (parseFloat(item.desvio_comprimento) < 0 ? '#e53e3e' : '#2f855a') : '#a0aec0'
                                                        }}>
                                                            {item.desvio_comprimento ? `${parseFloat(item.desvio_comprimento) >= 0 ? '+' : ''}${item.desvio_comprimento.replace('.', ',')} mm` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="analysis-inputs">
                                                {(() => {
                                                    // Determinar qual é o componente para filtrar as listas
                                                    // Para itens customizados, o texto é exatamente o componente (pois agora é um select)
                                                    // Para itens padrão, tentamos encontrar a chave correspondente no texto
                                                    const availableComponents = Object.keys(DIMENSIONAL_ANOMALIES_SERVICES);

                                                    // Mapeamento manual para casos onde o texto padrão não bate exatamente com a chave
                                                    // Mapeamento manual para casos onde o texto padrão não bate exatamente com a chave
                                                    // As chaves são partes do texto do item ou o nome exato que queremos mapear para o Componente oficial
                                                    // Mapeamento manual otimizado para padrões Usiminas
                                                    // ORDEM IMPORTA: Termos mais específicos devem vir antes
                                                    const manualMapping: Record<string, string> = {
                                                        "Tirante": "Tirantes",
                                                        "Kit Vedação": "Kit de Vedação",
                                                        "Vedação": "Kit de Vedação",
                                                        "Sanfonada": "Proteção Sanfonada",
                                                        "Bucha olhal": "Olhais",
                                                        "Olhal": "Olhais",
                                                        "Rótula": "Olhais",
                                                        "Sobreposta": "Sobrepostas",
                                                        "Sede Amortecedor": "Buchas Amortecedoras",
                                                        "Amortecedor": "Buchas Amortecedoras",
                                                        "Fixação por Munhão": "Munhão",
                                                        "Munhão": "Munhão",
                                                        "Parafusos": "Fixadores",
                                                        "Aleta": "Flanges",
                                                        "Base": "Flanges",
                                                        "Fix.": "Flanges", // Assume Fix. (Aleta/Base) como Flanges/Estrutural
                                                        "Embolo": "Êmbolo",
                                                        "Êmbolo": "Êmbolo",
                                                        "Bucha Guia": "Bucha Guia",
                                                        "Cabeçote Dianteiro": "Cabeçote Dianteiro",
                                                        "Cabeçote Traseiro": "Cabeçote Traseiro",
                                                        "Camisa": "Camisa",
                                                        "Haste": "Haste"
                                                    };

                                                    let detectedComponent = availableComponents.find(c => item.text === c);

                                                    if (!detectedComponent) {
                                                        // Tenta achar via includes (case insensitive)
                                                        detectedComponent = availableComponents.find(c => (item.text || '').toLowerCase().includes(c.toLowerCase()));
                                                    }

                                                    if (!detectedComponent) {
                                                        // Tenta mapeamento manual
                                                        for (const [key, val] of Object.entries(manualMapping)) {
                                                            if ((item.text || '').includes(key)) {
                                                                detectedComponent = val;
                                                                break;
                                                            }
                                                        }
                                                    }

                                                    const anomaliesList = detectedComponent ? DIMENSIONAL_ANOMALIES_SERVICES[detectedComponent]?.anomalies : [];
                                                    const servicesList = detectedComponent ? DIMENSIONAL_ANOMALIES_SERVICES[detectedComponent]?.services : [];

                                                    const hasDropdowns = anomaliesList && anomaliesList.length > 0;


                                                    const activeAnomalies = item.anomaliasSet || [{ value: item.anomalia || '', isCustom: false }];
                                                    const activeSolucoes = item.solucoesSet || [{ value: item.solucao || '', isCustom: false }];

                                                    return (
                                                        <>
                                                            <div className="input-field">
                                                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    Anomalia Encontrada
                                                                </label>
                                                                <div className="multi-list-container">
                                                                    {activeAnomalies.map((anomItem, idx) => {
                                                                        // Check custom status logic per item
                                                                        const isCustomSelected = anomItem.isCustom || (anomItem.value && !anomaliesList.includes(anomItem.value));
                                                                        const dropdownValue = isCustomSelected ? '__CUSTOM__' : (anomItem.value || '');

                                                                        return (
                                                                            <div key={idx} className="multi-list-item" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                                                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                                                                                    <div style={{ flex: 1 }}>
                                                                                        {hasDropdowns ? (
                                                                                            <>
                                                                                                <select
                                                                                                    value={dropdownValue}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.value;
                                                                                                        if (val === '__CUSTOM__') {
                                                                                                            updateAnomalySet(item.id, idx, '', true);
                                                                                                        } else {
                                                                                                            updateAnomalySet(item.id, idx, val, false);
                                                                                                        }
                                                                                                    }}
                                                                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#fff', marginBottom: dropdownValue === '__CUSTOM__' ? '8px' : '0' }}
                                                                                                >
                                                                                                    <option value="">Selecione a anomalia...</option>
                                                                                                    {anomaliesList.map((anom, i) => (
                                                                                                        <option key={i} value={anom}>{anom}</option>
                                                                                                    ))}
                                                                                                    <option value="__CUSTOM__">Outros</option>
                                                                                                </select>
                                                                                                {dropdownValue === '__CUSTOM__' && (
                                                                                                    <textarea
                                                                                                        placeholder="Descreva a anomalia..."
                                                                                                        value={anomItem.value}
                                                                                                        onChange={(e) => updateAnomalySet(item.id, idx, e.target.value, true)}
                                                                                                        style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                                                                                    />
                                                                                                )}
                                                                                            </>
                                                                                        ) : (
                                                                                            <textarea
                                                                                                placeholder="Descreva o defeito..."
                                                                                                value={anomItem.value}
                                                                                                onChange={(e) => updateAnomalySet(item.id, idx, e.target.value, true)}
                                                                                                style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    {activeAnomalies.length > 1 && (
                                                                                        <button type="button" onClick={() => removeAnomaly(item.id, idx)} style={{ color: '#e74c3c', background: 'none', border: 'none', padding: '5px' }}>
                                                                                            <X size={18} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addAnomaly(item.id)}
                                                                        style={{ fontSize: '12px', color: '#2980b9', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}
                                                                    >
                                                                        <Plus size={14} /> Adicionar Anomalia
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="input-field">
                                                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    Solução Recomendada
                                                                </label>
                                                                <div className="multi-list-container">
                                                                    {activeSolucoes.map((solItem, idx) => {
                                                                        const isCustomSelected = solItem.isCustom || (solItem.value && !servicesList.includes(solItem.value));
                                                                        const dropdownValue = isCustomSelected ? '__CUSTOM__' : (solItem.value || '');

                                                                        return (
                                                                            <div key={idx} className="multi-list-item" style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                                                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                                                                                    <div style={{ flex: 1 }}>
                                                                                        {hasDropdowns ? (
                                                                                            <>
                                                                                                <select
                                                                                                    value={dropdownValue}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.value;
                                                                                                        if (val === '__CUSTOM__') {
                                                                                                            updateSolucaoSet(item.id, idx, '', true);
                                                                                                        } else {
                                                                                                            updateSolucaoSet(item.id, idx, val, false);
                                                                                                        }
                                                                                                    }}
                                                                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#fff', marginBottom: dropdownValue === '__CUSTOM__' ? '8px' : '0' }}
                                                                                                >
                                                                                                    <option value="">Selecione a solução...</option>
                                                                                                    {servicesList.map((serv, i) => (
                                                                                                        <option key={i} value={serv}>{serv}</option>
                                                                                                    ))}
                                                                                                    <option value="__CUSTOM__">Outros</option>
                                                                                                </select>
                                                                                                {dropdownValue === '__CUSTOM__' && (
                                                                                                    <textarea
                                                                                                        placeholder="Descreva a solução..."
                                                                                                        value={solItem.value}
                                                                                                        onChange={(e) => updateSolucaoSet(item.id, idx, e.target.value, true)}
                                                                                                        style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                                                                                    />
                                                                                                )}
                                                                                            </>
                                                                                        ) : (
                                                                                            <textarea
                                                                                                placeholder="O que deve ser feito?"
                                                                                                value={solItem.value}
                                                                                                onChange={(e) => updateSolucaoSet(item.id, idx, e.target.value, true)}
                                                                                                style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    {activeSolucoes.length > 1 && (
                                                                                        <button type="button" onClick={() => removeSolucao(item.id, idx)} style={{ color: '#e74c3c', background: 'none', border: 'none', padding: '5px' }}>
                                                                                            <X size={18} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addSolucao(item.id)}
                                                                        style={{ fontSize: '12px', color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}
                                                                    >
                                                                        <Plus size={14} /> Adicionar Solução
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        ))}
                    </div>
                </section>

                {/* ITENS INSPECIONÁVEIS ADICIONAIS */}
                <section className="form-card">
                    <div className="card-header">
                        <Info size={20} color="#7f8c8d" />
                        <h3>Análise por Componente</h3>
                    </div>
                    <p className="section-instruction">Selecione componentes específicos para detalhamento adicional.</p>
                    <button type="button" className="btn-add-comp" onClick={() => {
                        const newItem: ChecklistItem = {
                            id: crypto.randomUUID(),
                            text: '',
                            isCustom: true,
                            status: 'vermelho',
                            conformidade: null,
                            anomalia: '',
                            solucao: '',
                            fotos: [],
                            tipo: 'componente'
                        };
                        setChecklistItems([...checklistItems, newItem]);
                    }}>
                        <Plus size={18} /> Adicionar Componente
                    </button>
                </section>

                <section className="form-card">
                    <div className="card-header">
                        <Info size={20} color="#7f8c8d" />
                        <h3>Material</h3>
                    </div>
                    <div className="vedacoes-list">
                        <div className="vedacao-row header" style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '0.7rem', display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '10px' }}>
                            <span style={{ width: '60px' }}>N°</span>
                            <span style={{ flex: 1 }}>DESCRIÇÃO DO MATERIAL</span>
                            <span style={{ width: '60px', textAlign: 'center' }}>QTD</span>
                            <span style={{ width: '60px', textAlign: 'center' }}>UN.</span>
                            <span style={{ flex: 1 }}>OBSERVAÇÃO</span>
                        </div>
                        {vedacoes.map((item, index) => (
                            <div key={item.id} className="vedacao-row" style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', borderBottom: '1px solid #f1f3f5' }}>
                                <div style={{ width: '60px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className={`status-dot-animated ${item.text.trim() !== '' ? 'verde' : 'vermelho'}`} />
                                    <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{index + 1}</span>
                                </div>
                                <input
                                    placeholder="Descrição do material..."
                                    value={item.text}
                                    onChange={e => {
                                        const newVedacoes = [...vedacoes];
                                        newVedacoes[index].text = e.target.value;
                                        setVedacoes(newVedacoes);
                                    }}
                                    style={{ flex: 1, border: 'none', borderBottom: '1px solid #edf2f7', margin: '0 5px', fontSize: '0.85rem' }}
                                />
                                <input
                                    placeholder="Qtd"
                                    value={item.qtd}
                                    onChange={e => {
                                        const newVedacoes = [...vedacoes];
                                        newVedacoes[index].qtd = e.target.value;
                                        setVedacoes(newVedacoes);
                                    }}
                                    style={{ width: '60px', textAlign: 'center', border: 'none', borderBottom: '1px solid #edf2f7', margin: '0 5px', fontSize: '0.85rem' }}
                                />
                                <input
                                    placeholder="UN"
                                    value={item.unidade}
                                    onChange={e => {
                                        const newVedacoes = [...vedacoes];
                                        newVedacoes[index].unidade = e.target.value;
                                        setVedacoes(newVedacoes);
                                    }}
                                    style={{ width: '60px', textAlign: 'center', border: 'none', borderBottom: '1px solid #edf2f7', margin: '0 5px', fontSize: '0.85rem' }}
                                />
                                <input
                                    placeholder="Obs..."
                                    value={item.observacao}
                                    onChange={e => {
                                        const newVedacoes = [...vedacoes];
                                        newVedacoes[index].observacao = e.target.value;
                                        setVedacoes(newVedacoes);
                                    }}
                                    style={{ flex: 1, border: 'none', borderBottom: '1px solid #edf2f7', margin: '0 5px', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newVedacoes = vedacoes.filter((_, i) => i !== index);
                                        setVedacoes(newVedacoes);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: '5px' }}
                                    title="Remover vedação"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="btn-add-comp" style={{ marginTop: '1.5rem' }} onClick={() => {
                        setVedacoes([...vedacoes, {
                            id: crypto.randomUUID(),
                            text: '',
                            qtd: '1',
                            unidade: 'PC',
                            status: 'azul',
                            conformidade: 'não conforme',
                            anomalia: '',
                            solucao: '',
                            fotos: [],
                            observacao: '',
                            tipo: 'vedação'
                        }]);
                    }}>
                        <Plus size={18} /> Adicionar Material
                    </button>
                </section>

                <div className="footer-actions">
                    <button type="button" className="btn-finalize" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Processando...' : 'Finalizar e Registrar Peritagem'}
                    </button>
                </div>
            </form>

            {/* Inputs de arquivo invisíveis */}
            <input
                type="file"
                ref={camInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
            />
            <input
                type="file"
                ref={galleryInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={onFileChange}
            />
        </div >
    );
};
