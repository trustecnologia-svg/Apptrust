import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Helper: returns true if the value has meaningful content
const hasValue = (val: string | undefined | null): boolean => {
    if (!val) return false;
    const trimmed = val.trim();
    return trimmed !== '' && trimmed !== '-';
};

// Fontes nativas para evitar erros de rede
const FONT_FAMILY = 'Helvetica';

const formatDim = (val: string | undefined) => {
    if (!val) return '-';
    let v = val.trim();
    if (v.includes('"')) return v;
    return v.replace(/\s*mm$/i, '') + ' mm';
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 80,
        paddingLeft: 40,
        paddingRight: 40,
        fontSize: 10,
        fontFamily: FONT_FAMILY,
        color: '#333',
        backgroundColor: '#fff'
    },
    // Estilos da Capa
    coverPage: {
        padding: 60,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    coverLogo: {
        width: 180,
        marginBottom: -35,
        marginTop: -30
    },
    coverTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    coverSubtitle: {
        fontSize: 10,
        color: '#7f8c8d',
        marginBottom: 30,
        textAlign: 'center',
    },
    coverDivider: {
        width: '60%',
        height: 1,
        backgroundColor: '#bdc3c7',
        marginBottom: 30,
    },
    coverDetails: {
        width: '100%',
        alignItems: 'center',
        gap: 15
    },
    coverDetailItem: {
        alignItems: 'center',
        marginBottom: 10
    },
    coverDetailLabel: {
        fontSize: 8,
        color: '#95a5a6',
        fontWeight: 'bold',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    coverDetailValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#005696',
        paddingBottom: 10
    },
    logo: {
        width: 120
    },
    titleContainer: {
        textAlign: 'right'
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#005696'
    },
    reportSubtitle: {
        fontSize: 10,
        color: '#666'
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        backgroundColor: '#005696',
        color: '#fff',
        padding: 5,
        marginTop: 10,
        marginBottom: 8,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 5
    },
    infoItem: {
        width: '50%',
        marginBottom: 4
    },
    label: {
        fontWeight: 'bold',
        color: '#555'
    },
    value: {
        color: '#000'
    },
    // Tabela Usiminas
    table: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ccc'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#005696',
        color: '#fff',
        fontWeight: 'bold',
        padding: 5
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 4,
        alignItems: 'center'
    },
    colNo: { width: '5%', textAlign: 'center' },
    colDesc: { width: '42%' },
    colX: { width: '20%', textAlign: 'center' }, // Largura para "NÃO CONFORME"
    colQtd: { width: '8%', textAlign: 'center' },
    colDim: { width: '25%' },

    technicalOpinion: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee'
    },
    // Estilos de Análise Detalhada (Similar ao App)
    analysisBlock: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#005696',
        borderRadius: 4,
        padding: 8,
    },
    analysisHeader: {
        backgroundColor: '#005696',
        color: '#fff',
        padding: 4,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    analysisRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    analysisField: {
        flex: 1,
    },
    analysisLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#000000',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    analysisValue: {
        fontSize: 9,
        borderWidth: 1,
        borderColor: '#fee2e2',
        padding: 4,
        borderRadius: 3,
        minHeight: 40, // Aumentado para acomodar textos "Outros"
        color: '#000000',
    },
    materialFaltanteBox: {
        backgroundColor: '#f0fff4',
        borderWidth: 1,
        borderColor: '#27ae60',
        borderRadius: 4,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 25
    },
    // Estilos para Fotos nos Itens
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 5,
    },
    photoContainer: {
        width: '48%',
        height: 180,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 4,
        padding: 4,
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    itemPhoto: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'center',
        backgroundColor: '#f8fafc'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        textAlign: 'center',
        fontSize: 8,
        color: '#999'
    }
});

interface Item {
    id?: number;
    descricao: string;
    selecionado: boolean;
    qtd: string;
    dimensoes: string;
    conformidade: string;
    diametro_encontrado?: string;
    diametro_ideal?: string;
    material_faltante?: string;
    diametro_externo_encontrado?: string;
    diametro_externo_especificado?: string;
    desvio_externo?: string;
    diametro_interno_encontrado?: string;
    diametro_interno_especificado?: string;
    desvio_interno?: string;
    comprimento_encontrado?: string;
    comprimento_especificado?: string;
    desvio_comprimento?: string;
    anomalias?: string;
    solucao?: string;
    fotos?: string[];
}

