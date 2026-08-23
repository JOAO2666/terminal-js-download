const https = require('https');
const readline = require('readline');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuração da API
const API_KEY = process.env.GEMINI_API_KEY || 'COLOQUE A CHAVE AQUI';
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'];

// Histórico da conversa
let conversationHistory = [];
let isGenerating = false;
let blockMode = false;
let blockBuffer = [];

// Suporte a cores no terminal (Desativa automaticamente se for Windows antigo sem suporte a ANSI)
const isWindows = process.platform === 'win32';
const release = os.release() || '';
const majorVersion = parseInt(release.split('.')[0], 10);
// Windows 10 build 10.0+ suporta ANSI nativo. Windows 7 (6.1) geralmente não suporta por padrão no cmd.exe
const supportsColor = Boolean(
  process.stdout.isTTY &&
  (!isWindows || majorVersion >= 10 || process.env.ANSICON || process.env.ConEmuANSI === 'ON' || process.env.TERM)
);

const colors = {
  reset: supportsColor ? '\x1b[0m' : '',
  bright: supportsColor ? '\x1b[1m' : '',
  dim: supportsColor ? '\x1b[2m' : '',
  cyan: supportsColor ? '\x1b[36m' : '',
  green: supportsColor ? '\x1b[32m' : '',
  yellow: supportsColor ? '\x1b[33m' : '',
  red: supportsColor ? '\x1b[31m' : '',
  magenta: supportsColor ? '\x1b[35m' : '',
  blue: supportsColor ? '\x1b[34m' : '',
  bgBlue: supportsColor ? '\x1b[44m' : '',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${colors.cyan}${colors.bright}Você > ${colors.reset}`
});

function printHeader() {

}

let lastAiResponse = '';

async function callGeminiStream(userMessage) {
  isGenerating = true;
  lastAiResponse = '';
  
  // Adiciona a mensagem do usuário ao histórico
  conversationHistory.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = JSON.stringify({
    contents: conversationHistory,
    systemInstruction: {
      parts: [{
        text: 'Você é um assistente de programação e inteligência artificial prestativo, claro e direto. ' +
              'Quando o usuário enviar código para analisar ou corrigir, forneça o código COMPLETO corrigido, ' +
              'nunca corte trechos de código com comentários como "...resto do código...", e explique as alterações.'
      }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });

  process.stdout.write(`\n${colors.magenta}${colors.bright}Terminal > ${colors.reset}`);

  let success = false;

  for (const model of MODELS) {
    try {
      success = await new Promise((resolve) => {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 45000
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${API_KEY}`;
        const req = https.request(url, options, (res) => {
          if (res.statusCode !== 200) {
            resolve(false);
            return;
          }

          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Mantém linha incompleta no buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const data = JSON.parse(jsonStr);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      lastAiResponse += text;
                      process.stdout.write(text);
                    }
                  } catch (e) {
                    // Ignora eventuais chunks JSON parciais
                  }
                }
              }
            }
          });

          res.on('end', () => {
            // Processa resto do buffer se houver
            if (buffer.startsWith('data: ')) {
              try {
                const data = JSON.parse(buffer.slice(6).trim());
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  lastAiResponse += text;
                  process.stdout.write(text);
                }
              } catch(e) {}
            }
            resolve(true);
          });
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });

        req.write(payload);
        req.end();
      });

      if (success) break;
    } catch (err) {
      // Tenta próximo modelo se houver falha
    }
  }

  if (!success) {
    console.log(`\n${colors.red}[Erro: Não foi possível obter resposta da API. Verifique sua conexão com a internet ou limite de requisições.]${colors.reset}`);
    // Remove a última mensagem que falhou do histórico
    conversationHistory.pop();
  } else {
    // Registra a resposta do modelo no histórico
    conversationHistory.push({
      role: 'model',
      parts: [{ text: lastAiResponse }]
    });
  }

  console.log('\n');
  isGenerating = false;
  rl.prompt();
}

// Detecção inteligente de colagem rápida (Debounce para Right-Click Paste)
let pasteTimer = null;
let pasteLines = [];

