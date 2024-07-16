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

        // Extraire la première partie du nom de l'institution si composite (e.g., "CHUV-UNIL" -> "CHUV")
        let mainInstitutionName = mainInstitution;
        if (mainInstitution.includes("-")) {
          mainInstitutionName = mainInstitution.substring(
            0,
            mainInstitution.indexOf("-")
          );
        }

        // Créer le noeud pour le membre en tant que Researcher ou Member
        if (isResearcher) {
          await session.run(
            `MERGE (m:Researcher {name: $name})
             ON CREATE SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitutionName, m.isResearcher = $isResearcher
             ON MATCH SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitutionName, m.isResearcher = $isResearcher`,
            { name, module, section, mainInstitutionName, isResearcher }
          );
        } else {
          await session.run(
            `MERGE (m:Member {name: $name})
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
          {
            mainInstitutionName,
          }
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

// Appel de la fonction pour pousser les membres
pushMembersToDB();

export { pushMembersToDB };