interface Vedacao {
    descricao: string;
    qtd: string;
    unidade: string;
    observacao: string;
    conformidade: string;
    selecionado: boolean;
}

interface ReportData {
    numero_os: string;
    ni: string;
    pedido: string;
    nota_fiscal: string;
    cliente: string;
    data: string;
    tag: string;
    local_equipamento: string;
    responsavel_tecnico: string;
    camisa_int: string;
    camisa_ext: string;
    camisa_comp: string;
    haste_diam: string;
    haste_comp: string;
    curso: string;
    items: Item[];
    vedacoes: Vedacao[];
    parecer_tecnico: string;
    logo_trusteng: string;
    foto_frontal?: string;
    desenho_conjunto?: string;
    tipo_modelo?: string;
    fabricante?: string;
    lubrificante?: string;
    volume?: string;
    acoplamento_polia?: string;
    sistema_lubrificacao?: string;
    outros_especificar?: string;

    observacoes_gerais?: string;
    area?: string;
    linha?: string;
}

export const UsiminasReportTemplate: React.FC<{ data: ReportData }> = ({ data }) => (
    <Document>
        {/* PÁGINA 0: CAPA */}
        <Page size="A4" style={styles.coverPage}>
            <Image src="/logo.png" style={styles.coverLogo} />
            <Text style={styles.coverTitle}>RELATÓRIO TÉCNICO DE PERITAGEM</Text>


            <View style={styles.coverDivider} />

            <View style={styles.coverDetails}>
                <View style={styles.coverDetailItem}>
                    <Text style={styles.coverDetailLabel}>CLIENTE</Text>
                    <Text style={styles.coverDetailValue}>{data.cliente}</Text>
                </View>
                <View style={styles.coverDetailItem}>
                    <Text style={styles.coverDetailLabel}>ORDEM DE SERVIÇO</Text>
                    <Text style={styles.coverDetailValue}>{(data.numero_os && (!data.numero_os.startsWith('S/OS-') || data.numero_os.length < 15)) ? data.numero_os : 'NÃO INFORMADA'}</Text>
                </View>
                <View style={styles.coverDetailItem}>
                    <Text style={styles.coverDetailLabel}>DATA DE EMISSÃO</Text>
                    <Text style={styles.coverDetailValue}>{data.data}</Text>
                </View>
            </View>
        </Page>

        {/* PÁGINA 1: Identificação e Lista de Peças */}
        <Page size="A4" style={styles.page}>
            {/* Foto Frontal no topo da página 2 */}
            {data.foto_frontal && (
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                    <Image src={data.foto_frontal} style={{ width: '100%', height: 280, objectFit: 'contain', objectPosition: 'center' }} />
                </View>
            )}

            <View style={{ marginBottom: 20 }}>
                {/* Título Central */}


                {/* Tabela de Cabeçalho - Layout 2 Colunas */}
                <View style={{ marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 }}>
                    {/* Título com faixa azul */}
                    <View style={{ padding: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#005696', marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>IDENTIFICAÇÃO</Text>
                    </View>

                    {/* Grid de 2 Colunas - Somente campos preenchidos */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {/* Coluna 1 */}
                        <View style={{ width: '50%', paddingRight: 10 }}>
                            {hasValue(data.numero_os) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>LAUDO / REPARO:</Text>
                                    <Text style={{ fontSize: 9 }}>{(data.numero_os && (!data.numero_os.startsWith('S/OS-') || data.numero_os.length < 15)) ? data.numero_os : 'NÃO INFORMADA'}</Text>
                                </View>
                            )}
                            {hasValue(data.tipo_modelo) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>TIPO:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.tipo_modelo}</Text>
                                </View>
                            )}
                            {hasValue(data.linha) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>LINHA:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.linha}</Text>
                                </View>
                            )}
                            {hasValue(data.local_equipamento) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>LOCAL:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.local_equipamento}</Text>
                                </View>
                            )}
                        </View>

                        {/* Coluna 2 */}
                        <View style={{ width: '50%', paddingLeft: 10 }}>
                            {hasValue(data.area) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>ÁREA:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.area}</Text>
                                </View>
                            )}
                            {hasValue(data.desenho_conjunto) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>DESENHO:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.desenho_conjunto}</Text>
                                </View>
                            )}
                            {hasValue(data.tag) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>TAG:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.tag}</Text>
                                </View>
                            )}
                            {hasValue(data.ni) && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#555', marginBottom: 2 }}>MATERIAL / NI:</Text>
                                    <Text style={{ fontSize: 9 }}>{data.ni}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* Tabela de Dimensões sem bordas com cabeçalho azul */}
            <View style={{ marginTop: 10 }} wrap={false}>
                <View style={{ backgroundColor: '#005696', padding: 3, marginBottom: 0 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }}>DIMENSÕES TÉCNICAS (MM)</Text>
                </View>
                {/* Layout Stacked para evitar sobreposição */}
                <View style={{ padding: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 2 }}>
                        <Text style={{ fontSize: 9, marginRight: 30 }}>
                            <Text style={{ fontWeight: 'bold' }}>CAMISA: </Text>
                            Ø INT. {formatDim(data.camisa_int)} x Ø EXT. {formatDim(data.camisa_ext)} x COMP. {formatDim(data.camisa_comp)}
                        </Text>
                        <Text style={{ fontSize: 9 }}>
                            <Text style={{ fontWeight: 'bold' }}>HASTE: </Text>
                            Ø {formatDim(data.haste_diam)} x COMP. {formatDim(data.haste_comp)}
                        </Text>
                    </View>
                    <View style={{ marginTop: 0 }}>
                        <Text style={{ fontSize: 9 }}>
                            <Text style={{ fontWeight: 'bold' }}>CURSO: </Text>
                            {formatDim(data.curso)}
                        </Text>
                    </View>
                </View>
            </View>



            {/* Início da Tabela de Itens na mesma página */}

            <View style={styles.table} wrap={false}>
                <View style={styles.tableHeader}>
                    <Text style={styles.colNo}>N°</Text>
                    <Text style={{ width: '67%' }}>DESCRIÇÃO DE PEÇA/SERVIÇO</Text>
                    <Text style={styles.colX}>X</Text>
                    <Text style={styles.colQtd}>QTD</Text>
                </View>
                {data.items.map((item, index) => (
                    <View key={index} style={styles.tableRow} wrap={false}>
                        <Text style={styles.colNo}>{index + 1}</Text>
                        <Text style={{ width: '67%' }} hyphenationCallback={(word) => [word]}>{item.descricao}</Text>
                        <Text style={[styles.colX, {
                            color: item.selecionado ? '#e67e22' : '#27ae60',
                            fontSize: item.selecionado ? 7 : 7,
                            fontWeight: 'bold'
                        }]}>
                            {item.selecionado ? 'NÃO CONFORME' : 'CONFORME'}
                        </Text>
                        <Text style={styles.colQtd}>{item.qtd || '-'}</Text>
                    </View>
                ))}
            </View>



            {/* Vedações - Logo após a tabela de itens */}
            {data.vedacoes && data.vedacoes.length > 0 && (
                <View break={false}>
                    <View style={[styles.sectionTitle, { marginTop: 15 }]}>
                        <Text>MATERIAL</Text>
                    </View>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colNo}>N°</Text>
                            <Text style={styles.colDesc}>DESCRIÇÃO</Text>
                            <Text style={styles.colX}>CONFORMIDADE</Text>
                            <Text style={styles.colQtd}>QTD</Text>
                            <Text style={styles.colDim}>OBSERVAÇÃO</Text>
                        </View>
                        {data.vedacoes.map((v, index) => (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <Text style={styles.colNo}>{index + 1}</Text>
                                <Text style={styles.colDesc} hyphenationCallback={(word) => [word]}>{v.descricao}</Text>
                                <Text style={[styles.colX, {
                                    color: v.selecionado ? '#e67e22' : '#27ae60',
                                    fontSize: 7,
                                    fontWeight: 'bold'
                                }]}>
                                    {v.selecionado ? 'NÃO CONFORME' : 'CONFORME'}
                                </Text>
                                <Text style={styles.colQtd}>{v.qtd}</Text>
                                <Text style={styles.colDim}>{v.selecionado ? '-' : (v.observacao || '-')}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Análise Detalhada - Fluxo contínuo */}
            {data.items.some(i => i.selecionado) && (
                <View>
                    {data.items.filter(i => i.selecionado).map((item, index) => (
                        <View key={index} wrap={false}>
                            {index === 0 && (
                                <View style={[styles.sectionTitle, { marginTop: 20 }]}>
                                    <Text>ANÁLISE DETALHADA DE NÃO CONFORMIDADES</Text>
                                </View>
                            )}
                            <View style={styles.analysisBlock} wrap={false}>
                                <View style={styles.analysisHeader}>
                                    <Text>ITEM {item.id || (index + 1)}: {item.descricao}</Text>
                                </View>
                                <View style={styles.analysisRow}>
                                    <View style={{ width: '100%' }}>
                                        <Text style={styles.analysisLabel}>Qtd</Text>
                                        <Text style={styles.analysisValue}>{item.qtd}</Text>
                                    </View>
                                </View>
                                {/* Diâmetro Interno */}
                                {(item.diametro_interno_encontrado || item.diametro_interno_especificado) && (
                                    <View style={styles.analysisRow}>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Ø Int. Enc. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.diametro_interno_encontrado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Ø Int. Espec. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.diametro_interno_especificado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={[styles.analysisLabel, { color: '#27ae60' }]}>Desvio</Text>
                                            <View style={styles.materialFaltanteBox}>
                                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: parseFloat(item.desvio_interno || '0') < 0 ? '#e74c3c' : '#27ae60' }}>
                                                    {item.desvio_interno ? `${parseFloat(item.desvio_interno) >= 0 ? '+' : ''}${item.desvio_interno.replace('.', ',')} mm` : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Diâmetro Externo */}
                                {(item.diametro_externo_encontrado || item.diametro_externo_especificado) && (
                                    <View style={styles.analysisRow}>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Ø Ext. Enc. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.diametro_externo_encontrado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Ø Ext. Espec. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.diametro_externo_especificado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={[styles.analysisLabel, { color: '#27ae60' }]}>Desvio</Text>
                                            <View style={styles.materialFaltanteBox}>
                                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: parseFloat(item.desvio_externo || '0') < 0 ? '#e74c3c' : '#27ae60' }}>
                                                    {item.desvio_externo ? `${parseFloat(item.desvio_externo) >= 0 ? '+' : ''}${item.desvio_externo.replace('.', ',')} mm` : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Comprimento */}
                                {(item.comprimento_encontrado || item.comprimento_especificado) && (
                                    <View style={styles.analysisRow}>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Comp. Enc. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.comprimento_encontrado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={styles.analysisLabel}>Comp. Espec. (mm)</Text>
                                            <Text style={styles.analysisValue}>{item.comprimento_especificado || '-'}</Text>
                                        </View>
                                        <View style={styles.analysisField}>
                                            <Text style={[styles.analysisLabel, { color: '#27ae60' }]}>Desvio</Text>
                                            <View style={styles.materialFaltanteBox}>
                                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: parseFloat(item.desvio_comprimento || '0') < 0 ? '#e74c3c' : '#27ae60' }}>
                                                    {item.desvio_comprimento ? `${parseFloat(item.desvio_comprimento) >= 0 ? '+' : ''}${item.desvio_comprimento.replace('.', ',')} mm` : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                                <View style={styles.analysisRow}>
                                    <View style={styles.analysisField}>
                                        <Text style={styles.analysisLabel}>Anomalia Encontrada</Text>
                                        <Text style={styles.analysisValue}>{item.anomalias || '-'}</Text>
                                    </View>
                                    <View style={styles.analysisField}>
                                        <Text style={styles.analysisLabel}>Solução Recomendada</Text>
                                        <Text style={styles.analysisValue}>{item.solucao || '-'}</Text>
                                    </View>
                                </View>

                                {/* Fotos do Item */}
                                {item.fotos && item.fotos.length > 0 && (
                                    <View style={styles.photoGrid}>
                                        {item.fotos.map((foto, fIdx) => (
                                            <View key={fIdx} style={styles.photoContainer} wrap={false}>
                                                <Image src={foto} style={styles.itemPhoto} />
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.footer} fixed>
                <Text>Documento gerado automaticamente pela www.trusttecnologia.com.br</Text>
            </View>
        </Page>
    </Document >
);
