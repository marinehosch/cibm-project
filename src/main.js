import L from "leaflet";
import { getInstitutions, getResearchersByInstitution } from "./neo4j.js";
import * as d3 from "d3";

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.51999710099841, 6.569531292590334], 13);
L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenStreetMap</a>',
  }
).addTo(map);

// Création du conteneur SVG pour D3
L.svg().addTo(map);

// Stocker le groupe SVG et la couche des chercheurs
let researcherGroup = null;

// Fonction pour ajouter des marqueurs pour chaque institution
const addMarkers = async () => {
  const institutions = await getInstitutions();
  institutions.forEach((institution) => {
    const marker = L.marker([institution.latitude, institution.longitude])
      .addTo(map)
      .bindPopup(institution.name);

    marker.on("click", async () => {
      try {
        // Effacer les chercheurs précédents
        if (researcherGroup) {
          researcherGroup.remove();
        }
        const researchers = await getResearchersByInstitution(institution.name);
        researcherNetwork(institution, researchers);
      } catch (error) {
        console.error("Erreur lors de la récupération des chercheurs:", error);
      }
    });
  });
};

// Fonction pour dessiner les chercheurs autour d'une institution
const researcherNetwork = (institution, researchers) => {
  // Sélectionner le conteneur SVG de Leaflet
  const overlay = d3.select(map.getPanes().overlayPane).select("svg");
  researcherGroup = overlay.append("g").attr("class", "leaflet-zoom-hide");

  // Calculer la position de l'institution sur la carte
  const instPoint = map.latLngToLayerPoint([
    institution.latitude,
    institution.longitude,
  ]);

  // Créer les nœuds pour les chercheurs
  const radius = 50;
  const angleStep = (2 * Math.PI) / researchers.length;
  const researcherNodes = researchers.map((researcher, index) => ({
    name: researcher.name,
    x: instPoint.x + radius * Math.cos(index * angleStep),
    y: instPoint.y + radius * Math.sin(index * angleStep),
  }));

  // Ajouter les liens (edges) entre l'institution et les chercheurs
  researcherGroup
    .selectAll("line")
    .data(researcherNodes)
    .enter()
    .append("line")
    .attr("x1", instPoint.x)
    .attr("y1", instPoint.y)
    .attr("x2", (d) => d.x)
    .attr("y2", (d) => d.y)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  // Ajouter les cercles et les noms pour les chercheurs
  const nodes = researcherGroup
    .selectAll("g")
    .data(researcherNodes)
    .enter()
    .append("g");

  nodes
    .append("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 5)
    .attr("fill", "blue")
    .attr("opacity", 0.7);

  nodes
    .append("rect")
    .attr("x", (d) => d.x + 8)
    .attr("y", (d) => d.y - 10)
    .attr("width", (d) => d.name.length * 6)
    .attr("height", 14)
    .attr("rx", 5) // Bords arrondis
    .attr("ry", 5) // Bords arrondis
    .attr("fill", "rgba(128, 128, 128, 0.7)");

  nodes
    .append("text")
    .attr("x", (d) => d.x + 12)
    .attr("y", (d) => d.y + 2)
    .text((d) => d.name)
    .attr("class", "researcher-label");

  // Mettre à jour la position des éléments SVG lors du déplacement ou du zoom de la carte
  const update = () => {
    const newInstPoint = map.latLngToLayerPoint([
      institution.latitude,
      institution.longitude,
    ]);

    researcherGroup
      .selectAll("line")
      .attr("x1", newInstPoint.x)
      .attr("y1", newInstPoint.y)
      .attr("x2", (d) => newInstPoint.x + (d.x - instPoint.x))
      .attr("y2", (d) => newInstPoint.y + (d.y - instPoint.y));

    researcherGroup
      .selectAll("circle")
      .attr("cx", (d) => newInstPoint.x + (d.x - instPoint.x))
      .attr("cy", (d) => newInstPoint.y + (d.y - instPoint.y));

    researcherGroup
      .selectAll("rect")
      .attr("x", (d) => newInstPoint.x + (d.x - instPoint.x) + 8)
      .attr("y", (d) => newInstPoint.y + (d.y - instPoint.y) - 10);

    researcherGroup
      .selectAll("text")
      .attr("x", (d) => newInstPoint.x + (d.x - instPoint.x) + 12)
      .attr("y", (d) => newInstPoint.y + (d.y - instPoint.y) + 2);
  };

  map.on("zoomend", update);
  map.on("moveend", update);

  update();
};

// Ajouter les marqueurs sur la carte
addMarkers();
