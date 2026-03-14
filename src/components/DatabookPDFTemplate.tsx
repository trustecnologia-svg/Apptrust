import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export interface PeritagemData {
    id: string;
    tag: string;
    cliente: string;
    os_interna: string;
    os: string;
    numero_peritagem: string;
    ni: string;
    numero_pedido: string;
    nota_fiscal: string;
    data_execucao: string;
    local_equipamento: string;
    responsavel_tecnico: string;
    camisa_int: string;
    camisa_ext: string;
    camisa_comp: string;
    haste_diam: string;
    haste_comp: string;
    curso: string;
    desenho_conjunto: string;
    area: string;
    linha: string;
    tipo_modelo: string;
    foto_frontal: string;
    fotos_montagem?: string[];
    fotos_videos_teste?: string[];
    foto_pintura_final?: string;
    databook_pronto?: boolean;
}

export interface AnaliseItem {
    id: string;
    componente: string;
    diametro_interno_encontrado: string;
    diametro_interno_especificado: string;
    diametro_externo_encontrado: string;
    diametro_externo_especificado: string;
    anomalias: string;
    solucao: string;
    fotos: string[];
    desvio_interno?: string;
    desvio_externo?: string;
    conformidade: string;
}

// PDF Styles - Modelo Premium Minimalista
export const s = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#ffffff',
    },
    // Header fixo em todas as páginas
    header: {
        backgroundColor: '#1a2e63',
        paddingVertical: 12,
        paddingHorizontal: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 8,
        letterSpacing: 1,
    },
    // Corpo
    body: {
        padding: 30,
    },
    // Seção
    sectionContainer: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
    },
    sectionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1a2e63',
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 24,
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Grid de fotos
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    imageCard: {
        width: '47%',
        marginBottom: 10,
    },
    imageWrapper: {
        position: 'relative',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    image: {
        width: '100%',
        height: 180, // Aumentado um pouco
        objectFit: 'contain',
        objectPosition: 'center',
    },
    imageLabel: {
        fontSize: 7,
        textAlign: 'center',
        marginTop: 4,
        color: '#94a3b8',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Dados técnicos
    dataBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dataField: {
        flex: 1,
    },
    dataLabel: {
        fontSize: 7,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    dataValue: {
        fontSize: 10,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a2e63',
        paddingVertical: 6,
        paddingHorizontal: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 6,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    // Pintura grande
    pinturaImage: {
        width: '100%',
        height: 400,
        objectFit: 'contain',
        objectPosition: 'center',
    },
    // Componentes analisados
    compBadge: {
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        marginRight: 6,
        marginBottom: 6,
    },
    compText: {
        fontSize: 7,
        color: '#475569',
        fontWeight: 'bold',
    },
});

export const ImageCard = ({ src, label }: { src: string, label?: string }) => (
    <View style={s.imageCard} wrap={false}>
        <View style={s.imageWrapper}>
            <Image src={src} style={s.image} />
        </View>
        {label && <Text style={s.imageLabel}>{label}</Text>}
    </View>
);

export const DatabookPDF = ({ peritagem, itens }: { peritagem: any, itens: any[] }) => (
    <Document>
        <Page size="A4" style={s.page} wrap>
            {/* Header fixo */}
            <View style={s.header} fixed>
                <View>
                    <Text style={s.headerTitle}>Databook Técnico</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.headerSubtitle}>OS: {peritagem.os_interna || ((peritagem.os && (!peritagem.os.startsWith('S/OS-') || peritagem.os.length < 15)) ? peritagem.os : '-')}</Text>
                    <Text style={s.headerSubtitle}>{peritagem.cliente}</Text>
                </View>
            </View>

            {/* Body */}
            <View style={s.body}>
                {/* Dados Gerais */}
                <View style={s.dataBox}>
                    <View style={s.dataRow}>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>TAG</Text>
                            <Text style={s.dataValue}>{peritagem.tag || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Cliente</Text>
                            <Text style={s.dataValue}>{peritagem.cliente}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>O.S</Text>
                            <Text style={s.dataValue}>{peritagem.os_interna || ((peritagem.os && (!peritagem.os.startsWith('S/OS-') || peritagem.os.length < 15)) ? peritagem.os : 'NÃO INFORMADA')}</Text>
                        </View>
                    </View>
                    <View style={s.dataRow}>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Pedido</Text>
                            <Text style={s.dataValue}>{peritagem.numero_pedido || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>NF</Text>
                            <Text style={s.dataValue}>{peritagem.nota_fiscal || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Data</Text>
                            <Text style={s.dataValue}>{peritagem.data_execucao ? new Date(peritagem.data_execucao).toLocaleDateString('pt-BR') : '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* 1. Peritagem */}
                <View style={s.sectionContainer}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionNumber}>1</Text>
                        <Text style={s.sectionTitle}>Registro Fotográfico (Peritagem)</Text>
                    </View>
                    <View style={s.imageGrid}>
                        {peritagem.foto_frontal && (
                            <ImageCard src={peritagem.foto_frontal} label="Vista Geral" />
                        )}
                        {itens.map(item => item.fotos?.slice(0, 1).map((foto: string, fIdx: number) => (
                            <ImageCard
                                key={`${item.id}-${fIdx}`}
                                src={foto}
                                label={item.componente}
                            />
                        )))}
                    </View>
                </View>

                {/* 2. Montagem */}
                {(peritagem.fotos_montagem?.length || 0) > 0 && (
                    <View style={s.sectionContainer} break>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionNumber}>2</Text>
                            <Text style={s.sectionTitle}>Montagem e Recuperação</Text>
                        </View>
                        <View style={s.imageGrid}>
                            {peritagem.fotos_montagem?.map((foto: string, idx: number) => (
                                <ImageCard
                                    key={idx}
                                    src={foto}
                                    label={`Montagem ${idx + 1}`}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* 3. Testes */}
                {(peritagem.fotos_videos_teste?.length || 0) > 0 && (
                    <View style={s.sectionContainer} break>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionNumber}>3</Text>
                            <Text style={s.sectionTitle}>Testes de Qualidade</Text>
                        </View>
                        <View style={s.imageGrid}>
                            {peritagem.fotos_videos_teste?.filter((url: string) => !url.toLowerCase().endsWith('.mp4')).map((foto: string, idx: number) => (
                                <ImageCard
                                    key={idx}
                                    src={foto}
                                    label={`Teste ${idx + 1}`}
                                />
                            ))}
                        </View>
                        <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>* Vídeos de teste disponíveis no portal online.</Text>
                    </View>
                )}

                {/* 4. Pintura */}
                {peritagem.foto_pintura_final && (
                    <View style={s.sectionContainer} break>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionNumber}>4</Text>
                            <Text style={s.sectionTitle}>Pintura e Acabamento Final</Text>
                        </View>
                        <View style={{ alignItems: 'center' }} wrap={false}>
                            <View style={s.imageWrapper}>
                                <Image src={peritagem.foto_pintura_final} style={s.pinturaImage} />
                            </View>
                            <Text style={s.imageLabel}>Resultado Final</Text>
                        </View>
                    </View>
                )}

                {/* Componentes Analisados - Última Folha */}
                {itens.length > 0 && (
                    <View style={{ marginTop: 20 }} break>
                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold', marginBottom: 10 }}>Componentes Analisados:</Text>
                        <View style={{ flexDirection: 'column', gap: 6 }}>
                            {itens.map(item => (
                                <View key={item.id} style={[s.compBadge, { marginBottom: 6, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' }]}>
                                    <Text style={[s.compText, { fontSize: 8 }]}>{item.componente} - {item.conformidade === 'CONFORME' ? '✓' : '!'} {item.solucao}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Footer fixo */}
            <View style={s.footer} fixed>
                <Text style={s.footerText}>Databook Digital</Text>
                <Text style={s.footerText}>www.trusttecnologia.com.br</Text>
            </View>
        </Page>
    </Document>
);
