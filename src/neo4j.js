import neo4j from "neo4j-driver";
import { coreMembers } from "./webscraping.js";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

// Fonction pour ajouter des membres principaux a la DB
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

// Requête pour récupérer les chercheurs par institution
const getResearchersByInstitution = async (institutionName) => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (i:Institution {name: $institutionName})<-[:WORKS_FOR]-(r:Researcher) RETURN r.name AS name",
    { institutionName }
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
  }));
};

// Requête pour récupérer toutes les institutions
const getInstitutions = async () => {
  const session = driver.session();
  const institutions = await session.run("MATCH (n:Institution) RETURN n");
  session.close();
  return institutions.records.map((record) => record.get(0).properties);
};

// Programme principal pour faire les requêtes
const main = async () => {
  const members = await coreMembers();
  await pushCoreMembersToDB(members);
};

export { getResearchersByInstitution, getInstitutions, main };

main();
