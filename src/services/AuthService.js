// src/services/AuthService.js

const { Client, LocalAuth } = require('whatsapp-web.js');

let client;
let qrCodeData = ''; // Armazena o QR Code gerado
let qrCodeGerado = false; // Flag para garantir que o QR seja gerado apenas uma vez

// Função para inicializar o cliente do WhatsApp
const iniciarClienteWhatsApp = () => {
    // ---> INÍCIO DA MUDANÇA <---
    // Apenas inicia o WhatsApp se a variável de ambiente estiver definida como 'true'
    if (process.env.WHATSAPP_ENABLED !== 'true') {
        console.log('----------------------------------------------------');
        console.log('WhatsApp está DESATIVADO via variável de ambiente.');
        console.log('Nenhuma tentativa de conexão será feita.');
        console.log('----------------------------------------------------');
        return; // Sai da função e não faz mais nada
    }
    // ---> FIM DA MUDANÇA <---

    console.log('WhatsApp está ATIVADO. Tentando inicializar o cliente...');

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
        }
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