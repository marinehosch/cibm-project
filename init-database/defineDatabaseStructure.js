import neo4j from "neo4j-driver";

const uri = import.meta.env.VITE_NEO4J_URI;
const user = import.meta.env.VITE_NEO4J_USER;
const password = import.meta.env.VITE_NEO4J_PASSWORD;

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function defineDatabaseStructure() {
  const session = driver.session();

  try {
    // Définir les noeuds principaux
    await session.run(`MERGE (:People)`);
    await session.run(`MERGE (:Researcher)`);
    await session.run(`MERGE (:Member)`);
    await session.run(`MERGE (:Affiliate)`);
    await session.run(`MERGE (:Alumni)`);
    await session.run(`MERGE (:Associate)`);
    await session.run(`MERGE (:Institution)`);
    await session.run(`MERGE (:Department)`);
    await session.run(`MERGE (:Module)`);
    await session.run(`MERGE (:Country)`);
    await session.run(`MERGE (:City)`);
    await session.run(`MERGE (:ModuleType)`);
    await session.run(`MERGE (:ResearcherType)`);

    // Définir les relations
    await session.run(`MATCH (a:Researcher), (b:Member)
                       MERGE (a)-[:IS_A]->(b)`);
    await session.run(`MATCH (a:Member), (b:People)
                       MERGE (a)-[:IS_A]->(b)`);
    await session.run(`MATCH (a:Affiliate), (b:People)
                       MERGE (a)-[:IS_A]->(b)`);
    await session.run(`MATCH (a:Alumni), (b:People)
                       MERGE (a)-[:IS_A]->(b)`);
    await session.run(`MATCH (a:Associate), (b:People)
                       MERGE (a)-[:IS_A]->(b)`);
    await session.run(`MATCH (a:Institution), (b:Country)
                       MERGE (a)-[:LOCATED_IN]->(b)`);
    await session.run(`MATCH (a:Institution), (b:City)
                       MERGE (a)-[:LOCATED_IN]->(b)`);
    await session.run(`MATCH (a:Department), (b:Institution)
                       MERGE (a)-[:PART_OF]->(b)`);
    await session.run(`MATCH (a:Module), (b:ModuleType)
                       MERGE (a)-[:OF_TYPE]->(b)`);
    await session.run(`MATCH (a:Researcher), (b:ResearcherType)
                       MERGE (a)-[:HAS_TYPE]->(b)`);
    await session.run(`MATCH (a:Institution), (b:Module)
                       MERGE (a)-[:HAS_MODULE]->(b)`);

    // Ajout des relations supplémentaires selon les exemples fournis
    await session.run(`MATCH (a:Researcher), (b:Institution)
                       MERGE (a)-[:WORKS_AT]->(b)`);
    await session.run(`MATCH (a:People), (b:Department)
                       MERGE (a)-[:BELONGS_TO]->(b)`);
    await session.run(`MATCH (a:Researcher), (b:Module)
                       MERGE (a)-[:WORKS_WITH]->(b)`);

    console.log("Database structure and connections defined successfully");
  } catch (error) {
    console.error("Error defining database structure and connections:", error);
  } finally {
    await session.close();
  }
}

defineDatabaseStructure()
  .then(() => console.log("Structure and connection definition completed"))
  .catch((error) =>
    console.error(
      "Error completing structure and connection definition:",
      error
    )
  )
  .finally(() => driver.close());
