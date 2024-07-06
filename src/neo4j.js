// import neo4j from "neo4j-driver";
// import { getAllMembersByDepartment } from "./webscraping.js";

// const driver = neo4j.driver(
//   "bolt://localhost:7687",
//   neo4j.auth.basic("neo4j", "password")
// );

// // Fonction pour ajouter les membres principaux a la DB
// const pushMembersToDB = async (members) => {
//   const session = driver.session();
//   try {
//     for (const member of members) {
//       const { name, module, institution } = member;
//       await session.run(
//         `MERGE (r:Researcher {name: $name})
//          ON CREATE SET r.moduleType = $module, r.Institution = $institution,
//          ON MATCH SET r.moduleType = $module, r.Institution = $institution,`,
//         { name, module, institution }
//       );
//       await session.run("MERGE (i:Institution {name: $institution})", {
//         institution,
//       });
//       await session.run(
//         `MATCH (r:Researcher {name: $name}), (i:Institution {name: $institution})
//          MERGE (r)-[:WORKS_FOR]->(i)`,
//         { name, institution }
//       );
//     }
//     console.log("Data successfully pushed to Neo4j");
//   } catch (error) {
//     console.error("Error pushing data to Neo4j:", error);
//   } finally {
//     await session.close();
//   }
// };

// export { pushMembersToDB };

import neo4j from "neo4j-driver";
import {
  getInstitutionUrls,
  getMemberNamesByDepartment,
} from "./webscraping.js";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

// Fonction pour pousser les membres dans Neo4j
// Fonction pour pousser les membres dans Neo4j
const pushMembersToDB = async () => {
  const session = driver.session();
  try {
    const departmentUrls = await getInstitutionUrls();
    const allMembers = [];

    for (const url of departmentUrls) {
      const { department, members } = await getMemberNamesByDepartment(url);

      for (const member of members) {
        const { name, module, section, mainInstitution } = member;

        // Vérifier si le membre a un module pour le considérer comme Researcher
        const isResearcher = !!module;

        // Créer le noeud pour le membre en tant que Researcher
        await session.run(
          `MERGE (m:Researcher {name: $name})
           ON CREATE SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitution, m.isResearcher = $isResearcher
           ON MATCH SET m.module = $module, m.section = $section, m.mainInstitution = $mainInstitution, m.isResearcher = $isResearcher`,
          { name, module, section, mainInstitution, isResearcher }
        );

        // Créer ou récupérer le noeud pour le département
        await session.run(
          `MERGE (d:Department {name: $section})
           ON CREATE SET d.mainInstitution = $mainInstitution
           ON MATCH SET d.mainInstitution = $mainInstitution`,
          { section, mainInstitution }
        );

        // Créer la relation entre le Researcher et le département
        await session.run(
          `MATCH (m:Researcher {name: $name}), (d:Department {name: $section})
           MERGE (m)-[:BELONGS_TO]->(d)`,
          { name, section }
        );

        // Si le membre a un module, créer la relation avec le module
        if (module) {
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

        // Créer la relation entre le Researcher et l'institution principale
        await session.run(
          `MATCH (m:Researcher {name: $name}), (i:Institution {name: $mainInstitution})
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
