# cibm-project

A visualisation of the researchers working at the CIBM, the alumni and partners

# CIBM

## Description

TB 2024 : visualisation interactive multi-niveau entre chercheurs et technologie. Ce projet est réalisé pour le CIBM, EPFL.

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

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Configurez votre connexion Neo4j :

   Créez un fichier `.env` à la racine de votre projet et ajoutez les informations de connexion Neo4j :

   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   ```

## Utilisation

### En mode développement

Pour lancer le projet en mode développement avec Vite :

```bash
npm run dev

```
