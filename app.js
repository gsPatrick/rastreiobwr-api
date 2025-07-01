const express = require('express');
const bodyParser = require ('body-parser');
const cors = require('cors'); 
const sequelize = require ('./src/config/database'); 
const formularioRoutes = require ('./src/routes/FormularioRoutes')
const imagemRoutes = require('./src/routes/imagemRoutes');
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(express.json());

app.use('/formulario', formularioRoutes);
app.use('/imagem', imagemRoutes);

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Banco de dados sincronizado com sucesso.');
    app.listen(3000, () => {
      console.log('Servidor rodando na porta 3000');
    });
  })
  .catch(error => {
    console.error('Erro ao sincronizar o banco de dados:', error);
  });