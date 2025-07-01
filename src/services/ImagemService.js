 const Planilha = require ('../models/Planilha');
const moment = require('moment');
const { Client, MessageMedia } = require('whatsapp-web.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { getClient } = require('../services/AuthService');
const logoPath = path.join(__dirname, '../infra/icons/bwrIcon.png');
const AbortController = require('abort-controller');

// LER

// Basicamente aqui lida com todo o processo de geração de imagem, envio de mensagens e o temporizador

// iniciarVerificacaoDeTempo é executada atravez a função atualizarPedido e caso os 15M sejam continuos, é executada a função validacao que executa duas funções que estão em awai : gerarImagem e mandarMensagem

// gerarImagem gera a imagem de acordo com os dados do pedido e caso seja chamada novamente com o mesmo ID sobrepoe                                                                                                                                                                                                                                                                                a imagem anterior

// mandarMensagem tem um setTimeout de 5 segundos antes de ser executada em validacao, apenas para garantir que a imagem seja gerada antes que ela seja executada


const formatarNumeroTelefone = (numero) => {
    console.log('Número original:', numero);
    
    // Lista de DDDs que não precisam do dígito 9
    const dddsSem9 = [
   	'48', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '87',
    '91', '92', '93', '94', '95', '96', '97',
    '61', '62', '64', '65', '66', '67'
];
    
    // Remove todos os caracteres que não são dígitos
    let numeroFormatado = numero.replace(/\D/g, '');
    console.log('Após remover caracteres não numéricos:', numeroFormatado);
    
    // Verifica se o número já começa com '55' e remove, se necessário

    // Extrai o DDD
    const ddd = numeroFormatado.slice(0, 2);
    console.log('DDD extraído:', ddd);

    // Se o número tiver 11 dígitos (incluindo DDD)
    if (numeroFormatado.length >= 11) {
        // Verifica se o DDD está na lista que não precisa do dígito 9
        if (dddsSem9.includes(ddd)) {
            // Se o número tem 11 dígitos e começa com 9, remove o 9
            if (numeroFormatado.charAt(2) === '9') {
                numeroFormatado = numeroFormatado.slice(0, 2) + numeroFormatado.slice(3);
                console.log('Após remover o 9 extra:', numeroFormatado);
            }
        } else {
            // Se não está na lista, mantemos o 9
            console.log('Dígito 9 mantido para DDD:', ddd);
        }
    }
    
    // Adiciona o código do país '55' novamente e retorna o número no formato correto
    const numeroFinal = '55' + numeroFormatado;
    console.log('Número formatado final:', numeroFinal);
    return numeroFinal;
};
// Função para mandar a imagem via WhatsApp após gerar || Ela é executada atravez da função validacao 
const mandarMensagem = async (pedidos) => {
    try {
        if (!Array.isArray(pedidos)) {
            throw new TypeError('A variável pedidos deve ser um array.');
        }

        const client = getClient();

        if (!client.info || !client.info.wid) {
            console.log('O cliente WhatsApp ainda não está pronto.');
            return;
        }

        const promises = pedidos.map(async (pedido) => {
            const idPedido = pedido.id;
            console.log('Mostrar ID:', idPedido, 'primeiraMesagem é: ', pedido.primeiraMensagem);

            const pedidoData = await Planilha.findOne({ where: { id: idPedido } });
            if (!pedidoData) {
                console.error('Pedido não encontrado para ID:', idPedido);
                return;
            }

            let contato = pedidoData.contato || pedidoData.segundoContato;
            console.log('Dados do pedido:', pedidoData);
            if (!contato) {
                console.error('Nenhum número de contato encontrado para ID:', idPedido);
                return;
            }
            
            const numeroFormatado = formatarNumeroTelefone(contato);
            console.log('Número formatado para ID:', idPedido, numeroFormatado);
            
            const caminhoImagem = path.join(__dirname, '..', 'services', 'output', `${idPedido}`, `imagem${idPedido}.png`);
            
            if (!fs.existsSync(caminhoImagem)) {
                console.error('Imagem não encontrada no caminho para ID:', idPedido);
                return;
            }

            const media = MessageMedia.fromFilePath(caminhoImagem);

            let texto;
            if (pedidoData.primeiraMensagem === false) {
                texto = `Olá!

Agradecemos por escolher a BWR Bombas!

Você está falando com o nosso setor de atendimento ao cliente, e estamos aqui para acompanhar o rastreamento da sua mercadoria. Em breve, iremos mantê-lo atualizado sobre o andamento do seu pedido.

Esta é uma mensagem automática. Se tiver alguma dúvida, não hesite em nos contatar por aqui.

Atenciosamente,
Equipe BWR Bombas`;
            } else {
                texto = 'O status do seu pedido foi atualizado.';
            }

            const chatId = `${numeroFormatado}@c.us`;
            if (!/^\d{11,15}@c\.us$/.test(chatId)) {
                console.error('Número de contato inválido:', chatId);
                return;
            }
            
            try {
                // CORREÇÃO APLICADA AQUI: Enviar mídia com legenda em uma única chamada
                await client.sendMessage(chatId, media, { caption: texto });

                console.log(`Mensagem com imagem enviada com sucesso para ${contato} no pedido ${idPedido}`);

                if (pedidoData.primeiraMensagem === false) {
                    await Planilha.update(
                        { primeiraMensagem: true },
                        { where: { id: idPedido } }
                    );
                    console.log(`Campo primeiraMensagem atualizado para true no pedido ${idPedido}`);
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem para', contato, 'no pedido', idPedido, ':', error);
            }
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Erro ao enviar as mensagens pelo WhatsApp:', error);
    }
};

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let historicoSituacoes = [];
const historicosPorPedido = {};
// Gera a imagem e manda imagem para o cliente |  Ela é executada atravez da inciarVerificaçãoDeTempo
const validacao = async (id) => {
    try {
        const pedido = await Planilha.findByPk(id);
        if (!pedido) {
            console.log('Pedido não encontrado');
            return;
        }

        const situacaoAtual = pedido.situacao.toUpperCase();


        if (!historicosPorPedido[id]) {
            historicosPorPedido[id] = [];
        }

        // Atualiza o histórico
        const historicoSituacoes = historicosPorPedido[id];
        if (historicoSituacoes.length < 2) {
            historicoSituacoes.push(situacaoAtual);
        } else {
            historicoSituacoes[0] = historicoSituacoes[1]; 
            historicoSituacoes[1] = situacaoAtual; 
        }

        // console.log('Histórico de Situações:', historicoSituacoes);
        console.log(`Histórico de Situações para o Pedido ID ${id}:`);
        historicoSituacoes.forEach((situacao, index) => {
            console.log(`  Situação ${index + 1}: ${situacao}`);
        });

        console.log(`Histórico de Situações para o Pedido ID ${id}:`);
        historicoSituacoes.forEach((situacao, index) => {
            console.log(`  Situação ${index + 1}: ${situacao}`);
        });
        const transportadoraPura = pedido.transportadora.replace('Transportadora: ', '').trim();



        const dadosParaImagem = {
            id: pedido.id,
            numeroDoPedido: pedido.numeroDoPedido,
            numeroDaNotaFiscal: pedido.numeroDaNotaFiscal,
            dataDaColeta: pedido.dataDaColeta,
            ultimoContato: pedido.ultimoContato,
            situacao: pedido.situacao,
            previsaoDeEntrega: pedido.previsaoDeEntrega,
            transportadora: pedido.transportadora,
            transportadoraPura: transportadoraPura,
            ultimaMudanca: pedido.ultimaMudanca,
            ultimoEnvio: pedido.ultimoEnvio,
            primeiraMensagem: pedido.primeiraMensagem,
            historicoSituacoes 
        };

        console.log(transportadoraPura);

        // Gera a imagem
        await gerarImagem(dadosParaImagem, historicoSituacoes);

        await esperar(5000);

        //Agora manda a mensagem
       await mandarMensagem([dadosParaImagem]);
     
        
    } catch (error) {
        console.error('Erro ao obter dados e validar:', error);
    }
}

// um controlador para se a função atualizarPedido for chamada abortar a excução anterior de inciarVerificaçãoDeTempo e chamar novamente

const formatarTempo = (tempoMs) => {
    const minutos = Math.floor(tempoMs / 60000);
    const segundos = Math.floor((tempoMs % 60000) / 1000);
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
};

//Faz uma verificação de 15M e caso seja continuo executa validacao || Ela é executada atravez da função atualizarPedido que se encontra no arquivo FormularioService.js
const abortControllersMap = new Map();

const iniciarVerificacaoDeTempo = async (id) => {
    const intervaloDeVerificacao = 1000; // Verifica a cada 1 segundo
    const tempoMinimoParaValidacao =  300000 // 15 minutos em milissegundos

    const inicio = new Date().getTime(); // Armazena o tempo de início

    // Verifica se há um AbortController associado ao ID e o aborta
    if (abortControllersMap.has(id)) {
        console.log('Cancelando verificação anterior para o pedido:', id);
        abortControllersMap.get(id).abort();
    }

    // Cria um novo AbortController e o armazena no mapa
    const abortController = new AbortController();
    abortControllersMap.set(id, abortController);
    const { signal } = abortController;

    console.log('Iniciando nova verificação para o pedido:', id);

    while (true) {
        if (signal.aborted) {
            console.log('Verificação cancelada para o pedido:', id);
            abortControllersMap.delete(id); // Remove o AbortController do mapa quando cancelado
            break;
        }

        try {
            const pedido = await Planilha.findByPk(id);
            if (!pedido) {
                console.log('Pedido não encontrado');
                abortControllersMap.delete(id); // Remove o AbortController do mapa se o pedido não for encontrado
                break;
            }

            const ultimaMudanca = new Date(pedido.ultimaMudanca).getTime();
            const agora = new Date().getTime();
            const diferencaDeTempo = agora - ultimaMudanca;
            const tempoDecorrido = agora - inicio;

            if (diferencaDeTempo >= tempoMinimoParaValidacao) {
                // Quando atingir os 15 minutos chama a função validacao
                await validacao(id);
                console.log(`Validação concluída para o pedido ${id}. Tempo total decorrido: ${formatarTempo(tempoDecorrido)}`);
                abortControllersMap.delete(id); // Remove o AbortController do mapa após a validação
                break;
            } else {
                const tempoRestante = tempoMinimoParaValidacao - diferencaDeTempo;
                console.log(`Temporizador do pedido ${id}: ${formatarTempo(tempoRestante)}`);
            }
        } catch (error) {
            console.error('Erro na verificação de tempo:', error);
            abortControllersMap.delete(id); // Remove o AbortController do mapa em caso de erro
            break; 
        }
        await new Promise(resolve => setTimeout(resolve, intervaloDeVerificacao)); 
    }
};

// Função para gerar a imagem com as variaveis obtidar pela função validacao | a imagem é gerada em /src/output/[id]/imagem.[id]  | Quando gera outra imagem do mesmo ID ele sobrepoem a anterior | ela é executada atravez da função validacao
const gerarImagem = async (pedido, historicoSituacoes) => {
    try {
        const canvas = createCanvas(800, 850); // Tamanho da imagem
        const ctx = canvas.getContext('2d');

        // Definir cores
        const corFundo = '#F3F6FA';
        const corTexto = '#333333';
        const corNegrito = '#000000';
        const corCinza = '#9E9E9E';
        const corAzul = '#007BFF';
        const corLinha = '#CFCFCF';
        const corBordaCinzaClaro = 'rgba(211, 211, 211, 0.3)';
        const larguraBorda = 5; // Largura das bordas individuais
       	const situacao = pedido.situacao.toUpperCase();
       	let situacaoAnterior = historicoSituacoes[0] || ''; 

       // Verifica se historicoSituacoes não é null ou undefined
       if (situacaoAnterior === 'OCORRÊNCIA' && historicoSituacoes != null) {
           situacaoAnterior = historicoSituacoes[1] || ''; // Atualiza situacaoAnterior com o segundo valor se a condição for verdadeira
       }

        // Preencher fundo
        ctx.fillStyle = corFundo;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Carregar logo e ícones
                const logoImage = await loadImage(logoPath);
        
            // Desenhar a logo no topo, centralizado
            const logoWidth = 200;
            const logoHeight = 100;
            const logoX = (canvas.width - logoWidth) / 2;
            ctx.drawImage(logoImage, logoX, 20, logoWidth, logoHeight); // Logo a 20px do topo

            // Distância de 10 cm entre a logo e as etapas (378 pixels)
            let y = 20 + logoHeight + 100; // 20px é a margem superior da logo
            const x = 123;
            const espacamentoVertical = 100;
            const tamanhoCirculo = 20;

        // Configurações de fonte
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = corTexto;


        // Função para formatar a data
        const formatarData = (data) => {
            return data
        };

        // Função para desenhar o texto da etapa
        const desenharEtapa = (titulo, descricao, data, posY, ativo) => {
            // Cor do título
            ctx.fillStyle = ativo ? corNegrito : corCinza;
            ctx.font = 'bold 20px Arial';
            ctx.fillText(titulo, x + 50, posY);
        
            // Cor da descrição
            ctx.font = 'normal 16px Arial';
            ctx.fillStyle = ativo ? corNegrito : corCinza;
            ctx.fillText(descricao, x + 50, posY + 25);
        
              // Cor e posição da data
             ctx.font = 'normal 16px Arial';
             ctx.fillStyle = '#6D6D6D'; // Cinza mais escuro
            const deslocamentoX = 450; // Ajuste este valor para a direita
            const deslocamentoY = -45; // Ajuste este valor para cima
            ctx.fillText(data ? formatarData(data) : '', x + deslocamentoX, posY + 25 + deslocamentoY);
         };

        // Função para desenhar a linha entre os status
        const desenharLinha = (inicioY, fimY, cor) => {
            ctx.strokeStyle = cor;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x, inicioY);
            ctx.lineTo(x, fimY);
            ctx.stroke();
        };

        // Função para desenhar o círculo
        const desenharCirculo = (x, y, preenchido) => {
            ctx.beginPath();
            ctx.arc(x, y, tamanhoCirculo, 0, 2 * Math.PI);
            ctx.fillStyle = preenchido ? corAzul : corFundo;
            ctx.fill();
            ctx.strokeStyle = corLinha;
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        // Função para desenhar borda arredondada ao redor de cada seção
        const desenharBordaArredondada = (x, y, largura, altura, raio) => {
            ctx.beginPath();
            ctx.moveTo(x + raio, y);
            ctx.lineTo(x + largura - raio, y);
            ctx.quadraticCurveTo(x + largura, y, x + largura, y + raio);
            ctx.lineTo(x + largura, y + altura - raio);
            ctx.quadraticCurveTo(x + largura, y + altura, x + largura - raio, y + altura);
            ctx.lineTo(x + raio, y + altura);
            ctx.quadraticCurveTo(x, y + altura, x, y + altura - raio);
            ctx.lineTo(x, y + raio);
            ctx.quadraticCurveTo(x, y, x + raio, y);
            ctx.strokeStyle = corBordaCinzaClaro;
            ctx.lineWidth = larguraBorda;
            ctx.stroke();
        };

        // Tamanho e posição das bordas de cada etapa
        const larguraBordaEtapa = 600;
        const alturaBordaEtapa = 90;
        const raioBorda = 15;

        // Desenhar a primeira etapa (Nota Fiscal ou Pedido)
if (pedido.numeroDaNotaFiscal && pedido.numeroDaNotaFiscal.trim().toLowerCase() !== '0'  && pedido.numeroDaNotaFiscal.trim().toLowerCase() !== 'x' && pedido.numeroDaNotaFiscal.trim() != 0 ){
    desenharCirculo(x, y, true);
    desenharEtapa('Esperando coleta', `NF: ${pedido.numeroDaNotaFiscal}`,'', y, true);
} else if (pedido.numeroDoPedido) {
    desenharCirculo(x, y, true);
    desenharEtapa('Esperando Coleta', `PEDIDO: ${pedido.numeroDoPedido}`, '', y, true);
} else {
    desenharCirculo(x, y, false);
    desenharEtapa('Criado', 'Sem atualizações no momento', '', y, false);
}
desenharBordaArredondada(x - 30, y - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

// Variáveis de controle para as cores das linhas
let corLinhaCriadoColetado = corLinha;
let corLinhaColetadoTransito = corLinha;
let corLinhaTransitoRota = corLinha;
let corLinhaRotaFilial = corLinha;

if (situacaoAnterior === 'COLETADA' && situacao === 'OCORRÊNCIA') {
    desenharCirculo(x, y + espacamentoVertical, true);
    desenharEtapa('Ocorrência', '', '', y + espacamentoVertical, true);
    corLinhaCriadoColetado = corAzul;

    desenharLinha(y + tamanhoCirculo, y + espacamentoVertical - tamanhoCirculo, corLinhaCriadoColetado);
    desenharBordaArredondada(x - 30, y + espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

} else {
    // Caso contrário, verifica se a situação atual está na lista especificada
    if (['COLETADO', 'COLETADA', 'EM TRÂNSITO', 'CHEGOU NA FILIAL DO DESTINO', 'CHEGOU NA FILIAL DE DESTINO', 'EM ROTA DE ENTREGA', 'ENTREGUE', 'RETORNANDO AO REMETENTE', 'RETORNADO AO REMETENTE', 'RETORNADO'].includes(situacao) ||  (situacaoAnterior === 'EM TRÂNSITO' || situacaoAnterior === '') && situacao === 'OCORRÊNCIA' || situacaoAnterior === 'CHEGOU NA FILIAL DE DESTINO' && situacao === 'OCORRÊNCIA' || situacaoAnterior === 'EM ROTA DE ENTREGA' && situacao === 'OCORRÊNCIA') {
        desenharCirculo(x, y + espacamentoVertical, true);
        desenharEtapa('Coletado', `${pedido.transportadora}`, '', y + espacamentoVertical, true);
        corLinhaCriadoColetado = corAzul;
    } else {
        desenharCirculo(x, y + espacamentoVertical, false);
        desenharEtapa('Coletado', 'Sem atualizações no momento', '', y + espacamentoVertical, false);
    }
    
    desenharLinha(y + tamanhoCirculo, y + espacamentoVertical - tamanhoCirculo, corLinhaCriadoColetado);
    desenharBordaArredondada(x - 30, y + espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

}

if ((situacaoAnterior === 'EM TRÂNSITO' || situacaoAnterior === '') && situacao === 'OCORRÊNCIA') {
    desenharCirculo(x, y + 2 * espacamentoVertical, true);
    desenharEtapa('Ocorrência', '', '', y + 2 * espacamentoVertical, true);
    corLinhaColetadoTransito = corAzul;

    desenharLinha(y + espacamentoVertical + tamanhoCirculo, y + 2 * espacamentoVertical - tamanhoCirculo, corLinhaColetadoTransito);
    desenharBordaArredondada(x - 30, y + 2 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

} else {

if (['EM TRÂNSITO',  'CHEGOU NA FILIAL DO DESTINO', 'CHEGOU NA FILIAL DE DESTINO','EM ROTA DE ENTREGA', 'ENTREGUE', 'RETORNANDO AO REMETENTE', 'RETORNADO AO REMETENTE', 'RETORNADO'].includes(situacao) || situacaoAnterior === 'CHEGOU NA FILIAL DE DESTINO' && situacao === 'OCORRÊNCIA' || situacaoAnterior === 'EM ROTA DE ENTREGA' && situacao === 'OCORRÊNCIA') {
    desenharCirculo(x, y + 2 * espacamentoVertical, true);
    const previsaoDeEntregaTexto = pedido.previsaoDeEntrega ? `Previsão de entrega: ${formatarData(pedido.previsaoDeEntrega)}` : '';
    desenharEtapa('Em trânsito', previsaoDeEntregaTexto, '', y + 2 * espacamentoVertical, true);
    corLinhaColetadoTransito = corAzul;
} else {
    desenharCirculo(x, y + 2 * espacamentoVertical, false);
    desenharEtapa('Em trânsito', 'Sem atualizações no momento', '', y + 2 * espacamentoVertical, false);
}
desenharLinha(y + espacamentoVertical + tamanhoCirculo, y + 2 * espacamentoVertical - tamanhoCirculo, corLinhaColetadoTransito);
desenharBordaArredondada(x - 30, y + 2 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);
}

// Nova etapa: CHEGOU NA FILIAL DE DESTINO

if (pedido.transportadoraPura.toLowerCase() !== 'sedex' && situacaoAnterior === 'CHEGOU NA FILIAL DE DESTINO' && situacao === 'OCORRÊNCIA') {
    console.log('2')
    desenharCirculo(x, y + 3 * espacamentoVertical, true);
    desenharEtapa('Ocorrência', '', '', y + 3 * espacamentoVertical, true);
    corLinhaRotaFilial = corAzul;

    desenharLinha(y + 2 * espacamentoVertical + tamanhoCirculo, y + 3 * espacamentoVertical - tamanhoCirculo, corLinhaRotaFilial);
    desenharBordaArredondada(x - 30, y + 3 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

} else {

if (['CHEGOU NA FILIAL DO DESTINO', 'CHEGOU NA FILIAL DE DESTINO', 'EM ROTA DE ENTREGA', 'ENTREGUE', 'RETORNADO AO REMETENTE', 'RETORNANDO AO REMETENTE', 'RETORNADO'].includes(situacao) || situacaoAnterior === 'EM ROTA DE ENTREGA' && situacao === 'OCORRÊNCIA' || pedido.transportadoraPura.toLowerCase() === 'sedex' && situacaoAnterior === 'CHEGOU NA FILIAL DE DESTINO' && situacao === 'OCORRÊNCIA' ){
    console.log('3')
    desenharCirculo(x, y + 3 * espacamentoVertical, true);
    desenharEtapa('Chegou na Filial de Destino', '', '', y + 3 * espacamentoVertical, true);
    corLinhaRotaFilial = corAzul;
} else {
    console.log('4')
    desenharCirculo(x, y + 3 * espacamentoVertical, false);
    desenharEtapa('Chegou na Filial de Destino', 'Sem atualizações no momento', '', y + 3 * espacamentoVertical, false);
}
desenharLinha(y + 2 * espacamentoVertical + tamanhoCirculo, y + 3 * espacamentoVertical - tamanhoCirculo, corLinhaRotaFilial);
desenharBordaArredondada(x - 30, y + 3 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);
}


// Etapa: EM ROTA DE ENTREGA
if (pedido.transportadoraPura.toUpperCase() === 'SEDEX' && situacaoAnterior === 'CHEGOU NA FILIAL DE DESTINO' && situacao === 'OCORRÊNCIA') {
    desenharCirculo(x, y + 4 * espacamentoVertical, true);
    desenharEtapa('Ocorrência', '', '', y + 4 * espacamentoVertical, true);
    corLinhaTransitoRota = corAzul;

    desenharLinha(y + 3 * espacamentoVertical + tamanhoCirculo, y + 4 * espacamentoVertical - tamanhoCirculo, corLinhaTransitoRota);
    desenharBordaArredondada(x - 30, y + 4 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

} else if (pedido.transportadoraPura.toUpperCase() !== 'SEDEX' && situacaoAnterior === 'EM ROTA DE ENTREGA' && situacao === 'OCORRÊNCIA' 
    || (pedido.transportadoraPura.toLowerCase() === 'sedex' && situacaoAnterior === 'EM ROTA DE ENTREGA' && situacao === 'OCORRÊNCIA') 
    || situacao === 'RETORNADO' || situacao === 'RETORNANDO AO REMETENTE') {

    desenharCirculo(x, y + 4 * espacamentoVertical, true);
    desenharEtapa('Ocorrência', '', '', y + 4 * espacamentoVertical, true);
    corLinhaTransitoRota = corAzul;

    desenharLinha(y + 3 * espacamentoVertical + tamanhoCirculo, y + 4 * espacamentoVertical - tamanhoCirculo, corLinhaTransitoRota);
    desenharBordaArredondada(x - 30, y + 4 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

} else if ((pedido.transportadoraPura.toLowerCase() === 'sedex' && (situacao === 'CHEGOU NA FILIAL DE DESTINO' || situacao === 'CHEGOU NA FILIAL DO DESTINO')) 
    || ['EM ROTA DE ENTREGA', 'ENTREGUE', 'RETORNANDO AO REMETENTE'].includes(situacao)) {

    desenharCirculo(x, y + 4 * espacamentoVertical, true);
    desenharEtapa('Em rota de entrega', 'Certifique-se de ter alguém no endereço', '', y + 4 * espacamentoVertical, true);
    corLinhaTransitoRota = corAzul;

} else {
    desenharCirculo(x, y + 4 * espacamentoVertical, false);
    desenharEtapa('Em rota de entrega', 'Sem atualizações no momento', '', y + 4 * espacamentoVertical, false);
}

desenharLinha(y + 3 * espacamentoVertical + tamanhoCirculo, y + 4 * espacamentoVertical - tamanhoCirculo, corLinhaTransitoRota);
desenharBordaArredondada(x - 30, y + 4 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);

let descricaoFinal;
if (['ENTREGUE', 'RETORNANDO AO REMETENTE', 'RETORNADO'].includes(situacao)) {  
    switch (situacao) {
        
        case 'ENTREGUE':
            descricaoFinal = 'Entregue';
            break;
        case 'RETORNANDO AO REMETENTE':
            descricaoFinal = 'Retornando ao remetente';
            break;
        case 'RETORNADO':
            descricaoFinal = 'Retornado';
            break;
        default:
            descricaoFinal = 'Sem atualizações no momento';
    }
    desenharCirculo(x, y + 5 * espacamentoVertical, true);
    desenharEtapa(descricaoFinal,'', '', y + 5 * espacamentoVertical, true); // Corrigido para usar descricaoFinal
    desenharLinha(y + 4 * espacamentoVertical + tamanhoCirculo, y + 5 * espacamentoVertical - tamanhoCirculo, corLinhaTransitoRota);
} else {
    desenharCirculo(x, y + 5 * espacamentoVertical, false);
    desenharEtapa('Sem atualizações no momento', '', y + 5 * espacamentoVertical, false);
    desenharLinha(y + 4 * espacamentoVertical + tamanhoCirculo, y + 5 * espacamentoVertical - tamanhoCirculo, corLinha);
}

desenharBordaArredondada(x - 30, y + 5 * espacamentoVertical - 50, larguraBordaEtapa, alturaBordaEtapa, raioBorda);
   
    const outputDir = path.join(__dirname, './output', String(pedido.id));
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true }); // Cria a pasta, se não existir
        }

        // Gerar nome do arquivo com versão incremental
        let imagemPath = path.join(outputDir, `imagem${pedido.id}.png`);
        let contador = 1;

        const out = fs.createWriteStream(imagemPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);

        out.on('finish', () => {
            console.log('Imagem gerada com sucesso:', imagemPath);
        });

    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
    }
};

module.exports = {
    validacao,
    gerarImagem,
    iniciarVerificacaoDeTempo
};