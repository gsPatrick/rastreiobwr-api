const Planilha = require ('../models/Planilha');
const { iniciarVerificacaoDeTempo } = require('../services/ImagemService'); // Ajuste o caminho conforme a sua estrutura de projeto
const AbortController = require('abort-controller');
const Sequelize = require('sequelize');
const { Op } = require('sequelize');

const tratarData = (data) => {
    // Remove espaços em branco e valida se a data é vazia, nula ou inválida
    if (!data || data.trim() === '' || new Date(data) === 'Invalid Date') {
        return null;
    }
    return data;
};


// Aqui é uma função para adicionar um novo rastreameto de pedido | Todos os dados que o vendendor possui imedediatamente ao finalizar a compra estão aqui para serem preenchidos
const novoPedido = async (pedidoData) => {
    try {
        const novoPedidoCriado = await Planilha.create({
            empresa: pedidoData.empresa,
            numeroDoPedido: pedidoData.numeroDoPedido,
            numeroDaNotaFiscal: pedidoData.numeroDaNotaFiscal,
            descricaoPreviaDoProduto: pedidoData.descricaoPreviaDoProduto,
            cliente: pedidoData.cliente,
            aosCuidadosDe: pedidoData.aosCuidadosDe,
            vendedor: pedidoData.vendedor,
			transportadora: pedidoData.transportadora ? `Transportadora: ${pedidoData.transportadora}` : "Transportadora:",
            dataDaNotaFiscal: tratarData(pedidoData.dataDaNotaFiscal),
            dataDaColeta: tratarData(pedidoData.dataDaColeta),
            previsaoDeEntrega: tratarData(pedidoData.previsaoDeEntrega),
            ultimoContato: tratarData(pedidoData.ultimoContato),
            situacao: pedidoData.situacao,
            pendencia: pedidoData.pendencia,
            chave: pedidoData.chave,
            responsavel: pedidoData.responsavel,
            contato: pedidoData.contato,
            segundoContato: pedidoData.segundoContato,
            escritorio: pedidoData.escritorio,
            enderecoDeEntrega: pedidoData.enderecoDeEntrega,
            primeiraMensagem: false
        });

        const pedidoFormatado = {
            ...novoPedidoCriado.toJSON()
        };

    	return pedidoFormatado;
    

    } catch (error) {
        console.error('Ocorreu um erro ao adicionar um novo pedido', error);
        throw error;
    }
};

/*const corrigirDatasInvalidas = async () => {
    try {
        // Busca todos os pedidos do banco de dados
        const pedidos = await Planilha.findAll();

        // Itera sobre cada pedido
        for (const pedido of pedidos) {
            let precisaAtualizar = false;

            // Checa e corrige cada campo de data
            const dataDaNotaFiscal = tratarData(pedido.dataDaNotaFiscal);
            const dataDaColeta = tratarData(pedido.dataDaColeta);
            const previsaoDeEntrega = tratarData(pedido.previsaoDeEntrega);
            const ultimoContato = tratarData(pedido.ultimoContato);
            const updatedAt = tratarData(pedido.updatedAt);
            const createdAt = tratarData(pedido.createdAt);

            // Verifica se alguma das datas precisa ser atualizada
            if (
                dataDaNotaFiscal !== pedido.dataDaNotaFiscal ||
                dataDaColeta !== pedido.dataDaColeta ||
                previsaoDeEntrega !== pedido.previsaoDeEntrega ||
                ultimoContato !== pedido.ultimoContato ||
                updatedAt !== pedido.updatedAt ||
                createdAt !== pedido.createdAt
            ) {
                precisaAtualizar = true;
            }

            // Se houver alguma alteração, atualiza o pedido
            if (precisaAtualizar) {
                await Planilha.update({
                    dataDaNotaFiscal,
                    dataDaColeta,
                    previsaoDeEntrega,
                    ultimoContato,
                    updatedAt,
                    createdAt
                }, {
                    where: { id: pedido.id }
                });

                console.log(`Pedido ID ${pedido.id} atualizado com sucesso.`);
            }
        }

        console.log('Correção de datas inválidas concluída.');
    } catch (error) {
        console.error('Erro ao corrigir datas inválidas:', error);
        throw error;
    }
};
*/

