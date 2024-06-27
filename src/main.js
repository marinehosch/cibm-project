import * as d3 from "d3";
import L from "leaflet";
import {
  getInstitutions,
  getResearchers,
  getInstitutionCoordinates,
} from "./neo4j.js";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.51999710099841, 6.569531292590334], 13);
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  }
).addTo(map);

// Ajouter un marker sur la carte pour chaque institution de la base de données
const addMarkers = async () => {
  const institutions = await getInstitutions();
  institutions.forEach((institution) => {
    L.marker([institution.latitude, institution.longitude])
      .addTo(map)
      .bindPopup(institution.name);
  });
};
addMarkers();

// Création du réseau de collaboration entre les chercheurs
const createGraph = async () => {
  try {
    // Récupérer les chercheurs et les coordonnées des institutions depuis Neo4j
    const researchers = await getResearchers();
    const institutions = await getInstitutionCoordinates();

    // Sélectionner l'élément SVG avec l'ID "network"
    const svg = d3.select("#network");

    // Conversion des coordonnées géographiques en coordonnées SVG
    const projectPoint = (lat, lng) => {
      const point = map.latLngToLayerPoint(new L.LatLng(lat, lng));
      return [point.x, point.y];
    };

    // Création des nœuds (chercheurs) sur la carte Leaflet
    svg
      .selectAll("circle")
      .data(researchers)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("fill", "blue")
      .attr("opacity", 0.7)
      .attr("cx", (d) => {
        const institution = institutions.find(
          (inst) => inst.name === d.institution
        );
        if (institution) {
          return projectPoint(institution.latitude, institution.longitude)[0];
        } else {
          return 0; // ou une valeur par défaut appropriée
        }
      })
      .attr("cy", (d) => {
        const institution = institutions.find(
          (inst) => inst.name === d.institution
        );
        if (institution) {
          return projectPoint(institution.latitude, institution.longitude)[1];
        } else {
          return 0; // ou une valeur par défaut appropriée
        }
      })
      .append("title")
      .text((d) => d.name);
  } catch (error) {
    console.error(
      "Erreur lors de la création de la visualisation en réseau:",
      error
    );
  }
};

// Appeler la fonction pour créer la visualisation une fois que la carte est prête
map.on("load", createGraph);
