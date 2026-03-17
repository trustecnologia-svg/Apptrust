export interface PeritagemItemTemplate {
    id: number;
    descricao: string;
}

export const PERITAGEM_CATALOG: PeritagemItemTemplate[] = [
    // HASTE
    { id: 1, descricao: 'HASTE - Recuperação da camada de cromo por retífica e nova deposição eletrolítica (Cromo Duro)' },
    { id: 2, descricao: 'HASTE - Fabricação de nova haste em aço SAE 1045/4140 com tratamento térmico e cromo' },
    { id: 3, descricao: 'HASTE - Recuperação de roscas da ponteira/haste por soldagem e usinagem de precisão' },
    { id: 4, descricao: 'HASTE - Polimento técnico para remoção de riscos superficiais e oxidação leve' },
    
    // CAMISA
    { id: 10, descricao: 'CAMISA - Brunimento interno para regularização da superfície de trabalho e rugosidade' },
    { id: 11, descricao: 'CAMISA - Fabricação de nova camisa em aço ST-52 ou similar conforme desenho técnico' },
    { id: 12, descricao: 'CAMISA - Recuperação de alojamentos de vedações estáticas e anéis de retenção' },
    { id: 13, descricao: 'CAMISA - Substituição/Retífica de conexões de alimentação e tomadas de pressão' },
    
    // CABEÇOTES E TAMPAS
    { id: 20, descricao: 'CABEÇOTE GUIA - Substituição da bucha guia por nova em Bronze TM-23 ou similar' },
    { id: 21, descricao: 'CABEÇOTE GUIA - Recuperação de alojamentos de vedação e raspadores por usinagem' },
    { id: 22, descricao: 'CABEÇOTE GUIA - Fabricação de novo cabeçote guia conforme amostra ou desenho' },
    { id: 23, descricao: 'CABEÇOTE TRASEIRO - Recuperar pontos de fixação e furos de alimentação' },
    { id: 24, descricao: 'CABEÇOTE TRASEIRO - Fabricação de novo cabeçote traseiro/tampa' },
    
    // ÊMBOLO E SISTEMA DE ARRASTE
    { id: 30, descricao: 'ÊMBOLO - Fabricação de novo êmbolo completo com guias de polímero' },
    { id: 31, descricao: 'ÊMBOLO - Readequação de canais de vedação e polimento de faces de encosto' },
    { id: 32, descricao: 'ÊMBOLO - Substituição de anéis guia e fitas de desgaste' },
    
    // VEDAÇÕES E KITS
    { id: 40, descricao: 'VEDAÇÕES - Fornecimento e montagem de Kit de Vedação Completo (Vedantes de Alta Performance)' },
    { id: 41, descricao: 'VEDAÇÕES - Substituição de vedações em polímeros especiais (Viton, PTFE, Poliuretano)' },
    { id: 42, descricao: 'VEDAÇÕES - Substituição de anéis O-Ring e anéis anti-extrusão' },
    
    // FIXAÇÃO E ACESSÓRIOS
    { id: 50, descricao: 'FIXAÇÃO - Substituição/Manutenção de rótulas, olhais e munhões de articulação' },
    { id: 51, descricao: 'FIXAÇÃO - Substituição de parafusos, tirantes e porcas de travamento mecânico' },
    { id: 52, descricao: 'ACESSÓRIOS - Instalação de nova proteção sanfonada técnico-industrial' },
    { id: 53, descricao: 'ACESSÓRIOS - Limpeza, desobstrução e teste de graxeiros/canais de lubrificação' },
    
    // TESTES E FINALIZAÇÃO
    { id: 60, descricao: 'CONJUNTO - Desmontagem técnica, limpeza química e peritagem detalhada' },
    { id: 61, descricao: 'CONJUNTO - Montagem, teste hidrostático de estanqueidade e pintura final' },
    { id: 62, descricao: 'CONJUNTO - Emissão de Certificado de Teste e Laudo Técnico de Entrega' }
];
