import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { Search, QrCode, Loader2, Calendar, FileDown, ExternalLink } from 'lucide-react';
import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import './QrCodePage.css';

interface PeritagemSummary {
    id: string;
    tag: string;
    os: string;
    cliente: string;
    created_at: string;
    os_interna?: string;
    numero_peritagem?: string;
    databook_pronto?: boolean;
    etapa_atual?: string;
}

// PDF Styles - Design "Minimalist Premium Signature"
const pdfStyles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: '#f1f5f9', // Fundo levemente cinza para destacar a plaqueta
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Moldura Premium com Sombra e Bordas Arredondadas
    container: {
        width: 380,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 0, // Tiramos o padding para usar seções coloridas
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#1a2e63',
        // Sombra suave (simulada)
    },
    // Topo Azul Marinho (Barra de Título)
    topBar: {
        backgroundColor: '#1a2e63',
        padding: 8,
        alignItems: 'center',
    },
    topBarText: {
        color: '#ffffff',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    // Seção da Logo
    logoSection: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    logoImage: {
        width: 320,
        height: 160,
        objectFit: 'contain',
    },
    // Seção Central do QR Code
    qrSectionBase: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    qrWrapper: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 15,
        backgroundColor: '#ffffff',
    },
    qrImage: {
        width: 220,
        height: 220,
    },
    // Seção de Dados Técnicos (Estilo Tabela)
    dataSection: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    field: {
        flex: 1,
    },
    label: {
        fontSize: 7,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 3,
    },
    value: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    osValue: {
        fontSize: 12,
        color: '#475569',
        fontWeight: 'medium',
    },
    // Rodapé de Segurança
    footer: {
        padding: 10,
        backgroundColor: '#1a2e63',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#ffffff',
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.9,
    },
    lockIcon: {
        width: 8,
        height: 8,
        marginRight: 5,
        backgroundColor: '#ffffff', // Apenas um placeholder visual
    }
});

// PDF Template Component - Novo Modelo: Minimalista Premium
const QrCodePDF = ({ peritagem, qrDataUrl }: { peritagem: PeritagemSummary, qrDataUrl: string }) => (
    <Document>
        <Page size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.container}>
                {/* Barra de Título Superior */}
                <View style={pdfStyles.topBar}>
                    <Text style={pdfStyles.topBarText}>Especificação Técnica</Text>
                </View>

                {/* QR Code Central com Fundo Destacado */}
                <View style={pdfStyles.qrSectionBase}>
                    <View style={pdfStyles.qrWrapper}>
                        <Image src={qrDataUrl} style={pdfStyles.qrImage} />
                    </View>
                </View>

                {/* Dados Técnicos em Estilo Tabela Moderna */}
                <View style={pdfStyles.dataSection}>
                    <View style={pdfStyles.row}>
                        <View style={pdfStyles.field}>
                            <Text style={pdfStyles.label}>Identificação TAG</Text>
                            <Text style={pdfStyles.value}>{peritagem.tag || peritagem.numero_peritagem || 'N/A'}</Text>
                        </View>
                        <View style={[pdfStyles.field, { alignItems: 'flex-end' }]}>
                            <Text style={pdfStyles.label}>Ordem de Serviço</Text>
                            <Text style={pdfStyles.osValue}>{peritagem.os || peritagem.os_interna || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>Acesso Exclusivo via Databook Digital</Text>
                </View>
            </View>
        </Page>
    </Document>
);

// Função para obter a URL base correta (evita localhost no QR Code)
const getBaseUrl = () => {
    return 'https://www.hidraupperitagem.com.br';
};

