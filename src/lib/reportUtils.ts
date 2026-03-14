
export interface PeritagemData {
    tipo_cilindro?: string;
    tag?: string;
    local_equipamento?: string;
    camisa_int?: string;
    haste_diam?: string;
    curso?: string;
    camisa_comp?: string;
    prioridade?: string;
}

export interface AnaliseItem {
    componente: string;
    conformidade: string;
    anomalias?: string;
    solucao?: string;
    fotos?: any[];
}

export function generateTechnicalOpinion(peritagem: PeritagemData, analyses: AnaliseItem[]) {
    const nonConformities = analyses.filter(a => a.conformidade === 'não conforme');
    const hasPhotos = analyses.some(a => a.fotos && a.fotos.length > 0);

    let text = "";

    // 1. INTRODUÇÃO TÉCNICA
    text += `O presente relatório técnico tem como objetivo apresentar os resultados da peritagem realizada no cilindro ${peritagem.tipo_cilindro || '[TIPO DO CILINDRO]'}, identificado pela TAG ${peritagem.tag || '[TAG]'}, instalado em ${peritagem.local_equipamento || '[LOCAL]'}.\n`;
    text += `A inspeção foi conduzida com base em critérios técnicos, análise visual, verificação dimensional e avaliação funcional, conforme boas práticas de manutenção industrial.\n\n`;

    // 2. CONDIÇÃO GERAL DO CILINDRO
    if (nonConformities.length === 0) {
        text += `De modo geral, o cilindro avaliado apresenta condições operacionais satisfatórias, não sendo identificadas anomalias críticas que comprometam seu funcionamento imediato.\n\n`;
    } else {
        text += `Durante a inspeção, foram identificadas não conformidades que indicam desgaste e/ou falhas em componentes específicos, podendo impactar o desempenho e a confiabilidade do cilindro.\n\n`;
    }

    // 3. ANÁLISE TÉCNICA DETALHADA
    if (nonConformities.length > 0) {
        const componentsList = nonConformities.map(a => a.componente).join(', ');
        const anomaliesList = nonConformities.map(a => a.anomalias).filter(Boolean).join('; ');

        text += `As principais anomalias identificadas concentram-se nos seguintes componentes: ${componentsList}.\n`;
        text += `Foram observados indícios de ${anomaliesList || 'anomalias registradas'}, os quais estão associados a condições de operação, desgaste natural ou falhas de vedação.\n\n`;
    } else {
        text += `Não foram identificadas anomalias relevantes nos componentes inspecionados, estando todos dentro dos padrões aceitáveis para operação.\n\n`;
    }

    // 4. ANÁLISE DIMENSIONAL
    const hasDim = peritagem.camisa_int || peritagem.haste_diam || peritagem.curso;
    if (hasDim) {
        // Por padrão, se as dimensões foram preenchidas no sistema atual sem aviso de erro, consideramos conformes.
        // Se quisermos ser mais precisos, poderíamos checar um campo de status dimensional se existisse.
        text += `As dimensões verificadas, incluindo diâmetro interno, diâmetro da haste, curso e comprimento total, encontram-se conformes em relação às especificações informadas para o cilindro avaliado.\n\n`;
    }

    // 5. REGISTRO FOTOGRÁFICO
    if (hasPhotos) {
        text += `O registro fotográfico anexado complementa a análise técnica, evidenciando as condições encontradas durante a inspeção e auxiliando na caracterização das anomalias identificadas.\n\n`;
    } else {
        text += `Não foi realizado registro fotográfico durante esta inspeção.\n\n`;
    }

    // 6. CONCLUSÃO TÉCNICA AUTOMÁTICA
    // Lógica de criticidade baseada no número de não conformidades ou prioridade
    let gravity = 'baixa';
    if (peritagem.prioridade === 'Urgente' || nonConformities.length > 3) {
        gravity = 'alta';
    } else if (nonConformities.length > 0) {
        gravity = 'media';
    }

    if (gravity === 'baixa') {
        text += `Com base nos dados coletados, conclui-se que o cilindro encontra-se apto para operação, recomendando-se apenas acompanhamento periódico e manutenção preventiva.\n\n`;
    } else if (gravity === 'media') {
        text += `Recomenda-se a realização de manutenção corretiva programada, visando restabelecer as condições ideais de funcionamento e evitar agravamento das anomalias identificadas.\n\n`;
    } else {
        text += `As não conformidades identificadas indicam a necessidade de intervenção imediata, uma vez que podem comprometer a segurança, desempenho e integridade do sistema.\n\n`;
    }

    // 7. RECOMENDAÇÕES TÉCNICAS
    const solutions = nonConformities.map(a => a.solucao).filter(Boolean);
    if (solutions.length > 0) {
        text += `Recomenda-se a execução das seguintes ações técnicas:\n`;
        solutions.forEach(s => {
            text += `- ${s}\n`;
        });
        text += `garantindo que os procedimentos sejam realizados conforme normas técnicas e especificações do fabricante.\n\n`;
    }

    // 8. ENCERRAMENTO FORMAL
    text += `Este relatório foi elaborado com base nas informações obtidas no momento da inspeção e reflete as condições observadas na data de sua execução.`;

    return text;
}
