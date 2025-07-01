const { Client, LocalAuth } = require('whatsapp-web.js');

let client;
let qrCodeData = ''; // Armazena o QR Code gerado
let qrCodeGerado = false; // Flag para garantir que o QR seja gerado apenas uma vez

// Função para inicializar o cliente do WhatsApp
const iniciarClienteWhatsApp = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
    });

    client.on('qr', (qr) => {
        if (!qrCodeGerado) { // Só gera o QR Code uma vez
            qrCodeData = qr; // Armazena o QR Code
            qrCodeGerado = true; // Marca como gerado
            console.log('QR Code gerado. Escaneie o código QR no WhatsApp.');
        }
    });

    client.on('ready', () => {
        console.log('Cliente WhatsApp está pronto!');
    });

    client.on('auth_failure', () => {
        console.log('Falha na autenticação.');
        qrCodeGerado = false; // Caso a autenticação falhe, permitir gerar um novo QR Code
    });

    client.initialize();
};

// Função para obter o QR Code
const getQRCode = () => qrCodeData;

// Função para obter o cliente do WhatsApp
const getClient = () => client;

module.exports = {
    iniciarClienteWhatsApp,
    getQRCode,
    getClient,
};
