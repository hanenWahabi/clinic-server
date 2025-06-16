# Utilise une image Node officielle
FROM node:18

# Crée un dossier pour l'app
WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie tout le projet
COPY . .

# Spécifie le port exposé
EXPOSE 5003

# Commande de démarrage
CMD ["node", "server.js"]