//  ORDEM : SE A EXIBIÇÃO DOS PEDIDOS VAI SER : 1,2,3,4,5 OU 5,4,3,2,1 
//  ordernarPor : É A ESCOLHA DA FILTRAGEM DE DATA QUE DEVE SER CHAMADA JUNTO COM 'DIRECAO' QUE É A ESCOLHA SE A EXIBIÇÃO DA DATA VAI SER A DATA MAIS RECENTE OU A MAIS ANTIGA. DEFINIDA POR ASC OU DESC
// FILTROS SÃO OS CAMPOS JUNTO COM OS OPERADORES

const exibirTodosPedidos = async (situacao = null, ordem = 'invertida', filtros = {}, ordenarPor = null, direcao = null, dataInicio = null, dataFim = null, prioridadeSituacao = true) => {
    try {
        let whereClause = null;

        // Verifica a situação e aplica o filtro correto
        if (situacao !== "") {
            if (situacao === 'PEDIDOS EM ABERTO') {
                // Filtro específico para 'campo azul'
                whereClause = { 
                    situacao: {
                        [Op.in]: [
							'',
							'ESPERANDO COLETA',
                            'COLETADA',
                            'EM TRÂNSITO',
                            'CHEGOU NA FILIAL DE DESTINO',
                            'EM ROTA DE ENTREGA',
							'OCORRÊNCIA'
                        ]
                    }
                };
            } else {
                // Situação padrão
                whereClause = situacao ? { situacao: situacao } : {};
            }
        }
    
    	const filtrosAplicados = aplicarFiltros(filtros);
        Object.assign(whereClause, filtrosAplicados);
        

        if (dataInicio && dataFim) {
            whereClause[Op.or] = [
                { dataDaColeta: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } },
                { dataDaNotaFiscal: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } },
                { previsaoDeEntrega: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } },
                { ultimoContato: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } },
                { createdAt: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } },
                { updatedAt: { [Op.between]: [new Date(dataInicio), new Date(dataFim)] } }
            ];
        }

        // Ordenação inicial por ID (padrão)
        let ordemPedidos = [['id', 'DESC']]; 

        // Verifica se a prioridade de situação está ativa
        if (prioridadeSituacao) {
            const ordemSituacao = [
                'ESPERANDO COLETA',
                'COLETADA',
                'EM TRÂNSITO',
                'CHEGOU NA FILIAL DE DESTINO',
                'EM ROTA DE ENTREGA',
				'OCORRÊNCIA',
                'ENTREGUE',
            	'RETORNADO'
            ];
            const situacaoOrderClause = [
                [Sequelize.literal(`FIELD(situacao, '${ordemSituacao.join("', '")}')`), 'ASC']
            ];
            ordemPedidos = [...situacaoOrderClause, ...ordemPedidos];
        }

        // Ordena com base no campo especificado, se fornecido
        if (ordenarPor) {
            const camposPermitidos = ['createdAt', 'updatedAt', 'dataDaNotaFiscal', 'dataDaColeta', 'previsaoDeEntrega', 'ultimoContato'];
            if (camposPermitidos.includes(ordenarPor)) {
                ordemPedidos = prioridadeSituacao 
                    ? [...ordemPedidos.slice(0, 1), [ordenarPor, direcao || 'DESC']]
                    : [[ordenarPor, direcao || 'DESC']];
            }
        }

        const pedidos = await Planilha.findAll({
            where: whereClause,
            order: ordemPedidos
        });

        const pedidosFormatados = pedidos.map(pedido => ({
            ...pedido.toJSON()
        }));

        const pedidosOrdenados = ordem === 'invertida' ? pedidosFormatados : pedidosFormatados.reverse();

        return pedidosOrdenados;
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        throw error;
    }
};
const aplicarFiltros = (filtros) => {
    const condicoes = {};
    Object.keys(filtros).forEach(campo => {
        const filtro = filtros[campo];

        // Verifica se o filtro não é nulo ou indefinido
        if (filtro) {
            const { valor, operador } = filtro;

            switch (operador) {
                case 'CONTEM':
                    condicoes[campo] = { [Op.like]: `%${valor}%` };
                    break;
                case 'NAO CONTEM':
                    condicoes[campo] = { [Op.notLike]: `%${valor}%` };
                    break;
                case 'É IGUAL A':
                    condicoes[campo] = { [Op.eq]: valor }; 
                    break;
                case 'NAO E IGUAL':
                    condicoes[campo] = { [Op.ne]: valor };
                    break;
                case 'COMEÇA COM':
                    condicoes[campo] = { [Op.like]: `${valor}%` };
                    break;
                case 'TERMINA COM':
                    condicoes[campo] = { [Op.like]: `%${valor}` };
                    break;
                case 'É QUALQUER UM DOS':
                    condicoes[campo] = { [Op.in]: valor }; // valor deve ser um array
                    break;
                case 'CONTEM QUALQUER UM DOS':
                    condicoes[campo] = { [Op.or]: valor.map(v => ({ [Op.like]: `%${v}%` })) }; // valor deve ser um array
                    case 'É VAZIO':
                        condicoes[campo] = { [Op.or]: [null, ''] }; // Verifica nulo ou string vazia
                        break;
                    case 'NÃO É VAZIO':
                        condicoes[campo] = { [Op.and]: { [Op.not]: null, [Op.ne]: '' } }; // Exclui nulo e string vazia
                        break;
                    default:
                        break;
                }
            }
        });
    return condicoes;
};

