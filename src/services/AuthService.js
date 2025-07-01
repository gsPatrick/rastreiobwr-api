const { Client, LocalAuth } = require('whatsapp-web.js');

let client;
let qrCodeData = ''; // Armazena o QR Code gerado
let qrCodeGerado = false; // Flag para garantir que o QR seja gerado apenas uma vez

// Função para inicializar o cliente do WhatsApp
const iniciarClienteWhatsApp = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        // ADICIONE ESTA SEÇÃO INTEIRA
        puppeteer: {
            headless: true, // Garante que está em modo sem interface gráfica
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Ajuda em ambientes com poucos recursos
                '--disable-gpu'
            ],
        }
    });

    client.on('qr', (qr) => {
        if (!qrCodeGerado) {
            qrCodeData = qr;
            qrCodeGerado = true;
            console.log('QR Code gerado. Escaneie o código QR no WhatsApp.');
        }
    });

    client.on('ready', () => {
        console.log('Cliente WhatsApp está pronto!');
    });

    client.on('auth_failure', () => {
        console.log('Falha na autenticação.');
        qrCodeGerado = false;
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
