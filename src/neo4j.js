import neo4j from "neo4j-driver";
import { getAllMembersByDepartment } from "./webscraping.js";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

const pushMembersToDB = async () => {
  const session = driver.session();
  try {
    const allMembersByDepartment = await getAllMembersByDepartment();

    for (const { department, members } of allMembersByDepartment) {
      for (const member of members) {
        const { name, module, section, mainInstitution } = member;

        // Vérifier si le membre est un chercheur
        const isResearcher = !!module;

        if (isResearcher) {
          // Créer le noeud pour le membre en tant que Researcher
          await session.run(
            `MERGE (m:Researcher {name: $name})
             ON CREATE SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitution, m.isResearcher = $isResearcher
             ON MATCH SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitution, m.isResearcher = $isResearcher`,
            { name, module, section, mainInstitution, isResearcher }
          );
        } else {
          // Créer le noeud pour le membre en tant que Member
          await session.run(
            `MERGE (m:Member {name: $name})
             ON CREATE SET m.section = $section, m.mainInstitution = $mainInstitution
             ON MATCH SET m.section = $section, m.mainInstitution = $mainInstitution`,
            { name, section, mainInstitution }
          );
        }

        // Créer ou récupérer le noeud pour le département
        await session.run(
          `MERGE (d:Department {name: $department})
           ON CREATE SET d.mainInstitution = $mainInstitution
           ON MATCH SET d.mainInstitution = $mainInstitution`,
          { department, mainInstitution }
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
        await session.run(`MERGE (i:Institution {name: $mainInstitution})`, {
          mainInstitution,
        });

        // Créer la relation entre le Member/Researcher et l'institution principale
        await session.run(
          `MATCH (m {name: $name}), (i:Institution {name: $mainInstitution})
           MERGE (m)-[:WORKS_FOR]->(i)`,
          { name, mainInstitution }
        );
      }

      console.log(`Members for ${department} pushed to Neo4j`);
    }

    console.log("Data successfully pushed to Neo4j");
  } catch (error) {
    console.error("Error pushing data to Neo4j:", error);
  } finally {
    await session.close();
  }
};

// Appel de la fonction pour pousser les membres
pushMembersToDB();

export { pushMembersToDB };