// Função para exibir pedido por ID
const exibirPedidoPorId = async (id) => {
    try {
        const pedido = await Planilha.findByPk(id);
        if (pedido) {
            const pedidoFormatado = {
                ...pedido.toJSON()
            };
            return pedidoFormatado;
        } else {
            console.log('Pedido não encontrado');
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar o pedido por ID:', error);
        throw error;
    }
};


//Aqui é uma função para apagar o pedido criado | fazer validação dupla para confirmação de cancelamento
const apagarPedido = async (id) => {
    try {
        const resultado = await Planilha.destroy({
            where: { id: id }
        });

        if (resultado) {
            console.log(`Pedido com ID ${id} foi apagado.`);
            return { mensagem: 'Pedido apagado com sucesso' };
        } else {
            console.log(`Pedido com ID ${id} não foi encontrado.`);
            return { mensagem: 'Pedido não encontrado' };
        }
    } catch (error) {
        console.error('Erro ao apagar o pedido:', error);
        throw error;
    }
};

const abortControllersMap = new Map();

const atualizarPedido = async (id, pedidoDataAtualizado) => {
    try {
        // Busca o pedido atual antes da atualização
        const pedidoAtual = await Planilha.findByPk(id);
        const situacaoAnterior = pedidoAtual.situacao;
        const novaSituacao = pedidoDataAtualizado.situacao;

        // Atualiza os dados do pedido
        // Atualiza os dados do pedido
        const dadosAtualizados = {
            ...pedidoDataAtualizado,
            dataDaNotaFiscal: tratarData(pedidoDataAtualizado.dataDaNotaFiscal),
            dataDaColeta: tratarData(pedidoDataAtualizado.dataDaColeta),
            previsaoDeEntrega: tratarData(pedidoDataAtualizado.previsaoDeEntrega),
            ultimoContato: tratarData(pedidoDataAtualizado.ultimoContato),
            updatedAt: tratarData(pedidoDataAtualizado.updatedAt),
            createdAt: tratarData(pedidoDataAtualizado.createdAt),
            ultimaMudanca: new Date() // Atualiza a data da última mudança
        };
        await Planilha.update(dadosAtualizados, {
            where: { id: id }
        });

        const pedidoAtualizado = await Planilha.findByPk(id);

        // Formata as datas antes de retornar ao frontend
        const pedidoFormatado = {
            ...pedidoAtualizado.toJSON()
        };


        if (situacaoAnterior !== novaSituacao && 
			novaSituacao != null && 
            novaSituacao.trim() !== "") { // Verifica se não é uma string vazia ou apenas espaços
            
            console.log(`Situação alterada de ${situacaoAnterior} para ${novaSituacao}`);
        
            // Se já houver uma verificação em andamento para este ID, cancela a anterior
            if (abortControllersMap.has(id)) {
                console.log(`Cancelando verificação anterior para o ID: ${id}`);
                abortControllersMap.get(id).abort(); // Cancela a verificação anterior usando abort
            }
        
            // Inicia a verificação de tempo e armazena o AbortController
            iniciarVerificacaoDeTempo(id); // A própria função irá lidar com o AbortController
        }

        // Retorna o pedido atualizado, independentemente da mudança na situação
        return pedidoFormatado;
    } catch (error) {
        console.error('Erro ao atualizar o pedido:', error);
        throw error;
    }
};

module.exports = {
    novoPedido,
    atualizarPedido,
    exibirTodosPedidos,
    exibirPedidoPorId,
    apagarPedido,
};