export const QrCodePage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [allPeritagens, setAllPeritagens] = useState<PeritagemSummary[]>([]);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [qrConfig, setQrConfig] = useState<{ id: string, tag: string } | null>(null);

    useEffect(() => {
        fetchAllPeritagens();
    }, []);

    const fetchAllPeritagens = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, tag, os, cliente, created_at, os_interna, numero_peritagem, databook_pronto, etapa_atual')
                .eq('databook_pronto', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllPeritagens(data || []);
        } catch (error) {
            console.error('Erro ao buscar peritagens:', error);
            alert('Erro ao carregar lista de peritagens.');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePdf = async (peritagem: PeritagemSummary) => {
        setGeneratingId(peritagem.id);
        setQrConfig({ id: peritagem.id, tag: peritagem.tag });

        try {
            const generateDataUrl = (): Promise<string> => {
                return new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 10;

                    const checkCanvas = () => {
                        const canvasEl = document.getElementById('qr-canvas-hidden') as HTMLCanvasElement;
                        if (canvasEl) {
                            // Pequeno delay extra para garantir que o logo dentro do QR foi desenhado
                            setTimeout(() => {
                                try {
                                    resolve(canvasEl.toDataURL('image/png'));
                                } catch (e) {
                                    reject(new Error('Erro de segurança ao acessar o canvas (CORS).'));
                                }
                            }, 500);
                        } else if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(checkCanvas, 100);
                        } else {
                            reject(new Error('Elemento do QR Code não encontrado após várias tentativas.'));
                        }
                    };

                    setTimeout(checkCanvas, 100);
                });
            };

            const qrDataUrl = await generateDataUrl();
            if (!qrDataUrl) {
                alert('Erro ao gerar código QR. Tente novamente.');
                return;
            }

            const fileName = (peritagem.tag || peritagem.os_interna || peritagem.id).replace(/\s+/g, '_');
            const blob = await pdf(<QrCodePDF peritagem={peritagem} qrDataUrl={qrDataUrl} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_CODE_${fileName}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Erro ao gerar PDF detalhado:', error);
            alert(`Erro ao gerar o PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setGeneratingId(null);
            setQrConfig(null);
        }
    };

    const filteredPeritagens = allPeritagens.filter(p =>
        (p.tag?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.cliente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.os_interna?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.os?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const baseUrl = getBaseUrl();

    return (
        <div className="qrcode-page">
            <div className="qrcode-header">
                <QrCode size={32} color="#005696" />
                <h1>Gerador de QR Code</h1>
                <p>Lista de todas as peritagens. Gere o QR Code em PDF para identificação industrial.</p>
            </div>

            <div className="search-section">
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Filtrar por TAG, Cliente ou OS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="loading-container">
                        <Loader2 className="animate-spin" size={40} color="#005696" />
                        <p>Carregando peritagens...</p>
                    </div>
                ) : (
                    <>
                        <div className="peritagens-grid">
                            {filteredPeritagens.length === 0 ? (
                                <div className="no-results">
                                    <p>Nenhuma peritagem encontrada.</p>
                                </div>
                            ) : (
                                filteredPeritagens.map(p => (
                                    <div key={p.id} className="peritagem-card">
                                        <div className="card-top">
                                            <div className="card-qr-preview">
                                                <QRCodeCanvas
                                                    value={`${baseUrl}/view-report/${p.id}`}
                                                    size={120}
                                                    level="H"
                                                    includeMargin={true}
                                                    imageSettings={{
                                                        src: "/logo.png",
                                                        x: undefined,
                                                        y: undefined,
                                                        height: 20,
                                                        width: 20,
                                                        excavate: true,
                                                    }}
                                                />
                                            </div>
                                            <div className="card-main">
                                                <div className="card-info">
                                                    <span className="card-tag">{p.tag}</span>
                                                    <span className="card-client">{p.cliente}</span>
                                                    <span className="card-os">OS: {p.os_interna || p.numero_peritagem || p.os || '-'}</span>
                                                </div>
                                                <div className="card-date">
                                                    <Calendar size={14} />
                                                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-actions">
                                            <button
                                                className="btn-generate"
                                                onClick={() => handleGeneratePdf(p)}
                                                disabled={generatingId === p.id}
                                                title="Gerar QR Code"
                                            >
                                                {generatingId === p.id ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <FileDown size={18} />
                                                )}
                                                Gerar QR Code
                                            </button>

                                            <a
                                                href={`/view-report/${p.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-view"
                                                title="Ver Laudo Online"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'none' }}>
                            {qrConfig && (
                                <QRCodeCanvas
                                    id="qr-canvas-hidden"
                                    value={`${baseUrl}/view-report/${qrConfig.id}`}
                                    size={1024}
                                    level="H"
                                    includeMargin={true}
                                    imageSettings={{
                                        src: "/logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: 140,
                                        width: 140,
                                        excavate: true,
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
