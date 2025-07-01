const { validacao, gerarImagem } = require('../services/ImagemService');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const router = express.Router();
const { iniciarClienteWhatsApp, getQRCode } = require('../services/AuthService');


// Iniciar o cliente do WhatsApp quando o servidor começar
iniciarClienteWhatsApp();

// Endpoint para gerar o QR Code do WhatsApp
router.get('/gerarQRCode', async (req, res) => {
    const qrCodeData = getQRCode();

    if (qrCodeData) {
        try {
            // Gera a imagem do QR Code como base64
            qrcode.toDataURL(qrCodeData, (err, src) => {
                if (err) {
                    return res.status(500).send('Erro ao gerar QR Code.');
                }
                res.status(200).send(`
                    <h1>Escaneie o QR Code com o WhatsApp</h1>
                    <img src="${src}" alt="QR Code" />
                `);
            });
        } catch (error) {
            res.status(500).send('Erro ao processar a solicitação.');
        }
    } else {
        res.status(500).send('QR Code ainda não disponível. Tente novamente.');
    }
});

// Aqui é o endpoint para acessar gerar a imagem | Ela primeiro faz a validação e caso esteja tudo correto ele gera a imagem
router.post('/validarImagem/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await validacao(id);
        res.status(200).send('Processo concluído com sucesso.');
    } catch (error) {
        if (error.message === 'Só é possível gerar a imagem caso o contador esteja em 15 minutos') {
            res.status(403).send('Só é possível gerar a imagem caso o contador esteja em 15 minutos');
        } else {
            res.status(500).send('Erro ao processar a solicitação.');
        }
    }
});




module.exports = router;