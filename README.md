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
- [Git](https://git-scm.com/)
- [Neo4j](https://neo4j.com/download/) (v4 ou supérieure)

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
3. Créez un fichier `.env` dans le répertoire `init-databaseb/` en utilisant le modèle fourni dans `.env.example` et remplissez les informations d'identification telle que configurée dans Neo4j.

````sh
cp init-databaseb/.env.example init-database/.env
nano init-db/.env
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
