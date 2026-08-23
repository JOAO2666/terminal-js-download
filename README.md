# Terminal Gemini

Cliente de terminal em Node.js para conversar com a API do Google Gemini, com respostas em streaming, histórico da conversa, modo de colagem em bloco e opção para salvar respostas.

## Requisitos

- Node.js instalado (versão 18 ou mais recente recomendada).
- Uma chave válida da API Gemini.
- Conexão com a internet.

## Download direto

Arquivo:

https://joao2666.github.io/terminal-js-download/terminal.js

### Linux, macOS ou CMD com curl

```bash
curl -L "https://joao2666.github.io/terminal-js-download/terminal.js" -o terminal.js
```

### Windows PowerShell com irm

```powershell
irm "https://joao2666.github.io/terminal-js-download/terminal.js" -OutFile "terminal.js"
```

## Configurar a chave e executar

Não coloque sua chave da API em repositórios públicos. Configure-a somente como variável de ambiente.

### PowerShell

```powershell
$env:GEMINI_API_KEY="SUA_CHAVE"
node .\terminal.js
```

### Prompt de Comando (CMD)

```bat
set "GEMINI_API_KEY=SUA_CHAVE"
node terminal.js
```

### Linux ou macOS

```bash
export GEMINI_API_KEY="SUA_CHAVE"
node terminal.js
```

A variável definida dessa forma vale para a sessão atual do terminal.

## Comandos disponíveis

- `/ajuda` ou `/help`: mostra a ajuda.
- `/limpar` ou `/clear`: limpa o histórico da conversa.
- `/colar`, `/codigo` ou `/bloco`: ativa o modo de colagem em bloco.
- `/enviar` ou `/fim`: envia o conteúdo do modo de colagem.
- `/cancelar`: cancela a colagem em bloco.
- `/salvar`: salva a última resposta em um arquivo de texto.

## Atualizar o arquivo

Execute novamente o comando de download para substituir a cópia local pela versão publicada mais recente.

## Segurança

O arquivo público não contém uma chave real. O texto `COLOQUE A CHAVE AQUI` é apenas um marcador. Use a variável de ambiente `GEMINI_API_KEY` conforme os exemplos acima.
