import neo4j from "neo4j-driver";
import { coreMembers } from "./webscraping.js";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

// Fonction pour ajouter les membres principaux a la DB
const pushCoreMembersToDB = async (members) => {
  const session = driver.session();
  try {
    for (const member of members) {
      const { name, module, institution } = member;
      await session.run(
        `MERGE (r:Researcher {name: $name})
         SET r.moduleType = $module, r.ResearcherType = "coreMember", r.Institution = $institution
         MERGE (m:Module {name: $module})
         MERGE (i:Institution {name: $institution})
         MERGE (r)-[:WORKS_WITH]->(m)
         MERGE (r)-[:WORKS_FOR]->(i)`,
        { name, module, institution }
      );
    }
    console.log("Data successfully pushed to Neo4j");
  } catch (error) {
    console.error("Error pushing data to Neo4j:", error);
  } finally {
    await session.close();
  }
};

// Programme principal pour faire les requêtes
const main = async () => {
  const members = await coreMembers();
  await pushCoreMembersToDB(members);
};

main();
