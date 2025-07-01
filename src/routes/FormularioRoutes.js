const {
    novoPedido,
    atualizarPedido,
    exibirTodosPedidos,
    exibirPedidoPorId,
    apagarPedido,
} = require ('../services/FormularioService');

const express = require('express');
const router = express.Router();

// Aqui é o endpoint para criar um novoPedido
router.post('/novoPedido', async (req, res) => {
    try {
        const pedidoCriado = await novoPedido(req.body);
        // Notificar outros clientes sobre o novo pedido
        res.status(201).json(pedidoCriado);
    } catch (error) {
        console.error('Erro ao adicionar um novo pedido:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao adicionar um novo pedido.' });
    }
});

// Aqui é o endpoint para atualizar um pedido e em sequencia chama a função iniciarVerificação que espera 15M e gera a imgem e depois envia a foto para o cliente

router.put('/atualizarPedido/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        await atualizarPedido(id, req.body);
        // Notificar outros clientes sobre a atualização
        res.status(200).json({ message: 'Pedido atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Ocorreu um erro ao atualizar o pedido.' });
    }
});

// Aqui é o endpoint para exibir todos os pedidos
router.get('/pedidos', async (req, res) => {
    const { situacao, ordem, filtros, ordenarPor, direcao, dataInicio, dataFim, prioridadeSituacao } = req.query;

    // Converte filtros de string para objeto se necessário
    let filtrosObjeto;
    if (filtros) {
        try {
            filtrosObjeto = JSON.parse(filtros); // Certifique-se de que os filtros sejam um objeto JSON
        } catch (error) {
            return res.status(400).json({ message: 'Parâmetro "filtros" deve estar em formato JSON válido.' });
        }
    } else {
        filtrosObjeto = {};
    }

    // Converte `prioridadeSituacao` para booleano (caso esteja presente na URL)
    const prioridadeSituacaoBool = prioridadeSituacao !== 'false';

    try {
        // Passando todos os parâmetros necessários para a função
        const pedidos = await exibirTodosPedidos(
            situacao, 
            ordem, 
            filtrosObjeto, 
            ordenarPor, 
            direcao, 
            dataInicio, 
            dataFim, 
            prioridadeSituacaoBool // Passa o valor de prioridadeSituacao
        );
        res.status(200).json(pedidos); // Retorna os pedidos filtrados
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar pedidos', error: error.message });
    }
});


// Aqui é o endpoint para exibir todos os pedidos normal
router.get('/pedidosNormal', async (req, res) => {
    try {
        const pedidos = await exibirTodosPedidosNormal();
        res.status(200).json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Ocorreu um erro ao listar todos os pedidos.' });
    }
});


// Aqui é o endpoint para exibir um pedido por ID
router.get('/pedido/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const pedido = await exibirPedidoPorId(id);
        if (pedido) {
            res.status(200).json(pedido);
        } else {
            res.status(404).json({ message: 'Pedido não encontrado.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ocorreu um erro ao buscar o pedido por ID.' });
    }
});

// Aqui é o endpoint para deletar um pedido por ID
router.delete('/pedido/apagar/:id', async (req, res) => {
    try {
        const resultado = await apagarPedido(req.params.id);
        if (resultado.mensagem === 'Pedido apagado com sucesso') {
            // Notificar outros clientes sobre a exclusão
            res.status(200).json(resultado);
        } else {
            res.status(404).json(resultado);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao apagar pedido' });
    }
});

module.exports = router;