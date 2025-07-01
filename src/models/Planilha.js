const {DataType, DataTypes} = require ('sequelize');
const sequelize = require ('../config/database');

const Planilha = sequelize.define('Planilha', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    empresa: {
        type: DataTypes.STRING,
       
    },
    numeroDoPedido: {
        type: DataTypes.STRING,
       
    },
    numeroDaNotaFiscal: {
        type: DataTypes.STRING,
    },
    dataDaNotaFiscal: {
        type: DataTypes.STRING,
    },
    dataDaColeta: {
        type: DataTypes.STRING,
    },
    descricaoPreviaDoProduto: {
        type: DataTypes.STRING,
    
    },
    cliente: {
        type: DataTypes.STRING,
       
    },
    aosCuidadosDe: {
        type: DataTypes.STRING,
       
    },
    vendedor: {
        type: DataTypes.STRING,
       
    },
    transportadora: {
        type: DataTypes.STRING,
       
    },
    previsaoDeEntrega: {
        type: DataTypes.STRING,
       
    },
    ultimoContato: {
        type: DataTypes.STRING,
    },
    situacao:{
        type: DataTypes.STRING,
    },
    pendencia:{
        type: DataTypes.STRING, 
    },
    chave: {
        type: DataTypes.STRING,
    },
    responsavel: {
        type: DataTypes.STRING,
       
    },
    contato: {
        type: DataTypes.STRING,
    },
    segundoContato: {
        type: DataTypes.STRING,
    },
    escritorio: {
        type: DataTypes.STRING,
    },
    enderecoDeEntrega: {
        type: DataTypes.STRING,
       
    },
    ultimaMudanca: {
        type: DataTypes.DATE,
    },
    ultimoEnvio: { // Somente é atualizado quando a futura função de enviar a mensagem for implementada
        type: DataTypes.DATE, 
    },
	primeiraMensagem: {
    	type: DataTypes.BOOLEAN,
    	defaultValue: false,
    },
}, {
    timestamps: true, 
    hooks: {
        beforeUpdate: (planilha, options) => {
            planilha.ultimaMudanca = new Date(); // Atualiza a data sempre que um registro for atualizado
        }
    }
});

module.exports = Planilha;
