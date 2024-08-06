import neo4j from "neo4j-driver";

const uri = import.meta.env.VITE_NEO4J_URI;
const user = import.meta.env.VITE_NEO4J_USER;
const password = import.meta.env.VITE_NEO4J_PASSWORD;

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function defineDatabaseStructure() {
  const session = driver.session();

  // Définir les institutions avec les coordonnées géographiques
  const institutions = [
    { name: "EPFL", latitude: 46.52, longitude: 6.5656 },
    { name: "UNIL", latitude: 46.5222, longitude: 6.583 },
    { name: "UNIGE", latitude: 46.2044, longitude: 6.1432 },
    { name: "HUG", latitude: 46.1895, longitude: 6.1456 },
    { name: "CHUV", latitude: 46.5333, longitude: 6.6528 },
    { name: "CIBM", latitude: 46.5191, longitude: 6.5668 },
  ];

  for (const institution of institutions) {
    await session.run(
      `MERGE (i:Institution {name: $name})
         ON CREATE SET i.latitude = $latitude, i.longitude = $longitude,  i.type = 'FoundingInstitution'
         ON MATCH SET i.latitude = $latitude, i.longitude = $longitude, i.type = 'FoundingInstitution'`,
      institution
    );
  }

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
    await session.run(`MATCH (a:Researcher), (b:Institution)
                       MERGE (a)-[:WORKS_AT]->(b)`);
    await session.run(`MATCH (a:People), (b:Department)
                       MERGE (a)-[:BELONGS_TO]->(b)`);
    await session.run(`MATCH (a:Researcher), (b:Module)
                       MERGE (a)-[:WORKS_WITH]->(b)`);

    // Ajout des dates d'arrivée pour les chercheurs et les alumni
    await session.run(`
      WITH date("2004-01-01") AS startDate, date("2024-12-31") AS endDate
      MATCH (r:Researcher)
      WITH r, startDate, endDate, duration.inDays(startDate, endDate).days AS totalDays
      WITH r, startDate, toInteger(rand() * totalDays) AS randomDaysOffset
      SET r.arrivalDate = date(startDate) + duration({ days: randomDaysOffset })
    `);

    await session.run(`
      WITH date("2004-01-01") AS startDate, date("2024-12-31") AS endDate
      MATCH (a:Alumni)
      WITH a, startDate, endDate, duration.inDays(startDate, endDate).days AS totalDays
      WITH a, startDate, toInteger(rand() * totalDays) AS randomDaysOffset
      SET a.arrivalDate = date(startDate) + duration({ days: randomDaysOffset })
    `);

    // Ajout des dates de départ pour les alumni
    await session.run(`
      MATCH (a:Alumni)
      WITH a, a.arrivalDate AS arrivalDate, duration.inDays(arrivalDate, date("2024-12-31")).days AS remainingDays
      WITH a, arrivalDate, toInteger(rand() * remainingDays) AS randomDepartureDays
      SET a.departureDate = arrivalDate + duration({ days: randomDepartureDays })
    `);

    // Ajouter les mots-clés et les propriétés supplémentaires aux chercheurs
    await session.run(`
      WITH ["neuroscience", "cognitive science", "neuroimaging", "brain mapping", "behavioral science", "clinical research", "psychology", "psychiatry", "genetics", "neuropharmacology", "cardiac imaging", "neurometabolism", "child development", "spectroscopy", "preclinical"] AS keywords,
           ["human", "animal"] AS population_types,
           ["child", "adult"] AS age_groups,
           ["healthy", "clinical"] AS health_statuses
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
      SET r.keywords = [keywords[keywordIndex], keywords[(keywordIndex + 1) % size(keywords)], keywords[(keywordIndex + 2) % size(keywords)]],
          r.population_type = population_types[populationIndex],
          r.age_group = CASE WHEN randomValue < 0.5 THEN [age_groups[ageGroupIndex]] ELSE [age_groups[ageGroupIndex], age_groups[(ageGroupIndex + 1) % size(age_groups)]] END,
          r.health_status = CASE WHEN randomValue < 0.5 THEN [health_statuses[healthStatusIndex]] ELSE [health_statuses[healthStatusIndex], health_statuses[(healthStatusIndex + 1) % size(health_statuses)]] END
    `);

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
