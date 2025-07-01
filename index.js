const express = require('express'); // Importa o express
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const Planilha = require('/var/api/src/models/Planilha.js');
const sequelize = require('./src/config/database');

const credentials = require('./credentials.json');


async function authenticate() {
    const auth = new GoogleAuth({
        credentials: {
            private_key: credentials.private_key,
            client_email: credentials.client_email,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const client = await auth.getClient();
    return client;
}

async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    console.log('Autorize este app visitando a URL:', authUrl);

    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Insira o código de autenticação aqui: ', (code) => {
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                return console.error('Erro ao recuperar o token', err);
            }
            oAuth2Client.setCredentials(token);
            fs.writeFileSync('token.json', JSON.stringify(token));  
            console.log('Token salvo em token.json');
            rl.close();
        });
    });
}

async function getSheetData(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1d2LQQz2x-rWpb_sbG--j-3NPXGYVWaswpnUF0xlXECM';
	const range = 'Transportes!A4599:T4601';

    
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    if (rows.length) {
        console.log('Dados encontrados na planilha.');

        // Ignora a primeira linha (cabeçalhos) e atribui IDs em ordem crescente
const dadosPlanilha = rows.map((row, index) => ({
    id: index + 4852, // Ajusta o ID para começar de 4571
    empresa: String(row[0]),
    numeroDoPedido: isNaN(parseInt(row[1])) ? 0 : parseInt(row[1]),
    numeroDaNotaFiscal: isNaN(parseInt(row[2])) ? 0 : parseInt(row[2]),
    dataDaNotaFiscal: String(row[3]),
    dataDaColeta: String(row[4]),
    descricaoPreviaDoProduto: String(row[5]),
    cliente: String(row[6]),
    aosCuidadosDe: String(row[7]),
    vendedor: String(row[8]),
    transportadora: String(row[9]),
    previsaoDeEntrega: String(row[10]),
    ultimoContato: String(row[11]),
    situacao: String(row[12]),
    pendencia: String(row[13]),
    chave: String(row[14]),
    responsavel: String(row[15]),
    contato: String(row[16]),
    segundoContato: String(row[17]),
    escritorio: String(row[18]),
    enderecoDeEntrega: String(row[19]),
}));

        try {
            await Planilha.bulkCreate(dadosPlanilha);
            console.log('Dados inseridos com sucesso.');
        } catch (error) {
            if (error.errors) {
                error.errors.forEach(err => {
                    console.error('Erro ao inserir:', err.message);
                });
            } else {
                console.error('Erro geral:', error.message);
            }
        }
    } else {
        console.log('Nenhum dado encontrado.');
        return [];
    }
}
// Função para exibir os dados armazenados no banco de dados
async function displayStoredData() {
    const dadosArmazenados = await Planilha.findAll();
    const resultado = dadosArmazenados.map(dado => [
        dado.id,
        dado.empresa,
        dado.numeroDoPedido,
        dado.numeroDaNotaFiscal,
        dado.dataDaNotaFiscal,
        dado.dataDaColeta,
        dado.descricaoPreviaDoProduto,
        dado.cliente,
        dado.aosCuidadosDe,
        dado.vendedor,
        dado.transportadora,
        dado.previsaoDeEntrega,
        dado.ultimoContato,
        dado.situacao,
        dado.pendencia,
        dado.chave,
        dado.responsavel,
        dado.contato,
        dado.segundoContato,
        dado.escritorio,
        dado.enderecoDeEntrega,
        dado.primeiraMensagem
    ]);
    
    
    console.log('Dados armazenados no banco de dados:', resultado);
    return resultado; // Retorna o resultado se necessário
}

async function main() {
    await sequelize.sync(); // Sincroniza o modelo com o banco de dados
    const auth = await authenticate();  // Autentica com o Google Sheets
    await getSheetData(auth);  // Coleta os dados da planilha
    await displayStoredData();  // Exibe os dados armazenados
}

main().catch(console.error); 