function handleSmartPaste(line) {
  pasteLines.push(line);

  if (pasteTimer) clearTimeout(pasteTimer);

  pasteTimer = setTimeout(async () => {
    const fullText = pasteLines.join('\n').trim();
    pasteLines = [];
    pasteTimer = null;

    if (!fullText) {
      rl.prompt();
      return;
    }

    if (fullText.startsWith('/')) {
      handleCommand(fullText);
      return;
    }

    await callGeminiStream(fullText);
  }, 120); // 120ms é o tempo suficiente para detectar linhas chegando em lote na colagem do mouse
}

function handleCommand(cmd) {
  const normalized = cmd.trim().toLowerCase();

  if (normalized === '/sair' || normalized === 'exit' || normalized === 'quit') {
    console.log(`\n${colors.yellow}Encerrando assistente. Até logo!${colors.reset}`);
    process.exit(0);
  }

  if (normalized === '/limpar' || normalized === '/clear') {
    conversationHistory = [];
    console.log(`\n${colors.green}[Histórico da conversa limpo com sucesso.]${colors.reset}\n`);
    rl.prompt();
    return;
  }

  if (normalized === '/ajuda' || normalized === '/help') {
    printHeader();
    rl.prompt();
    return;
  }

  if (normalized === '/colar' || normalized === '/codigo' || normalized === '/bloco') {
    blockMode = true;
    blockBuffer = [];
    console.log(`\n${colors.yellow}================ MODO DE COLAGEM ATIVADO ================${colors.reset}`);
    console.log(`1. Clique com o botão direito para colar seu código ou texto grande.`);
    console.log(`2. Quando terminar de colar tudo, digite ${colors.bright}${colors.green}/enviar${colors.reset} para processar.`);
    console.log(`   (Ou digite ${colors.red}/cancelar${colors.reset} para descartar)`);
    console.log(`${colors.yellow}=========================================================${colors.reset}\n`);
    rl.setPrompt(`${colors.yellow}Bloco > ${colors.reset}`);
    rl.prompt();
    return;
  }

  if (normalized === '/salvar') {
    if (!lastAiResponse) {
      console.log(`\n${colors.yellow}[Nenhuma resposta anterior para salvar.]${colors.reset}\n`);
    } else {
      const fileName = `resposta_${Date.now()}.txt`;
      fs.writeFileSync(fileName, lastAiResponse, 'utf8');
      console.log(`\n${colors.green}[Resposta salva com sucesso em: ${path.resolve(fileName)}]${colors.reset}\n`);
    }
    rl.prompt();
    return;
  }

  console.log(`\n${colors.yellow}[Comando desconhecido: ${cmd}. Digite /ajuda para ver as opções.]${colors.reset}\n`);
  rl.prompt();
}

// Inicialização
printHeader();
rl.prompt();

rl.on('line', (line) => {
  if (isGenerating) return;

  // Se estiver no MODO BLOCO (/colar)
  if (blockMode) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed === '/enviar' || trimmed === '/fim') {
      blockMode = false;
      rl.setPrompt(`${colors.cyan}${colors.bright}Você > ${colors.reset}`);
      const fullCode = blockBuffer.join('\n').trim();
      blockBuffer = [];
      if (!fullCode) {
        console.log(`\n${colors.yellow}[Nenhum texto colado para enviar.]${colors.reset}\n`);
        rl.prompt();
        return;
      }
      callGeminiStream(fullCode);
      return;
    }

    if (trimmed === '/cancelar') {
      blockMode = false;
      blockBuffer = [];
      rl.setPrompt(`${colors.cyan}${colors.bright}Você > ${colors.reset}`);
      console.log(`\n${colors.yellow}[Modo bloco cancelado.]${colors.reset}\n`);
      rl.prompt();
      return;
    }

    blockBuffer.push(line);
    return;
  }

  // Se for comando simples digitado
  if (line.trim().startsWith('/') && pasteLines.length === 0) {
    handleCommand(line);
    return;
  }

  // Modo Normal: Processamento com buffer inteligente para captura de colagens com botão direito
  handleSmartPaste(line);
});

rl.on('close', () => {
  console.log(`\n${colors.yellow}Até logo!${colors.reset}`);
  process.exit(0);
});
