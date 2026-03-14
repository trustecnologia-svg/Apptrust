const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/components/Sidebar.tsx',
    'src/pages/Dashboard.tsx',
    'src/pages/Peritagens.tsx',
    'src/pages/Relatorios.tsx',
    'src/pages/Monitoramento.tsx'
];

filesToFix.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Corrige "Guardando" para "Aguardando"
        // E remove duplicatas como "AAguardando" se houver
        content = content.replace(/([^A])uardando/g, '$1guardando'); // Casos como "guardando" -> "Aguardando"
        // Caso específico do início da string ou sem contexto
        content = content.replace(/\bGuardando\b/g, 'Aguardando');

        // Garante "Aguardando Clientes" (plural) se for o caso
        content = content.replace(/Aguardando Cliente\b/g, 'Aguardando Clientes');

        fs.writeFileSync(fullPath, content);
        console.log(`Corrigido: ${file}`);
    } else {
        console.log(`Não encontrado: ${file}`);
    }
});
