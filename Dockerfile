# Use uma imagem base oficial do Node.js. Escolha uma versão LTS (18, 20, 22, etc.).
# Para produção, use -alpine ou -slim para imagens menores.
FROM node:20-alpine

# Instale as dependências do sistema para o canvas *E* quaisquer outras ferramentas
# que sua API precise em nível de sistema operacional.
RUN apk add --no-cache build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev \
    && apk add --no-cache --virtual .build-deps \
    imagemagick-dev

# Se você tiver dependências que *não* precise depois da compilação,
# pode removê-las em outra camada para reduzir o tamanho da imagem final:
# RUN apk del .build-deps

# Crie um diretório de trabalho DENTRO do contêiner.
WORKDIR /app

ARG CACHEBUST=2

# Copie o package.json e package-lock.json (se existir) PRIMEIRO.
# Isso otimiza o cache do Docker.
COPY package*.json ./

# Instale as dependências do Node.js.
RUN npm install --omit=dev 

# Copie o resto do código da sua API para o contêiner.
COPY . .

# Se sua API precisa de variáveis de ambiente, defina-as aqui (opcional).
# Use ENV para valores que *não* são sensíveis.
# Para segredos (senhas, chaves de API), use secrets do Docker ou variáveis de ambiente
# do seu provedor de hospedagem (ex: variáveis de ambiente da Hostinger).
# ENV DATABASE_URL=postgres://user:password@db:5432/dbname  <-- NÃO USE PARA SENHAS!

# Exponha a porta que sua API usa.
EXPOSE 3000

# Comando para iniciar sua API.  Ajuste para o comando correto.
# CMD ["pm2", "start", "app.js"].
CMD ["node","app.js"]
