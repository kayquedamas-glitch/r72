// js/app.js

// --- CONFIGURAÇÃO E LÓGICA DE LIMITE DE USO ---
const MAX_USAGE = 10; // Limite de 1 uso gratuito TOTAL
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";
// 🚨 SUBSTITUA PELA SUA API KEY 🚨
const apiKey = "AIzaSyB3SL7Gc2KTCK0dRiDk418fs888WnFO7i8"; 

const DEMO_DATE_KEY = 'demoLastResetDate';
const DEMO_COUNT_KEY = 'demoUsageCount';

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function initializeDemoUsage() {
    const storedDate = localStorage.getItem(DEMO_DATE_KEY);
    const storedCount = parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10);
    const today = getTodayDate();

    if (storedDate !== today) {
        localStorage.setItem(DEMO_DATE_KEY, today);
        localStorage.setItem(DEMO_COUNT_KEY, '0');
        return 0;
    }
    return storedCount;
}

function checkDemoUsage() {
    const count = initializeDemoUsage();
    const demoLimitSidebar = document.getElementById('demoLimitSidebar');
    const demoUsageMessage = document.getElementById('demoUsageMessage');
    const sendBtn = document.getElementById('sendBtn');
    
    if (count >= MAX_USAGE) {
        if (demoLimitSidebar) demoLimitSidebar.classList.remove('hidden');
        if (demoUsageMessage) demoUsageMessage.innerHTML = "Limite de uso gratuito atingido. Desbloqueie o acesso total!";
        if (sendBtn) sendBtn.disabled = true; // Desabilita o botão de enviar
        return false;
    } else {
        if (demoLimitSidebar) demoLimitSidebar.classList.add('hidden');
        if (demoUsageMessage) demoUsageMessage.innerHTML = `(Você tem ${MAX_USAGE - count} uso grátis)`;
        if (sendBtn) sendBtn.disabled = false; // Habilita o botão de enviar
        return true;
    }
}

function incrementDemoUsage() {
    let count = initializeDemoUsage();
    count++;
    localStorage.setItem(DEMO_COUNT_KEY, count.toString());
    checkDemoUsage(); // Atualiza a visualização e desabilita os botões se o limite for atingido
    return count;
}

// --- FUNÇÕES DE UTILIDADE ---
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) { // Rate limit
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await wait(delay);
                continue;
            }
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Erro HTTP: ${response.status} - ${errorBody}`);
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await wait(delay);
        }
    }
}

// --- LÓGICA DE GERAÇÃO DE MENSAGENS E SCROLL ---
const messagesContainer = document.getElementById('messagesContainer');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatTitle = document.getElementById('chatTitle');
const chatSubtitle = document.getElementById('chatSubtitle');

let currentTool = 'Estrategista'; // Ferramenta ativa por padrão

const toolDefinitions = {
    'Estrategista': {
        title: 'Estrategista Diário',
        subtitle: 'Converte tarefas opressoras em um plano de missão claro. Qual o seu principal desafio de hoje?', // Ajuste no subtitle
        prompt: `Aja como um Estrategista de Elite (R72). Sua missão é guiar o usuário a focar nas prioridades e ignorar distrações.

PRIMEIRA INTERAÇÃO:
Se o usuário apenas listar tarefas, a IA DEVE primeiro pedir mais contexto. Exemplo: "Entendido. Para otimizar seu plano, qual dessas tarefas é a MAIS CRÍTICA? E qual é o seu MAIOR obstáculo para iniciá-la?" (Faça só uma pergunta por vez, se a resposta do usuário for curta, faça outra, até entender o problema).

SEGUNDA INTERAÇÃO (e seguintes, após ter contexto):
A IA DEVE:
1.  Gerar um "NOME DE CÓDIGO" impactante para a missão do dia.
2.  Listar 3 "OBJETIVOS TÁTICOS" claros, convertendo as tarefas do usuário em passos acionáveis.
3.  Definir 3 "REGRAS DE ENGAGEMENT" (low-dopamine) específicas para o usuário, focando em eliminar distrações e manter o foco.

