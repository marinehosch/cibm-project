import neo4j from "neo4j-driver";
import { getAllMembersByDepartment } from "./webscraping.js";

const uri = import.meta.env.VITE_NEO4J_URI || "bolt://localhost:7687";
const user = import.meta.env.VITE_NEO4J_USER || "neo4j";
const password = import.meta.env.VITE_NEO4J_PASSWORD || "password";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

const pushMembersToDB = async () => {
  const session = driver.session();
  try {
    const allMembersByDepartment = await getAllMembersByDepartment();

    for (const { department, members } of allMembersByDepartment) {
      for (const member of members) {
        const { name, module, section, mainInstitution } = member;

        // Vérifier si le membre est un chercheur
        const isResearcher = !!module;

        // Extraire la première partie du nom de l'institution si composite (e.g., "CHUV-UNIL" -> "CHUV")
        let mainInstitutionName = mainInstitution;
        if (mainInstitution.includes("-")) {
          mainInstitutionName = mainInstitution.split("-")[0];
        }

        // Créer le noeud pour le membre en tant que Researcher ou Member
        if (isResearcher) {
          await session.run(
            `MERGE (m:Researcher:Member:People {name: $name})
             ON CREATE SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitutionName, m.isResearcher = $isResearcher, m.keywords = [], m.population_type = [], m.age_group = [], m.health_status = []
             ON MATCH SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitutionName, m.isResearcher = $isResearcher`,
            { name, module, section, mainInstitutionName, isResearcher }
          );
        } else {
          await session.run(
            `MERGE (m:Member:People {name: $name})
             ON CREATE SET m.section = $section, m.mainInstitution = $mainInstitutionName
             ON MATCH SET m.section = $section, m.mainInstitution = $mainInstitutionName`,
            { name, section, mainInstitutionName }
          );
        }

        // Créer ou récupérer le noeud pour le département
        await session.run(
          `MERGE (d:Department {name: $department})
           ON CREATE SET d.mainInstitution = $mainInstitutionName
           ON MATCH SET d.mainInstitution = $mainInstitutionName`,
          { department, mainInstitutionName }
        );

        // Créer la relation entre le Member/Researcher et le département
        await session.run(
          `MATCH (m {name: $name}), (d:Department {name: $department})
           MERGE (m)-[:BELONGS_TO]->(d)`,
          { name, department }
        );

        // Si le membre a un module, créer la relation avec le module
        if (module) {
          await session.run(
            `MERGE (mod:Module {name: $module})
             ON CREATE SET mod.name = $module
             ON MATCH SET mod.name = $module`,
            { module }
          );

          await session.run(
            `MATCH (m:Researcher {name: $name}), (mod:Module {name: $module})
             MERGE (m)-[:WORKS_WITH]->(mod)`,
            { name, module }
          );
        }

        // Créer ou récupérer le noeud pour l'institution principale
        await session.run(
          `MERGE (i:Institution {name: $mainInstitutionName})`,
          { mainInstitutionName }
        );

        // Créer la relation entre le Member/Researcher et l'institution principale
        await session.run(
          `MATCH (m {name: $name}), (i:Institution {name: $mainInstitutionName})
           MERGE (m)-[:WORKS_FOR]->(i)`,
          { name, mainInstitutionName }
        );
      }
    }

    console.log("Data successfully pushed to Neo4j");
  } catch (error) {
    console.error("Error pushing data to Neo4j:", error);
  } finally {
    await session.close();
  }
};

// Fonction pour mettre à jour les propriétés des chercheurs existants
async function updateResearchersProperties() {
  const session = driver.session();

  try {
    // Ajouter les dates d'arrivée pour les chercheurs
    await session.run(`
      WITH date("2004-01-01") AS startDate, date("2024-12-31") AS endDate
      MATCH (r:Researcher)
      WITH r, startDate, endDate, duration.inDays(startDate, endDate).days AS totalDays
      WITH r, startDate, toInteger(rand() * totalDays) AS randomDaysOffset
      SET r.arrivalDate = date(startDate) + duration({ days: randomDaysOffset })
    `);

    // Ajouter les dates d'arrivée et de départ pour les alumni
    await session.run(`
      WITH date("2004-01-01") AS startDate, date("2024-12-31") AS endDate
      MATCH (a:Alumni)
      WITH a, startDate, endDate, duration.inDays(startDate, endDate).days AS totalDays
      WITH a, startDate, toInteger(rand() * totalDays) AS randomDaysOffset
      SET a.arrivalDate = date(startDate) + duration({ days: randomDaysOffset })
    `);

    await session.run(`
      MATCH (a:Alumni)
      WHERE a.arrivalDate IS NOT NULL
      WITH a, a.arrivalDate AS arrivalDate, duration.inDays(arrivalDate, date("2024-12-31")).days AS remainingDays
      WITH a, arrivalDate, toInteger(rand() * remainingDays) AS randomDepartureDays
      SET a.departureDate = arrivalDate + duration({ days: randomDepartureDays })
    `);

    // Ajouter les mots-clés et les propriétés supplémentaires aux chercheurs
    await session.run(`
     // List of keywords and properties
WITH ["neuroscience", "cognitive science", "neuroimaging", "brain mapping", "behavioral science", "clinical research", "psychology", "psychiatry", "genetics", "neuropharmacology", "cardiac imaging", "neurometabolism", "child development", "spectroscopy", "preclinical"] AS keywords,
     ["human", "animal"] AS population_types,
     ["child", "adult"] AS age_groups,
     ["healthy", "clinical"] AS health_statuses

// Match all researchers and create an index for assigning properties
MATCH (r:Researcher)
WITH r, 
     keywords, 
     population_types,
     age_groups,
     health_statuses,
     id(r) % size(keywords) AS keywordIndex,
     id(r) % size(population_types) AS populationIndex,
     id(r) % size(age_groups) AS ageGroupIndex,
     id(r) % size(health_statuses) AS healthStatusIndex,
     rand() AS randomValue

// Add the keywords and new properties to the researchers
SET r.keywords = [keywords[keywordIndex], keywords[(keywordIndex + 1) % size(keywords)], keywords[(keywordIndex + 2) % size(keywords)]],
    r.population_type = population_types[populationIndex],
    r.age_group = CASE WHEN randomValue < 0.5 THEN [age_groups[ageGroupIndex]] ELSE [age_groups[ageGroupIndex], age_groups[(ageGroupIndex + 1) % size(age_groups)]] END,
    r.health_status = CASE WHEN randomValue < 0.5 THEN [health_statuses[healthStatusIndex]] ELSE [health_statuses[healthStatusIndex], health_statuses[(healthStatusIndex + 1) % size(health_statuses)]] END
    `);

    console.log("Researchers properties updated successfully");
  } catch (error) {
    console.error("Error updating researchers properties:", error);
  } finally {
    await session.close();
  }
}

// Appel des fonctions pour pousser les membres et mettre à jour les propriétés
pushMembersToDB()
  .then(() => updateResearchersProperties())
  .then(() => console.log("All operations completed successfully"))
  .catch((error) => console.error("Error completing operations:", error))
  .finally(() => driver.close());

export { pushMembersToDB, updateResearchersProperties };
