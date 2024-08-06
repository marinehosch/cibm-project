# cibm-project

A visualisation of the researchers working at the CIBM, the alumni, affiliate, associate and partners

# CIBM

## Description

TB 2024 : visualisation interactive multi-niveau entre chercheurs et technologies. Ce projet est réalisé pour le CIBM, EPFL.

## Auteure

Marine Hosch, étudiante en 3e année en ingérnierie des médias, HEIG-VD, 2024

## Prérequis

Assurez-vous d'avoir les logiciels suivants installés sur votre machine :

- [Node.js](https://nodejs.org/) (v14 ou supérieure)
- [Neo4j](https://neo4j.com/download/) (v4 ou supérieure)
- [Git](https://git-scm.com/) : Utilisé pour cloner le dépôt du projet. Git est un outil de contrôle de version qui permet de suivre les modifications apportées au code source et de collaborer avec d'autres développeurs.

## Installation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/marinehosch/cibm-project.git
   cd cibm-project
   ```

# Initialisation de la Base de Données Neo4j

## Configuration

1. Assurez-vous que Neo4j est installé et en cours d'exécution.
2. Clonez le dépôt et accédez au répertoire du projet.
3. Créez un fichier `.env` dans le répertoire `init-database/` en utilisant le modèle fourni dans `.env.example` et remplissez les informations d'identification telle que configurées dans Neo4j.
4. Lancez les commandes suivantes pour atteindre le dossier et lancer le script :

````bash
cp  init-database/.env
npm run define-structure

2. Installez les dépendances :

   ```bash
   npm install
````

## Utilisation

### En mode développement

Pour lancer le projet en mode développement avec Vite :

```bash
npm run dev

```

## Notes supplémentaires

Assurez-vous que les informations d'identification dans le fichier .env sont correctes.
Le script pour définir la structure de la base de données Neo4j sera automatiquement exécuté après l'installation des dépendances.
Ce script ne crée pas les données réelles, mais définit la structure et les relations nécessaires pour accueillir les données.

### Structure du Projet

Voici à quoi devrait ressembler la structure de votre projet après avoir ajouté les fichiers nécessaires :

cibm-project/
│
├── init-database/
│ ├── defineDatabaseStructure.js
│ └── .env.example
│
├── node_modules/
│
├── public/
│
├── src/
│ ├── Neo4j
│ ├── getDB
│ ├── main.js
│ ├── webscraping.js
│ └── main.js
│
├── package.json
├── package-lock.json
├── README.md
└── .env

### Scripts NPM

    npm install: Installe toutes les dépendances nécessaires.
    npm run define-structure: Exécute le script pour définir la structure de la base de données Neo4j.
    npm run dev: Démarre le serveur de développement Vite.