Regras Gerais:
- Use uma linguagem direta, motivadora e que transmita urgência, mas sem termos técnicos complexos.
- Use Markdown: H3 para o título do plano, H4 para subtítulos (Objetivos, Regras), e listas de bullets para os itens.
- Seja conciso e focado no resultado.
- NUNCA dê uma resposta completa na primeira interação se o usuário não der contexto suficiente.`
    },
    'Gerente': {
        title: 'Gerente de Energia',
        subtitle: 'Ajuda a recuperar o foco e a energia. Qual o seu estado atual e o que está sugando sua atenção?', // <-- MUDANÇA AQUI
        prompt: `Aja como um Gerente de Foco e Performance (R72). O usuário está lutando contra distrações e perda de energia.
        ...
Sua missão é:
1.  Identificar rapidamente a causa da perda de foco.
2.  Oferecer 3 "DIRETRIZES DE AÇÃO" imediatas e fáceis de entender, focadas em:
    * Simplificar o ambiente.
    * Reduzir a sobrecarga mental.
    * Direcionar a atenção para o que importa.

Seja direto, motivador e use uma linguagem que ressoa com o dia a dia. Evite jargões técnicos ou científicos. Mantenha as respostas concisas, mas eficazes. Use Markdown: H3 para o título, e lista numerada para as diretrizes.`
    },
    'Mestre': {
        title: 'Mestre da Disciplina',
        subtitle: 'Analisa a falha do dia e gera um micro-desafio punitivo para o dia seguinte. Qual foi sua maior falha hoje? (Seja honesto)',
        prompt: "Aja como um rigoroso e motivador 'Coach de Disciplina' (R72). Sua missão é analisar a falha do usuário e gerar um micro-desafio punitivo para amanhã. O desafio deve ser específico, evitar gratificação instantânea e focar em construir resistência ao tédio (LOW-DOPAMINE). A resposta deve ser concisa, entregando APENAS o título do desafio e as 3 regras. Use Markdown (H3 para o título e lista numerada)."
    },
    'Auditor': {
        title: 'Auditor de Hábitos',
        subtitle: 'Entrega um veredito honesto sobre a performance de longo prazo. Descreva seus hábitos da semana e seu desempenho geral.',
        prompt: "Aja como um Auditor de Performance e Especialista em Neurociência (R72). Analise a lista de hábitos do usuário e o resumo semanal para gerar um 'Relatório de Auditoria' conciso e brutalmente honesto. O relatório deve ter um título H3, seguido por uma 'Análise Geral', e depois três seções (Pontos Fortes, Pontos Fracos e Micro-Ações de Próxima Semana), formatadas em listas de bullets. Mantenha o tom profissional, direto e motivador. Use Markdown."
    }
};

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('w-full', 'max-w-3xl', isUser ? 'text-right' : 'text-left');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add(isUser ? 'chat-message-user' : 'chat-message-ia');
    contentDiv.innerHTML = formatMarkdownToHtml(text);
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    // Auto-scroll para a nova mensagem
    messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
}

function formatMarkdownToHtml(markdownText) {
    let html = markdownText.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Prevenção básica de XSS
    
    // Título Principal H3 (do prompt) -> H4 com classes
    html = html.replace(/### (.*)/g, '<h4 class="text-lg font-bold brutal-red mt-4 mb-2 uppercase">$1</h4>');
    // Sub-títulos H4 (do prompt, ou H2/H3 internos) -> P com classes
    html = html.replace(/## (.*)/g, '<p class="text-md font-bold text-white mt-3 mb-1 underline">$1</p>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    // Listas (simplificado para chat)
    html = html.replace(/\n(\*|\-|\d+\.)\s/g, '<br/>&bull; ');
    // Quebras de linha
    html = html.replace(/\n\n/g, '<br/><br/>');
    html = html.replace(/\n/g, '<br/>');
    
    return html;
}

// --- LÓGICA DE CHAMADA DA API ---
async function sendMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    if (!checkDemoUsage()) { // Verifica o limite antes de enviar
        addMessage("Seu limite de uso gratuito foi atingido. Desbloqueie o acesso total para continuar.", false);
        chatInput.value = '';
        return;
    }

    addMessage(userMessage, true);
    chatInput.value = '';
    sendBtn.disabled = true; // Desabilita o botão de enviar durante o processamento
    chatInput.style.height = 'auto'; // Reseta altura do input

    // Adiciona spinner de loading
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('w-full', 'max-w-3xl', 'text-left');
    loadingMessage.innerHTML = `
        <div id="currentLoadingSpinner" class="chat-message-ia flex items-center">
            <div id="loadingSpinner" class="mr-2"></div> Analisando...
        </div>
    `;
    messagesContainer.appendChild(loadingMessage);
    messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;

    try {
        const systemPrompt = toolDefinitions[currentTool].prompt;
        const userQuery = userMessage; // Simplificado: a query é a mensagem
        
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const response = await fetchWithRetry(API_URL + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        // Remove o spinner de loading
        if (document.getElementById('currentLoadingSpinner')) {
            document.getElementById('currentLoadingSpinner').parentElement.remove();
        }

        const iaResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (iaResponseText) {
            incrementDemoUsage(); // SÓ incrementa no sucesso
            addMessage(iaResponseText, false);
        } else {
            addMessage("Desculpe, não consegui gerar uma resposta. Tente reformular sua pergunta ou verifique sua API Key.", false);
            console.error("Erro na resposta da IA:", result);
        }

    } catch (error) {
        console.error("Erro na comunicação com a API Gemini:", error);
        // Remove o spinner de loading em caso de erro
        if (document.getElementById('currentLoadingSpinner')) {
            document.getElementById('currentLoadingSpinner').parentElement.remove();
        }
        addMessage(`Falha na comunicação com a IA: ${error.message}. Verifique o console para mais detalhes.`, false);
    } finally {
        sendBtn.disabled = !checkDemoUsage(); // Re-habilita ou desabilita dependendo do uso
        chatInput.focus(); // Foca no input para próxima mensagem
    }
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    
    function setActiveTool(toolName) {
        currentTool = toolName;

        // Atualiza botões da sidebar
        document.querySelectorAll('.tool-item').forEach(item => {
            if (item.id === `tool${toolName}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Atualiza o header do chat
        const toolInfo = toolDefinitions[toolName];
        chatTitle.textContent = toolInfo.title.toUpperCase();
        chatSubtitle.textContent = toolInfo.subtitle;
        
        // Limpa mensagens anteriores e adiciona a primeira da IA
        messagesContainer.innerHTML = ''; 
        addMessage(`Olá! Sou o ${toolInfo.title}. ${toolInfo.subtitle}`, false);
        
        chatInput.focus(); // Foca no input
    }

    // Sidebar Tool Selection
    document.querySelectorAll('.tool-item').forEach(item => {
        item.addEventListener('click', () => {
            const toolName = item.id.replace('tool', '');
            if (toolDefinitions[toolName]) { // Verifica se é uma ferramenta real
                setActiveTool(toolName);
            }
        });
    });

    // Enviar mensagem ao clicar no botão
    sendBtn.addEventListener('click', sendMessage);

    // Enviar mensagem ao pressionar Enter (Shift+Enter para nova linha)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Impede nova linha
            sendMessage();
        }
    });

    // Ajusta a altura do textarea dinamicamente
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });

    // Botão "Nova Conversa" (limpa as mensagens)
    document.getElementById('newChatBtn').addEventListener('click', () => {
        messagesContainer.innerHTML = '';
        chatInput.value = '';
        // Re-adiciona a mensagem de boas-vindas da ferramenta atual
        const toolInfo = toolDefinitions[currentTool];
        addMessage(`Olá! Sou o ${toolInfo.title}. ${toolInfo.subtitle}`, false);
        chatInput.focus();
    });

    // Inicializa o estado
    setActiveTool('Estrategista'); // Ferramenta padrão
    checkDemoUsage(); // Atualiza o estado inicial do limite
});