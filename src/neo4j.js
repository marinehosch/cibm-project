import neo4j from "neo4j-driver";
import Cheerio from "cheerio";
import { parseStringPromise } from "xml2js";
import axios from "axios";

export {
  getResearchers,
  getInstitutions,
  getHtml,
  getInstitutionCoordinates,
  getResearchersByInstitution,
};

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

//requête sur la base de données pour aller chercher les researcher
const getResearchers = async () => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (r:Researcher) RETURN r.name AS name, r.Institution AS institution"
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
    institution: record.get("institution"),
  }));
};

//requête sur la base de données pour aller chercher les institutions
const getInstitutions = async () => {
  const session = driver.session();
  const institutions = await session.run("MATCH (n:Institution) RETURN n");
  session.close();
  return institutions.records.map((record) => record.get(0).properties);
};

//requête pour aller chercher les latitudes et longitudes pour chaque institution
const getInstitutionCoordinates = async () => {
  const session = driver.session();
  const institutions = await session.run(
    "MATCH (n:Institution) RETURN n.name AS name, n.latitude AS latitude, n.longitude AS longitude"
  );
  session.close();
  return institutions.records.map((record) => ({
    name: record.get("name"),
    latitude: parseFloat(record.get("latitude")),
    longitude: parseFloat(record.get("longitude")),
  }));
};

//////////////////////par ID ne marche pas- revoir !
// const getResearcherById = async (id) => {
//   const session = driver.session();
//   const researcher = await session.run(
//     "MATCH (n:Researcher) WHERE id(n) = $id RETURN n",
//     { id: parseInt(id) }
//   );
//   session.close();
//   return researcher.records[0].get(0).properties;
// };
// console.log(getResearcherById(0));

const url = "https://cibm.ch/core-members/";
const getHtml = async () => {
  const { data } = await axios.get(url);
  return data;
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

// Test de la fonction
(async () => {
  try {
    const researchers = await getResearchersByInstitution("EPFL");
    console.log(researchers);
  } catch (error) {
    console.error(error);
  }
})();
